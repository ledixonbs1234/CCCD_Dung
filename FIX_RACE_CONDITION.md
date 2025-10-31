# ✅ Đã Fix Race Condition - Submit Form

## 🎯 Vấn đề đã được giải quyết

Bạn phát hiện chính xác: **Race condition giữa form.submit() và chrome.storage.session.set()**

### ❌ Luồng CŨ (Bị lỗi)

```
1. executeScript() → form.submit() → Tab bắt đầu reload
2. Script return { success: true }
3. Options page: await chrome.storage.session.set() ← QUÁ MUỘN!
4. Background tabs.onUpdated fires → Đọc storage
5. ❌ Không tìm thấy flag vì chưa được set!
```

### ✅ Luồng MỚI (Đã fix)

```
1. chrome.tabs.update(newUrl) → Navigate
2. ✅ chrome.storage.session.set({ waitingForModalTab: tabId }) ← SET NGAY
3. Đợi page load xong (status: "complete")
4. executeScript() → form.submit() → Tab reload lần 2
5. Background tabs.onUpdated fires → Đọc storage
6. ✅ Tìm thấy flag → Inject modal detector
7. Modal detector → Lưu kết quả vào storage.session
8. Options page polling storage → Nhận kết quả
```

## 🔧 Các thay đổi

### 1. **popup.tsx** - Options Page

#### Thêm hàm polling storage (Line ~193)
```typescript
const waitForModalResult = async (timeout = 7000): Promise<boolean> => {
  const startTime = Date.now();
  
  console.log(`🔍 Polling for modal result...`);
  
  while (Date.now() - startTime < timeout) {
    const result = await chrome.storage.session.get(['modalDetectionResult']);
    
    if (result.modalDetectionResult) {
      console.log("✅ Got modal result from storage:", result.modalDetectionResult);
      
      // Cleanup storage
      await chrome.storage.session.remove(['modalDetectionResult', 'waitingForModalTab']);
      
      return result.modalDetectionResult.success === true;
    }
    
    // Đợi 200ms trước khi check lại
    await new Promise(resolve => setTimeout(resolve, 200));
  }
  
  console.warn("⚠️ Timeout waiting for modal result");
  await chrome.storage.session.remove(['waitingForModalTab']);
  
  return false;
};
```

#### Set flag TRƯỚC khi page load (Line ~256)
```typescript
// Update URL
await chrome.tabs.update(tabId, { url: newUrl });

// ✅ FIX: Set flag NGAY LẬP TỨC
await chrome.storage.session.set({ 
  waitingForModalTab: tabId,
  setAt: Date.now()
});
console.log(`✓ Session flag set BEFORE page loads`);

// Đợi page load...
```

#### Sử dụng polling thay vì message listener (Line ~513)
```typescript
if (scriptResult.success) {
  console.log("✅ Form submitted, flag was already set...");
  
  // ✅ Flag đã được set từ trước, không cần set lại
  
  // Polling storage thay vì đợi message
  const modalDetected = await waitForModalResult();
  
  if (modalDetected) {
    // Success handling...
  }
}
```

### 2. **background.ts** - Service Worker

#### Lưu kết quả vào storage thay vì send message
```typescript
waitForElm("#flash-overlay-modal").then((elm) => {
  if (elm) {
    console.log("✅ MODAL DETECTED! Saving result to storage...");
    chrome.storage.session.set({
      modalDetectionResult: {
        success: true,
        timestamp: Date.now()
      }
    }).then(() => {
      console.log("✅ Saved modal result to storage");
    });
  } else {
    console.log("❌ Modal not found within timeout");
    chrome.storage.session.set({
      modalDetectionResult: {
        success: false,
        reason: "timeout",
        timestamp: Date.now()
      }
    });
  }
});
```

#### Cleanup flag đúng cách
```typescript
.then(() => {
  console.log("✓ Background: Modal detector injected");
  
  // ✅ Xóa flag SAU KHI inject thành công
  chrome.storage.session.remove(['waitingForModalTab']);
}).catch(err => {
  console.error("❌ Failed to inject:", err);
  
  // Cleanup flag trên lỗi
  chrome.storage.session.remove(['waitingForModalTab']);
});
```

## 🎉 Kết quả

### Ưu điểm của giải pháp mới

1. **✅ Không có race condition**
   - Flag được set TRƯỚC khi tab reload
   - Background luôn tìm thấy flag

2. **✅ Reliable communication**
   - Sử dụng storage thay vì runtime messages
   - Storage persistent ngay cả khi page đóng/mở

3. **✅ Better error handling**
   - Cleanup flag khi có lỗi
   - Timeout rõ ràng (7 giây)

4. **✅ Easy debugging**
   - Xem được storage values trong DevTools
   - Console logs rõ ràng từng bước

## 🧪 Testing

### Cách test

1. **Build extension:**
   ```bash
   npm run dev
   ```

2. **Load extension vào Chrome**

3. **Mở options page**, click "Chạy"

4. **Kiểm tra console logs:**
   - Options page: `✓ Session flag set BEFORE page loads`
   - Background: `✅ Background: Tab reloaded completely`
   - Background: `✅ MODAL DETECTED! Saving result to storage`
   - Options page: `✅ Got modal result from storage`

5. **Kiểm tra Chrome Storage:**
   - Trong DevTools → Application → Storage → Session Storage
   - Nên thấy `waitingForModalTab` được set ngay khi navigate
   - Sau đó thấy `modalDetectionResult` khi modal xuất hiện

### Expected behavior

- ✅ Flag được set TRƯỚC khi page load
- ✅ Background detect tab reload và inject script
- ✅ Modal được phát hiện và kết quả lưu vào storage
- ✅ Options page nhận kết quả qua polling
- ✅ Không có timeout (trừ khi modal thực sự không xuất hiện)

## 📝 Notes

- **Polling interval**: 200ms (có thể điều chỉnh nếu cần)
- **Timeout**: 7 giây (có thể tăng nếu modal xuất hiện chậm)
- **Cleanup**: Storage được cleanup tự động sau khi nhận kết quả hoặc timeout

## 🔗 Related Files

- `src/popup/popup.tsx` - Options page logic
- `src/background/background.ts` - Service worker
- `RACE_CONDITION_ANALYSIS.md` - Chi tiết phân tích vấn đề
