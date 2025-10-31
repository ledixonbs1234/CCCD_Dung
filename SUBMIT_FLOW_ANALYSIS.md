# 🔍 Phân tích luồng Submit - Phát hiện lỗi Communication

## ❌ Vấn đề hiện tại

### Kiến trúc thực tế (từ manifest.json)
```json
{
  "options_page": "popup.html",  // ← popup.tsx là OPTIONS PAGE
  "background": {
    "service_worker": "background.js"
  }
}
```

### Luồng hiện tại (BỊ LỖI)
```
Options Page (popup.tsx)
  ↓ Submit form
  ↓ Set session flag: waitingForModalTab
  ↓ Tab reload
  ↓
Background Service Worker (tabs.onUpdated)
  ↓ Detect reload complete
  ↓ Inject modal detector script
  ↓
Modal Detector Script
  ↓ waitForElm("#flash-overlay-modal")
  ↓ chrome.runtime.sendMessage({ action: "modalDetected" })
  ↓
❌ Options Page (popup.tsx) - Listener KHÔNG HOẠT ĐỘNG
  ↓ chrome.runtime.onMessage.addListener()
  ↓ await new Promise<boolean>() ← NEVER RESOLVES
  ↓ Timeout sau 7 giây
```

## 🔴 Nguyên nhân lỗi

### 1. Options Page không phải persistent context
- **Options page** chỉ mở khi user click vào settings
- Khi submit form → tab reload → options page **có thể đã đóng**
- Listener `chrome.runtime.onMessage` trong options page **bị hủy**

### 2. Message bị mất
```typescript
// Background chỉ forward message, không lưu trữ
chrome.runtime.onMessage.addListener((message) => {
  if (message.action === "modalDetected") {
    console.log("Background received:", message);
    // ❌ Không ai nhận message này nếu options page đóng
  }
});
```

### 3. Promise không bao giờ resolve
```typescript
// Trong popup.tsx
const modalDetected = await new Promise<boolean>((resolveModal) => {
  const messageListener = (message: any) => {
    if (message.action === "modalDetected") {
      resolveModal(message.success === true); // ❌ Không chạy
    }
  };
  
  // Listener này sẽ bị remove khi options page đóng
  chrome.runtime.onMessage.addListener(messageListener);
  
  setTimeout(() => {
    resolveModal(false); // Chỉ timeout mới chạy
  }, 7000);
});
```

## ✅ Giải pháp

### Phương án 1: Lưu kết quả vào Chrome Storage (KHUYÊN DÙNG)

**Ưu điểm:**
- Persistent across page reloads
- Options page có thể đọc kết quả bất cứ lúc nào
- Đơn giản, ít phức tạp

**Cách thực hiện:**

#### Background Service Worker
```typescript
chrome.tabs.onUpdated.addListener((updatedTabId, info, _tab) => {
  if (info.status === "complete") {
    chrome.storage.session.get(['waitingForModalTab']).then(({ waitingForModalTab }) => {
      if (waitingForModalTab === updatedTabId) {
        console.log("✅ Injecting modal detector...");
        
        chrome.scripting.executeScript({
          target: { tabId: updatedTabId },
          func: () => {
            function waitForElm(selector: string, timeout = 10000) {
              return new Promise((resolve) => {
                const element = document.querySelector(selector);
                if (element) return resolve(element);

                const observer = new MutationObserver(() => {
                  const element = document.querySelector(selector);
                  if (element) {
                    observer.disconnect();
                    resolve(element);
                  }
                });

                observer.observe(document.body, {
                  childList: true,
                  subtree: true,
                });

                setTimeout(() => {
                  observer.disconnect();
                  resolve(null);
                }, timeout);
              });
            }

            waitForElm("#flash-overlay-modal").then((elm) => {
              // Gửi kết quả về background
              chrome.runtime.sendMessage({
                action: "modalDetected",
                success: !!elm,
                reason: elm ? "found" : "timeout"
              });
            });
          }
        });
      }
    });
  }
});

// Nhận kết quả và LƯU VÀO STORAGE
chrome.runtime.onMessage.addListener((message, _sender, _sendResponse) => {
  if (message.action === "modalDetected") {
    console.log("📨 Modal detection result:", message);
    
    // LƯU KẾT QUẢ VÀO STORAGE
    chrome.storage.session.set({
      modalDetectionResult: {
        success: message.success,
        reason: message.reason,
        timestamp: Date.now()
      }
    }).then(() => {
      console.log("✅ Saved modal result to storage");
      
      // Xóa waiting flag
      chrome.storage.session.remove(['waitingForModalTab']);
    });
  }
});
```

#### Options Page (popup.tsx)
```typescript
const handleGetDataFromPNS = async () => {
  // ... submit logic ...
  
  if (scriptResult.success) {
    console.log("✅ Form will be submitted");
    
    // Set flag
    await chrome.storage.session.set({ waitingForModalTab: tabId });
    
    // XÓA kết quả cũ
    await chrome.storage.session.remove(['modalDetectionResult']);
    
    // POLLING storage thay vì wait message
    const modalDetected = await waitForModalResult();
    
    if (modalDetected) {
      // Success handling
    }
  }
};

// Hàm polling storage
async function waitForModalResult(timeout = 7000): Promise<boolean> {
  const startTime = Date.now();
  
  while (Date.now() - startTime < timeout) {
    const result = await chrome.storage.session.get(['modalDetectionResult']);
    
    if (result.modalDetectionResult) {
      console.log("✅ Got modal result from storage:", result.modalDetectionResult);
      return result.modalDetectionResult.success === true;
    }
    
    // Đợi 200ms trước khi check lại
    await new Promise(resolve => setTimeout(resolve, 200));
  }
  
  console.warn("⚠️ Timeout waiting for modal result");
  return false;
}
```

### Phương án 2: Background làm coordinator

**Ưu điểm:**
- Background service worker luôn active
- Xử lý message reliable

**Nhược điểm:**
- Phức tạp hơn
- Cần thêm message protocol

**Cách thực hiện:**

#### Background
```typescript
let modalWaitingQueue = new Map<number, (result: boolean) => void>();

chrome.tabs.onUpdated.addListener((updatedTabId, info) => {
  if (info.status === "complete") {
    chrome.storage.session.get(['waitingForModalTab']).then(({ waitingForModalTab }) => {
      if (waitingForModalTab === updatedTabId) {
        // Inject modal detector
        chrome.scripting.executeScript({...});
      }
    });
  }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // Nhận kết quả từ modal detector
  if (message.action === "modalDetected") {
    const tabId = sender.tab?.id;
    if (tabId) {
      // Lưu kết quả
      chrome.storage.session.set({
        [`modalResult_${tabId}`]: {
          success: message.success,
          timestamp: Date.now()
        }
      });
      
      // Notify options page nếu đang lắng nghe
      chrome.runtime.sendMessage({
        action: "modalResultReady",
        tabId: tabId,
        success: message.success
      });
    }
  }
  
  // Options page request kết quả
  if (message.action === "getModalResult") {
    const tabId = message.tabId;
    chrome.storage.session.get([`modalResult_${tabId}`]).then(result => {
      sendResponse(result[`modalResult_${tabId}`] || null);
    });
    return true; // async response
  }
});
```

#### Options Page
```typescript
// Polling background cho kết quả
async function waitForModalResult(tabId: number, timeout = 7000): Promise<boolean> {
  const startTime = Date.now();
  
  while (Date.now() - startTime < timeout) {
    const result = await chrome.runtime.sendMessage({
      action: "getModalResult",
      tabId: tabId
    });
    
    if (result) {
      return result.success === true;
    }
    
    await new Promise(resolve => setTimeout(resolve, 200));
  }
  
  return false;
}
```

## 🎯 So sánh các phương án

| Tiêu chí | Phương án 1 (Storage) | Phương án 2 (Background) |
|----------|----------------------|-------------------------|
| Độ phức tạp | ⭐⭐ Đơn giản | ⭐⭐⭐⭐ Phức tạp |
| Reliability | ⭐⭐⭐⭐⭐ Cao | ⭐⭐⭐⭐ Cao |
| Performance | ⭐⭐⭐⭐ Polling overhead | ⭐⭐⭐⭐ Messaging overhead |
| Debug | ⭐⭐⭐⭐⭐ Dễ (xem storage) | ⭐⭐⭐ Khó hơn |
| Khuyên dùng | ✅ **KHUYÊN DÙNG** | Nếu cần real-time |

## 📝 Tóm tắt

1. **Lỗi hiện tại**: Options page đóng → listener mất → message bị bỏ
2. **Giải pháp tốt nhất**: Lưu kết quả vào `chrome.storage.session`, options page polling
3. **Implement**: Sửa background.ts và popup.tsx theo Phương án 1
