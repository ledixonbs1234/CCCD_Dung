# Quick Start Guide - Testing New Architecture

## 🔧 Build & Install

1. **Build extension:**
   ```bash
   npm run build
   ```
   
2. **Load extension in Chrome:**
   - Mở `chrome://extensions/`
   - Bật "Developer mode"
   - Click "Load unpacked"
   - Chọn thư mục `dist/`

## 🧪 Testing Steps

### Test 1: Tìm thấy CCCD (Success Case)

1. Mở tab: `https://hanhchinhcong.vnpost.vn/giaodich/xac-nhan-all`
2. Mở Extension Popup
3. Gửi data CCCD qua Firebase:
   ```json
   {
     "Name": "NGUYEN VAN A",
     "NgaySinh": "01/01/1990"
   }
   ```
4. **Expected:**
   - URL tự động update với params
   - Page load xong
   - Checkbox tự động được check
   - Submit button được click
   - Notification: "✓ Đã xử lý thành công"
   - Firebase nhận message: `{"Lenh": "continueCCCD"}`

### Test 2: Không tìm thấy CCCD (Not Found Case)

1. Gửi data với thông tin không tồn tại:
   ```json
   {
     "Name": "NGUYEN VAN KHONGTONTAI",
     "NgaySinh": "01/01/2099"
   }
   ```
2. **Expected:**
   - Page hiển thị "Không tìm thấy kết quả"
   - Notification: "✗ Không tìm thấy: NGUYEN VAN KHONGTONTAI"
   - Firebase nhận message: `{"Lenh": "notFound", "DoiTuong": "NGUYEN VAN KHONGTONTAI"}`

### Test 3: Submit Button Disabled

1. Gửi data valid nhưng submit button bị disable
2. **Expected:**
   - Checkbox được check
   - Notification: "⚠ Lỗi: Submit button is disabled or not found"
   - Không crash, handle gracefully

## 🐛 Debug Tips

### 1. Check Popup Console
```javascript
// Mở popup → Right click → Inspect
// Console sẽ hiển thị:
console.log("Tab URL updated successfully:", newUrl);
console.log("Page loaded, executing automation script...");
console.log("Automation result:", scriptResult);
```

### 2. Check Target Page Console
```javascript
// Mở page hanhchinhcong.vnpost.vn → F12 Console
// Script sẽ log:
console.log("Checkbox checked");
console.log("Submit button clicked");
```

### 3. Check Firebase Console
Mở Firebase Realtime Database và monitor:
- `CCCDAPP/{your_key}/message` - Xem messages được gửi
- `CCCDAPP/{your_key}/cccd` - Xem data CCCD
- `CCCDAPP/{your_key}/errorcccd/records` - Xem error records

### 4. Common Issues

#### Script không chạy
**Symptom:** Không có log nào trong page console  
**Solution:**
- Check `host_permissions` trong manifest.json
- Đảm bảo tab đúng URL pattern
- Reload extension

#### Result undefined
**Symptom:** `scriptResult` là undefined  
**Solution:**
- Check TypeScript errors
- Đảm bảo function return Promise
- Kiểm tra serialization

#### Page load timeout
**Symptom:** Script chạy trước khi page load xong  
**Solution:**
- Đã có 10s timeout fallback
- Check network speed
- Có thể tăng timeout nếu cần

## 📊 Monitoring

### Success Metrics
- ✅ Automation success rate: >95%
- ✅ Average execution time: <3s
- ✅ Error handling: Graceful degradation
- ✅ Firebase sync: Real-time

### Key Logs to Monitor
```javascript
// Successful execution:
"Tab URL updated successfully"
"Page loaded, executing automation script..."
"Checkbox checked"
"Submit button clicked"
"Automation result: {success: true, reason: 'submitted'}"

// Not found case:
"Automation result: {success: false, reason: 'not_found', name: '...'}"

// Error case:
"Automation result: {success: false, reason: 'error', error: '...'}"
```

## 🎯 Next Actions

1. ✅ **Build completed** - No errors
2. 🧪 **Test với real data** - Load extension và test các scenarios
3. 📈 **Monitor metrics** - Track success/failure rate
4. 🔧 **Fine-tune timeouts** - Adjust nếu cần
5. 📝 **Document edge cases** - Ghi lại các trường hợp đặc biệt

## 🆘 Need Help?

### Files to check:
- `src/popup/popup.tsx` - Main automation logic (line ~230-380)
- `src/contentScript/contentScript.tsx` - Simple monitoring (15 lines)
- `dist/` - Build output

### Documentation:
- `MIGRATION_TO_SCRIPTING_API.md` - Detailed migration guide
- `ARCHITECTURE_COMPARISON.md` - Visual comparison
- `CHANGES_SUMMARY.md` - Quick summary

### Test command:
```bash
# Development build with watch
npm run dev

# Production build
npm run build
```

---

**Status:** ✅ Ready for testing  
**Build:** ✅ Successful (no errors, only size warnings)  
**Next:** Load extension và test với real Firebase data
