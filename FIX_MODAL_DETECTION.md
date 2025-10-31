# ✅ Fix: Modal Detection Không Hoạt Động

## 🔴 Vấn đề phát hiện

Sau khi sửa race condition ban đầu, modal detection **HOÀN TOÀN KHÔNG HOẠT ĐỘNG**. 

### Nguyên nhân

#### Vấn đề 1: Page Load 2 Lần
```
Lần 1: chrome.tabs.update(newUrl) 
  → Load trang tìm kiếm
  → status: "complete" 
  → Set flag waitingForModalTab
  → ❌ Background trigger → KHÔNG CÓ MODAL (chưa submit)
  → Background xóa flag

Lần 2: form.submit() 
  → Reload sau submit
  → status: "complete"
  → ❌ Flag đã bị xóa → Background KHÔNG trigger
  → Modal xuất hiện nhưng KHÔNG AI DETECT!
```

#### Vấn đề 2: Background Xóa Flag Quá Sớm
```typescript
// Background - SAI
.then(() => {
  console.log("✓ Injected successfully");
  chrome.storage.session.remove(['waitingForModalTab']); // ❌ Xóa ngay
});

// Script trong tab chạy ASYNC, chưa detect xong đã mất flag!
```

#### Vấn đề 3: Set Flag Trước Submit
```typescript
// SAI - Set flag khi navigate (load lần 1)
await chrome.tabs.update(tabId, { url: newUrl });
await chrome.storage.session.set({ waitingForModalTab: tabId }); // ❌

// Form submit ở lần load thứ 2, nhưng flag đã bị xóa!
```

## ✅ Giải pháp

### 1. Split Form Preparation & Submit

#### Script 1: Check & Prepare (KHÔNG submit)
```typescript
// Chỉ check checkbox và prepare form, KHÔNG submit
const result = await chrome.scripting.executeScript({
  func: () => {
    // Check checkbox...
    // Update form inputs...
    
    // ✅ RETURN nhưng KHÔNG submit
    return { success: true, reason: 'ready_to_submit' };
  }
});
```

#### Options Page: Set Flag
```typescript
if (scriptResult.success) {
  // ✅ Set flag NGAY BÂY GIỜ
  await chrome.storage.session.set({ waitingForModalTab: tabId });
  
  // Đợi 100ms để ensure flag committed
  await new Promise(resolve => setTimeout(resolve, 100));
  
  // ... proceed to submit
}
```

#### Script 2: Submit Form
```typescript
// ✅ BÂY GIỜ mới submit (flag đã được set)
await chrome.scripting.executeScript({
  func: () => {
    const form = document.getElementById('xacNhan-form');
    if (form) {
      form.submit(); // ← Tab sẽ reload
      return true;
    }
  }
});
```

### 2. Background Xóa Flag Đúng Chỗ

```typescript
// ❌ SAI - Xóa ngay sau inject
.then(() => {
  chrome.storage.session.remove(['waitingForModalTab']);
});

// ✅ ĐÚNG - Xóa SAU KHI detect xong và lưu kết quả
waitForElm("#flash-overlay-modal").then((elm) => {
  chrome.storage.session.set({
    modalDetectionResult: { success: !!elm }
  }).then(() => {
    // ✅ Xóa flag SAU KHI đã lưu kết quả
    chrome.storage.session.remove(['waitingForModalTab']);
  });
});
```

### 3. Không Set Flag Khi Navigate

```typescript
// ❌ SAI
await chrome.tabs.update(tabId, { url: newUrl });
await chrome.storage.session.set({ waitingForModalTab: tabId }); // Trigger quá sớm

// ✅ ĐÚNG - Chỉ set flag TRƯỚC form.submit()
await chrome.tabs.update(tabId, { url: newUrl });
// ... đợi load ...
// ... check form ...
await chrome.storage.session.set({ waitingForModalTab: tabId }); // Set ngay trước submit
// ... submit form ...
```

## 📊 Luồng Mới (Đúng)

```
1. chrome.tabs.update(newUrl)
   → Navigate đến trang tìm kiếm
   → Load xong (lần 1)
   → ❌ KHÔNG set flag

2. executeScript #1 - Check & Prepare
   → Check checkbox
   → Update form inputs
   → ✅ Return "ready_to_submit" (KHÔNG submit)

3. Options Page
   → Nhận result: ready_to_submit
   → ✅ Set flag: waitingForModalTab = tabId
   → Đợi 100ms

4. executeScript #2 - Submit Form
   → form.submit()
   → ✅ Tab reload (lần 2)

5. Background tabs.onUpdated
   → Detect reload (status: "complete")
   → ✅ Tìm thấy flag!
   → Inject modal detector

6. Modal Detector Script
   → waitForElm("#flash-overlay-modal")
   → ✅ Modal xuất hiện!
   → Lưu result vào storage
   → ✅ Xóa flag SAU KHI lưu xong

7. Options Page Polling
   → Đọc modalDetectionResult từ storage
   → ✅ Nhận kết quả!
   → Continue workflow...
```

## 🎯 Key Changes

### popup.tsx

1. **Script #1**: Return `ready_to_submit` thay vì `submitted`
2. **Set flag**: NGAY SAU KHI nhận `ready_to_submit`
3. **Script #2**: Submit form SAU KHI set flag
4. **Đợi 100ms**: Ensure flag committed trước submit

### background.ts

1. **KHÔNG xóa flag** ngay sau inject
2. **Xóa flag** SAU KHI lưu modalDetectionResult
3. **Xóa flag** trong cả 2 trường hợp: success VÀ timeout

## 🧪 Testing

```bash
npm run dev
```

### Expected Console Logs

```
[Options] ✅ Form ready to submit, setting flag NOW...
[Options] ✓ Session flag set for tabId: 123
[Options] 📤 Submitting form NOW...
[Options] ✓ Form submitted, waiting for modal detection...
[Background] ✅ Background: Tab reloaded completely, injecting modal detector...
[Tab] 🔍 Starting modal detection...
[Tab] ✅ Modal "#flash-overlay-modal" xuất hiện sau khi chờ!
[Tab] ✅ MODAL DETECTED! Saving result to storage...
[Tab] ✅ Saved modal result to storage
[Options] 🔍 Polling for modal result...
[Options] ✅ Got modal result from storage: { success: true }
```

## ✅ Result

- ✅ Flag chỉ được set **1 LẦN** - trước submit
- ✅ Background chỉ trigger **1 LẦN** - sau submit (lần reload thứ 2)
- ✅ Modal được detect **ĐÚNG LÚC** - khi nó xuất hiện
- ✅ Flag được cleanup **ĐÚNG CÁCH** - sau khi lưu result
- ✅ Options page nhận được kết quả qua polling

## 📝 Files Changed

- `src/popup/popup.tsx` - 2-phase submit logic
- `src/background/background.ts` - Cleanup flag sau khi detect
- `FIX_MODAL_DETECTION.md` - This doc
