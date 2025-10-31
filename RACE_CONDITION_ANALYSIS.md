# 🏁 RACE CONDITION: Submit vs Session Storage

## 🔴 VẤN ĐỀ THỰC SỰ - Bạn phát hiện chính xác!

### Timeline thực tế (RACE CONDITION)

```
T0: executeScript() bắt đầu
    ↓
T1: Script trong tab chạy:
    - checkbox.checked = true
    - form.submit() ← GỌI NGAY LẬP TỨC
    ↓
T2: Browser bắt đầu navigation (reload trang)
    ↓
T3: Script return result { success: true }
    ↓
T4: Options page nhận result
    ↓
T5: await chrome.storage.session.set() ← QUÁ MUỘN!
    ↓
T6: Background tabs.onUpdated fires (status: "complete")
    - Đọc chrome.storage.session.get(['waitingForModalTab'])
    - ❌ Giá trị CHƯA CÓ vì T5 chưa chạy hoặc đang chạy!
```

### Code hiện tại (BỊ LỖI)

```typescript
// popup.tsx - Line ~437
const form = document.getElementById('xacNhan-form') as HTMLFormElement;
if (form) {
  console.log("📤 Submitting form (flag already set by popup)...");
  form.submit(); // ← SUBMIT NGAY - TAB BẮT ĐẦU RELOAD
  
  console.log("✓ Form submitted - page will reload");
  resolve({
    success: true,
    reason: 'submitted'
  });
}

// popup.tsx - Line ~479
if (scriptResult.success) {
  console.log("✅ Form will be submitted, setting session flag...");
  
  // ❌ Đặt flag SAU KHI form.submit() đã chạy!
  await chrome.storage.session.set({ waitingForModalTab: tabId });
  console.log(`✓ Session flag set for tabId: ${tabId}`);
  
  // Background có thể đã kiểm tra và KHÔNG thấy flag này!
```

### Vì sao race condition xảy ra?

1. **form.submit() là synchronous nhưng trigger async navigation**
   - Ngay sau `form.submit()`, browser bắt đầu navigate
   - Script vẫn chạy tiếp và return result
   
2. **Navigation rất nhanh (especially cached pages)**
   - Tab có thể reload xong trong **50-100ms**
   - `chrome.storage.session.set()` cần **vài chục ms** để complete
   
3. **Background listener fires ngay khi status = "complete"**
   ```typescript
   chrome.tabs.onUpdated.addListener((updatedTabId, info) => {
     if (info.status === "complete") { // ← Fires ngay khi page load xong
       chrome.storage.session.get(['waitingForModalTab']).then(({waitingForModalTab}) => {
         // ❌ Giá trị có thể chưa được set!
         if (waitingForModalTab === updatedTabId) { ... }
       });
     }
   });
   ```

## ✅ GIẢI PHÁP CHÍNH XÁC

### Nguyên tắc: **SET FLAG TRƯỚC KHI SUBMIT**

```typescript
// ĐÚNG: Set flag TRƯỚC khi script chạy
await chrome.storage.session.set({ waitingForModalTab: tabId });
console.log(`✓ Session flag set BEFORE script execution`);

// Sau đó mới execute script để submit form
const result = await chrome.scripting.executeScript({
  target: { tabId },
  func: () => {
    // ... checkbox logic ...
    form.submit(); // ← Lúc này flag đã sẵn sàng
  }
});
```

## 🛠️ Implementation chi tiết

### Option 1: Set flag trước khi executeScript (KHUYÊN DÙNG)

```typescript
const sendMessageToCurrentTab = async (data: any) => {
  try {
    const tabs = await chrome.tabs.query({});
    const targetTab = tabs.find(tab =>
      tab.url && tab.url.startsWith("https://hanhchinhcong.vnpost.vn/giaodich/xac-nhan-all")
    );

    if (!targetTab || !targetTab.id) {
      showNotification("Không tìm thấy trang CCCD VNPost đang mở");
      return;
    }

    const tabId = targetTab.id;

    // Build URL...
    const newUrl = `https://hanhchinhcong.vnpost.vn/giaodich/xac-nhan-all?...`;

    // Update tab URL
    await chrome.tabs.update(tabId, { url: newUrl });

    // ✅ BẮT ĐẦU: SET FLAG NGAY SAU KHI NAVIGATE (trước khi page load)
    await chrome.storage.session.set({ 
      waitingForModalTab: tabId,
      setAt: Date.now()
    });
    console.log(`✓ Session flag set BEFORE page loads for tabId: ${tabId}`);

    // Đợi page load
    await new Promise<void>((resolve) => {
      const listener = (updatedTabId: number, changeInfo: chrome.tabs.TabChangeInfo) => {
        if (updatedTabId === tabId && changeInfo.status === 'complete') {
          chrome.tabs.onUpdated.removeListener(listener);
          resolve();
        }
      };
      chrome.tabs.onUpdated.addListener(listener);
      setTimeout(() => {
        chrome.tabs.onUpdated.removeListener(listener);
        resolve();
      }, 10000);
    });

    console.log("Page loaded, executing automation script...");

    // Execute script để check + submit
    const result = await chrome.scripting.executeScript({
      target: { tabId },
      func: (): Promise<AutomationResult> => {
        return new Promise((resolve) => {
          // ... existing automation logic ...
          // form.submit() ← Flag đã được set từ trước
        });
      }
    });

    const scriptResult = result[0]?.result;

    if (scriptResult?.success) {
      console.log("✅ Form submitted, flag was already set, waiting for modal...");
      
      // ❌ KHÔNG CẦN set flag nữa vì đã set từ trước
      // await chrome.storage.session.set({ waitingForModalTab: tabId });
      
      // Đợi modal detection result
      const modalDetected = await waitForModalResult(tabId);
      
      if (modalDetected) {
        // Success handling...
      }
    }
  } catch (error) {
    console.error("Error:", error);
  }
};

// Hàm polling storage
async function waitForModalResult(tabId: number, timeout = 7000): Promise<boolean> {
  const startTime = Date.now();
  
  while (Date.now() - startTime < timeout) {
    const result = await chrome.storage.session.get(['modalDetectionResult']);
    
    if (result.modalDetectionResult) {
      console.log("✅ Got modal result:", result.modalDetectionResult);
      
      // Cleanup
      await chrome.storage.session.remove(['modalDetectionResult', 'waitingForModalTab']);
      
      return result.modalDetectionResult.success === true;
    }
    
    await new Promise(resolve => setTimeout(resolve, 200));
  }
  
  console.warn("⚠️ Timeout waiting for modal");
  await chrome.storage.session.remove(['waitingForModalTab']);
  return false;
}
```

### Option 2: Set flag TRONG script, trước form.submit()

```typescript
// Execute script với TWO-PHASE approach
const result = await chrome.scripting.executeScript({
  target: { tabId },
  func: async (): Promise<AutomationResult> => {
    // PHASE 1: Set flag TRƯỚC
    await chrome.storage.session.set({ 
      waitingForModalTab: chrome.devtools?.inspectedWindow?.tabId || 0 
    });
    
    // PHASE 2: Submit form
    const form = document.getElementById('xacNhan-form') as HTMLFormElement;
    if (form) {
      form.submit(); // ← Flag đã được set
    }
    
    return { success: true, reason: 'submitted' };
  }
});
```

**❌ Vấn đề:** Không lấy được `tabId` trong injected script context

### Option 3: Truyền tabId vào script (RECOMMENDED)

```typescript
const result = await chrome.scripting.executeScript({
  target: { tabId },
  func: (currentTabId: number): Promise<AutomationResult> => {
    return new Promise((resolve) => {
      (async () => {
        // ... checkbox logic ...
        
        // ✅ Set flag NGAY TRƯỚC khi submit
        await chrome.storage.session.set({ 
          waitingForModalTab: currentTabId 
        });
        console.log(`✓ Flag set inside script for tab ${currentTabId}`);
        
        // Đợi một chút để ensure storage committed
        await new Promise(r => setTimeout(r, 50));
        
        // Submit form
        const form = document.getElementById('xacNhan-form') as HTMLFormElement;
        if (form) {
          form.submit();
          resolve({ success: true, reason: 'submitted' });
        }
      })();
    });
  },
  args: [tabId] // ← Truyền tabId vào
});
```

## 📊 So sánh các giải pháp

| Giải pháp | Timing | Reliability | Complexity |
|-----------|--------|-------------|------------|
| Set flag trước executeScript | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ Đơn giản nhất |
| Set flag trong script | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐ Phức tạp hơn |
| Set flag sau result | ❌ | ❌ | Race condition |

## 🎯 KẾT LUẬN

Bạn phát hiện chính xác! Vấn đề là:

1. ✅ **Options page không đóng** - bạn đúng
2. ✅ **Race condition giữa submit và storage.set()** - bạn đúng
3. ✅ **Background kiểm tra quá nhanh, chưa có flag** - bạn đúng

### Giải pháp tốt nhất:

**Set flag NGAY SAU chrome.tabs.update(), TRƯỚC KHI page load xong**

Điều này đảm bảo:
- Flag đã sẵn sàng trước khi tab reload
- Background listener luôn thấy flag
- Không có race condition
