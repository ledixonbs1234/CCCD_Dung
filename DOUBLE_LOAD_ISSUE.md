# 🔴 VẤN ĐỀ: Page Load 2 Lần

## Luồng thực tế

```
1. chrome.tabs.update(tabId, { url: newUrl })
   → Navigate đến trang tìm kiếm
   → Page LOAD LẦN 1 (status: "complete")
   → ✅ Set flag: waitingForModalTab = tabId
   → ❌ Background trigger lần 1 - KHÔNG CÓ MODAL (vì chưa submit)

2. Đợi page load xong (new Promise)
   → Đợi status === "complete" lần 1

3. executeScript() → checkbox.checked → form.submit()
   → Page RELOAD LẦN 2 (status: "complete")
   → ✅ Background trigger lần 2 - CÓ MODAL (sau khi submit)
   → ❌ Nhưng flag đã bị xóa ở lần 1!
```

## Vấn đề

- **Background fires 2 lần**: Một khi navigate, một khi reload sau submit
- **Flag bị xóa sau lần 1**: Lần 2 không còn flag để detect
- **Modal chỉ có ở lần 2**: Sau khi submit form

## Giải pháp

### Option 1: Set flag SAU KHI executeScript (trước form.submit)

Thay vì set flag khi navigate, set flag **NGAY TRƯỚC form.submit()** trong executeScript

### Option 2: Đếm số lần reload

Lưu counter trong storage: `reloadCount = 0`, chỉ detect khi `reloadCount === 1`

### Option 3: Set flag với timestamp, chỉ detect nếu flag mới (<5s)

### Option 4: KHÔNG XÓA flag ở background, để options page tự xóa

