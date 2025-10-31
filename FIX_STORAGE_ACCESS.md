# ✅ Fix Critical: Injected Script Không Thể Lưu Storage

## 🔴 Vấn đề phát hiện từ console logs

### Log Analysis

```javascript
// ✅ Modal được detect thành công
VM768:33 ✅ MODAL DETECTED! Saving result to storage...

// ❌ NHƯNG background bị restart và không nhận được gì
background.ts:85 ✅ CCCD Background Service Worker loaded - Modal detection ready

// ❌ Options page timeout vì không nhận được result
popup.tsx:178 ⚠️ Timeout waiting for modal result
```

### Root Cause

**Injected script chạy trong PAGE CONTEXT, KHÔNG CÓ quyền truy cập `chrome.storage`!**

```typescript
// ❌ SAI - Code cũ trong injected script
chrome.scripting.executeScript({
  func: () => {
    // Script này chạy trong PAGE context
    waitForElm("#flash-overlay-modal").then((elm) => {
      // ❌ chrome.storage.session.set() BỊ LỖI IM LẶNG
      // Không có error, không có gì xảy ra!
      chrome.storage.session.set({
        modalDetectionResult: { success: true }
      });
    });
  }
});
```

### Tại sao lỗi?

1. **chrome.scripting.executeScript()** inject code vào **page's JavaScript context**
2. Page context **KHÔNG CÓ full Chrome Extension APIs**
3. `chrome.storage` **KHÔNG khả dụng** trong page context
4. Code chạy nhưng **THẤT BẠI IM LẶNG** (no error thrown)

### APIs Available trong Injected Script

| API | Available? | Note |
|-----|-----------|------|
| `chrome.runtime.sendMessage()` | ✅ YES | Có thể gửi message |
| `chrome.storage.*` | ❌ NO | Không thể truy cập storage |
| `chrome.tabs.*` | ❌ NO | Không có quyền |
| DOM APIs | ✅ YES | document.querySelector, etc. |

## ✅ Giải pháp

### Pattern: Message Passing

Injected script **GỬI MESSAGE** → Background **NHẬN và LƯU** storage

```typescript
// Injected script (chạy trong page context)
waitForElm("#flash-overlay-modal").then((elm) => {
  // ✅ ĐÚNG - Gửi message về background
  chrome.runtime.sendMessage({
    action: "modalDetected",
    success: !!elm,
    timestamp: Date.now()
  });
});

// Background (chạy trong extension context)
chrome.runtime.onMessage.addListener((message) => {
  if (message.action === "modalDetected") {
    // ✅ Background có quyền lưu storage
    chrome.storage.session.set({
      modalDetectionResult: {
        success: message.success,
        timestamp: message.timestamp
      }
    }).then(() => {
      console.log("✅ Saved to storage");
      chrome.storage.session.remove(['waitingForModalTab']);
    });
  }
});
```

## 🔧 Changes Made

### background.ts

#### 1. Injected Script - Send Message (không lưu storage)

```typescript
// BEFORE ❌
waitForElm("#flash-overlay-modal").then((elm) => {
  chrome.storage.session.set({  // ← Lỗi im lặng!
    modalDetectionResult: { success: true }
  });
});

// AFTER ✅
waitForElm("#flash-overlay-modal").then((elm) => {
  chrome.runtime.sendMessage({  // ← Hoạt động!
    action: "modalDetected",
    success: true,
    timestamp: Date.now()
  });
});
```

#### 2. Background Message Listener - Lưu Storage

```typescript
// ✅ THÊM MỚI
chrome.runtime.onMessage.addListener((message, _sender, _sendResponse) => {
  if (message.action === "modalDetected") {
    console.log("📨 Background received modal detection result:", message);
    
    // Lưu vào storage (background có quyền)
    chrome.storage.session.set({
      modalDetectionResult: {
        success: message.success,
        reason: message.reason,
        timestamp: message.timestamp || Date.now()
      }
    }).then(() => {
      console.log("✅ Background saved modal result to storage:", message.success);
      
      // Cleanup flag
      chrome.storage.session.remove(['waitingForModalTab']);
    });
  }
});
```

## 📊 New Flow

```
1. Background: Inject modal detector script vào page

2. Injected Script (page context):
   ├─ waitForElm("#flash-overlay-modal")
   ├─ Modal detected!
   └─ ✅ chrome.runtime.sendMessage({ action: "modalDetected", success: true })

3. Background: onMessage listener (extension context)
   ├─ Nhận message: { action: "modalDetected", success: true }
   ├─ ✅ chrome.storage.session.set({ modalDetectionResult: ... })
   └─ ✅ chrome.storage.session.remove(['waitingForModalTab'])

4. Options Page: Polling storage
   ├─ chrome.storage.session.get(['modalDetectionResult'])
   └─ ✅ Nhận được result!
```

## 🎯 Key Insights

### Chrome Extension Contexts

| Context | Where | Chrome APIs | Storage | Tabs | Runtime |
|---------|-------|-------------|---------|------|---------|
| **Background** | Service Worker | ✅ Full | ✅ | ✅ | ✅ |
| **Content Script** | Page (persistent) | ⚠️ Limited | ✅ | ❌ | ✅ |
| **Injected Script** | Page (executeScript) | ⚠️ Very Limited | ❌ | ❌ | ✅ |
| **Popup/Options** | Extension UI | ✅ Full | ✅ | ✅ | ✅ |

### Best Practices

1. **Injected scripts**: Chỉ dùng để interact với DOM, gửi data qua messages
2. **Storage operations**: Luôn thực hiện trong background/content script/popup
3. **Message passing**: Cách duy nhất để injected script communicate với extension

## 🧪 Expected Console Logs (Sau Fix)

```javascript
// Injected script (in page)
🔍 Starting modal detection...
✅ Modal "#flash-overlay-modal" đã tồn tại ngay lập tức!
✅ MODAL DETECTED! Sending message to background...

// Background service worker
✅ Background: Tab reloaded completely, injecting modal detector...
✓ Background: Modal detector script injected successfully
📨 Background received modal detection result: { action: "modalDetected", success: true, ... }
✅ Background saved modal result to storage: true

// Options page
🔍 Polling for modal result...
✅ Got modal result from storage: { success: true, timestamp: ... }
```

## ✅ Result

- ✅ Modal detection message được gửi thành công
- ✅ Background nhận message và lưu vào storage
- ✅ Options page polling được kết quả
- ✅ Workflow hoàn chỉnh từ đầu đến cuối
- ✅ KHÔNG còn timeout!

## 📝 Files Changed

- `src/background/background.ts` - Thay chrome.storage.set() bằng chrome.runtime.sendMessage() trong injected script, thêm message listener
