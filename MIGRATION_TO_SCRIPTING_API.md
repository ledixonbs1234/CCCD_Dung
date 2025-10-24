# Migration to Chrome Scripting API

## Tổng quan thay đổi

Dự án đã được refactor để chuyển toàn bộ logic automation từ Content Script sang Popup/Options page sử dụng Chrome Scripting API (`chrome.scripting.executeScript`). Điều này giúp:

1. ✅ **Quản lý luồng dễ dàng hơn**: Tất cả logic điều khiển tập trung tại popup.tsx
2. ✅ **Tránh vấn đề page refresh**: Không còn bị mất state khi trang reload
3. ✅ **Promise-based flow**: Sử dụng async/await thay vì message passing phức tạp
4. ✅ **Dễ debug**: Console logs tập trung, dễ theo dõi
5. ✅ **Tách biệt concerns**: Content script chỉ monitor, popup thực thi automation

## Kiến trúc mới

### Before (Old Architecture)
```
popup.tsx (sendMessageToCurrentTab)
    ↓ (chrome.tabs.update URL)
Target Page
    ↓ (auto load)
contentScript.tsx (window.onload)
    ↓ (tự động check & click)
    ↓ (page refresh khi submit)
❌ Mất state, khó quản lý
```

### After (New Architecture)  
```
popup.tsx (sendMessageToCurrentTab)
    ↓ (chrome.tabs.update URL)
    ↓ (wait for page load)
    ↓ (chrome.scripting.executeScript)
Target Page Context
    ↓ (inline function execution)
    ↓ (check checkbox + click submit)
    ↓ (return result)
popup.tsx (handle result)
    ↓ (update Firebase based on result)
✅ Full control, trackable state
```

## Chi tiết thay đổi

### 1. `popup.tsx` - Chức năng mới

#### Hàm `sendMessageToCurrentTab` được refactor hoàn toàn:

**Trước:**
- Chỉ update URL và để content script tự xử lý
- Không biết kết quả thực thi

**Sau:**
- Update URL và **chờ page load** qua `chrome.tabs.onUpdated`
- **Thực thi automation script** qua `chrome.scripting.executeScript`
- **Nhận kết quả** và xử lý tương ứng:
  - `success: true` → Gửi message "continueCCCD" về Firebase
  - `reason: 'not_found'` → Gửi message "notFound" về Firebase
  - Các trường hợp khác → Hiển thị notification lỗi

#### Automation logic inline trong `executeScript`:

```typescript
chrome.scripting.executeScript({
  target: { tabId },
  func: (): Promise<AutomationResult> => {
    // Code chạy TRONG page context
    // - waitForElement: Đợi checkbox xuất hiện
    // - waitForNoResultText: Đợi text "Không tìm thấy kết quả"
    // - Promise.race: Cái nào đến trước xử lý trước
    // - Check checkbox và click submit button
    // - Return structured result
  }
});
```

### 2. `contentScript.tsx` - Đơn giản hóa

**Trước:**
- ~230 dòng code
- Xử lý automation logic
- Quản lý injected script
- Message passing phức tạp
- jQuery datepicker handling

**Sau:**
- ~15 dòng code
- Chỉ giữ helper functions (có thể dùng sau này)
- Chế độ "monitoring only"
- Không còn automation logic

### 3. Loại bỏ dependencies không cần thiết

- ❌ `injected.js` integration
- ❌ window.postMessage communication
- ❌ Message listener trong popup useEffect
- ❌ jQuery dependencies
- ❌ Datepicker handling code

## Flow hoạt động mới

### 1. Firebase nhận data CCCD mới
```
Firebase onValue(refCCCD) trigger
    ↓
sendMessageToCurrentTab(data)
```

### 2. Automation execution
```
Update URL với params (HoTen, NgaySinh)
    ↓
Wait for page load (chrome.tabs.onUpdated)
    ↓
Inject automation script (chrome.scripting.executeScript)
    ↓
Script chạy trong page context:
    - Race: checkbox vs "Không tìm thấy kết quả"
    - Nếu tìm thấy checkbox:
        • Check checkbox
        • Wait 300ms
        • Click submit button (nếu enabled)
    - Nếu không tìm thấy:
        • Return not_found với tên người
    ↓
Return result về popup
```

### 3. Handle result
```
if (success):
    Firebase.set("continueCCCD")
    Notification: "✓ Đã xử lý thành công"
    
if (not_found):
    Firebase.set("notFound", name)
    Notification: "✗ Không tìm thấy"
    
else:
    Notification: "⚠ Lỗi: [reason]"
```

## API chính được sử dụng

### Chrome Scripting API
```typescript
chrome.scripting.executeScript({
  target: { tabId: number },
  func: () => Promise<T>,  // Function chạy trong page context
})
```

**Lưu ý quan trọng:**
- Function được serialize và inject vào page
- Không thể access biến ngoài scope (phải pass qua `args`)
- Return value phải serializable (JSON-compatible)
- Promise support từ Chrome 92+

### Chrome Tabs API
```typescript
// Update URL
chrome.tabs.update(tabId, { url: string })

// Listen for page load
chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
  if (changeInfo.status === 'complete') {
    // Page loaded
  }
})
```

## Type Safety

Đã thêm TypeScript types cho automation result:

```typescript
type AutomationResult = {
  success: boolean;
  reason: string;
  name?: string;
  message?: string;
  error?: string;
};
```

## Manifest Requirements

Đảm bảo `manifest.json` có đủ permissions:

```json
{
  "permissions": [
    "tabs",
    "scripting",      // ← Required cho chrome.scripting API
    "storage",
    "notifications"
  ],
  "host_permissions": [
    "https://hanhchinhcong.vnpost.vn/*"  // ← Required cho executeScript
  ]
}
```

## Migration Checklist

- [x] Refactor `sendMessageToCurrentTab` thành async function
- [x] Implement page load waiting với `chrome.tabs.onUpdated`
- [x] Move automation logic vào `chrome.scripting.executeScript`
- [x] Add type definitions cho result
- [x] Handle success/error cases với Firebase updates
- [x] Simplify contentScript.tsx
- [x] Remove injected script dependencies
- [x] Remove message listener trong popup
- [x] Test với real data flow

## Testing

### Test cases cần kiểm tra:

1. ✓ **Tìm thấy CCCD**: Checkbox xuất hiện → Check → Click submit
2. ✓ **Không tìm thấy**: Text "Không tìm thấy kết quả" xuất hiện
3. ✓ **Submit button disabled**: Checkbox tìm thấy nhưng button bị disable
4. ✓ **Timeout**: Không tìm thấy checkbox sau 5s
5. ✓ **Firebase integration**: Message đúng được gửi về Firebase

### Debug tips:

```javascript
// In popup console:
console.log("Automation result:", scriptResult);

// In target page console (executeScript context):
console.log("Checkbox found:", checkbox);
console.log("Submit button state:", submitButton.disabled);
```

## Performance

- **Before**: Multiple message passes, content script always active
- **After**: On-demand execution, clean state management
- **Load time**: Tương đương (executeScript overhead minimal)
- **Memory**: Ít hơn (không maintain state trong content script)

## Backward Compatibility

⚠️ **Breaking changes:**
- Content script không còn tự động xử lý automation
- Injected.js không còn được sử dụng
- Message format cũ (`finded`, `not_found`) không còn được content script gửi

✅ **Maintained:**
- Firebase message format vẫn giữ nguyên
- URL parameters format không đổi
- Extension permissions không thay đổi

## Troubleshooting

### Issue: Script không execute
**Solution**: Kiểm tra `host_permissions` trong manifest.json

### Issue: Result trả về `undefined`
**Solution**: Đảm bảo function trong `executeScript` return Promise với proper resolve

### Issue: Page load listener không trigger
**Solution**: Add timeout fallback (đã implement 10s timeout)

### Issue: Checkbox tìm thấy nhưng không click được
**Solution**: Kiểm tra event dispatching và UI state (đã add 300ms delay)

## Future Improvements

1. ⚡ **Retry logic**: Auto retry nếu automation fail
2. 📊 **Metrics**: Track success rate, timing
3. 🎯 **Smart wait**: Dynamic timeout dựa trên page load time
4. 🔄 **Queue management**: Xử lý nhiều CCCD tuần tự
5. 🛡️ **Error recovery**: Handle edge cases tốt hơn

## Kết luận

Migration này tạo nền tảng vững chắc cho:
- Dễ bảo trì và mở rộng
- Kiểm soát luồng tốt hơn
- Debug đơn giản hơn
- Ít bug liên quan đến state management

Toàn bộ automation logic giờ có thể theo dõi, test và maintain từ một nơi duy nhất (popup.tsx).
