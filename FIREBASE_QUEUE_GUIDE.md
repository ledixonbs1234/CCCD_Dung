# Hướng dẫn sử dụng Firebase Queue System

## 🎯 Tổng quan

Extension đã được nâng cấp với hệ thống queue management hoàn toàn mới dựa trên Firebase Realtime Database. Giờ đây, bạn có thể:

- ✅ Lưu trữ danh sách CCCD trực tiếp trên Firebase
- ✅ Extension tự động xử lý từng CCCD trong queue
- ✅ Theo dõi trạng thái real-time (pending, processing, completed, error)
- ✅ Tạo 50 CCCD ngẫu nhiên để test
- ✅ Bật/tắt chế độ tự động
- ✅ Xử lý từng CCCD một (manual mode)

---

## 📊 Firebase Database Structure

```
CCCDAPP/
├── {firebase_key}/
│   ├── cccdauto: boolean                      # Auto-run state
│   ├── currentIndex: number                   # Index của CCCD đang xử lý
│   ├── cccdQueue/                             # Hàng đợi CCCD
│   │   ├── {random_id_1}/
│   │   │   ├── index: 0
│   │   │   ├── Name: "Nguyễn Văn A"
│   │   │   ├── Id: "001234567890"
│   │   │   ├── NgaySinh: "01/01/1990"
│   │   │   ├── DiaChi: "Hà Nội"
│   │   │   ├── gioiTinh: "Nam"
│   │   │   ├── maBuuGui: "BĐ590123"
│   │   │   ├── NgayLamCCCD: "01/01/2020"
│   │   │   ├── status: "pending"              # pending | processing | completed | error
│   │   │   ├── processedAt: "2024-01-01..."   # (optional)
│   │   │   └── errorReason: "..."             # (optional)
│   │   └── ...
│   ├── message/                               # Legacy message channel
│   └── errorcccd/records/                     # Error records
```

---

## 🚀 Cách sử dụng

### 1️⃣ Cấu hình Firebase Key

1. Mở extension popup
2. Click **"Thêm Key"** nếu chưa có
3. Nhập Firebase key (ví dụ: `user123`, `test_room`)
4. Click **"Lưu"**

> **Lưu ý:** Firebase key giúp tách biệt dữ liệu giữa các users/rooms khác nhau.

---

### 2️⃣ Tạo danh sách CCCD test

**Option 1: Tạo ngẫu nhiên (recommended cho testing)**

1. Click nút **"Tạo 50 người"** 🎲
2. Extension sẽ tự động tạo 50 CCCD với thông tin ngẫu nhiên:
   - Họ tên Việt Nam (Nam/Nữ)
   - CCCD ID (12 số)
   - Ngày sinh (1970-2005)
   - Địa chỉ (các tỉnh thành lớn)
   - Giới tính
   - Mã bưu gửi
3. Dữ liệu sẽ được upload lên Firebase tự động

**Option 2: Upload từ Flutter App** *(coming soon)*

Flutter app có thể upload danh sách CCCD thực lên Firebase bằng function:
```dart
await uploadCCCDQueue(List<CCCDInfo> cccdList);
```

---

### 3️⃣ Xử lý CCCD

#### 🤖 Chế độ tự động (Auto-run)

1. Click nút **"Bật Auto"** ▶️
2. Extension sẽ:
   - Lấy CCCD đầu tiên có status = `pending`
   - Navigate đến trang VNPost
   - Tìm kiếm CCCD
   - Check checkbox tự động
   - Submit form
   - Đợi modal xác nhận
   - Cập nhật status → `completed`
   - **Tự động chuyển sang CCCD tiếp theo** 🔄
3. Click **"Dừng Auto"** ⏸️ để dừng

#### 🖱️ Chế độ thủ công (Manual)

1. Click nút **"Xử lý tiếp"** ⏭️
2. Extension xử lý **1 CCCD** rồi dừng
3. Phải click lại để tiếp tục CCCD kế tiếp

---

### 4️⃣ Theo dõi tiến trình

Extension hiển thị **3 panels chính**:

#### 📊 Panel 1: Trạng thái hàng đợi (Queue Status)
- **Progress bar**: Tỉ lệ hoàn thành
- **Đang chờ** (🟡 orange): Số CCCD chưa xử lý
- **Đang xử lý** (🔵 blue): CCCD đang được process
- **Hoàn thành** (🟢 green): CCCD đã xử lý thành công
- **Lỗi** (🔴 red): CCCD gặp lỗi (không tìm thấy, duplicate, etc.)

#### 👤 Panel 2: CCCD hiện tại (Current CCCD Display)
Hiển thị chi tiết CCCD đang được xử lý:
- Họ tên
- Số CCCD
- Ngày sinh
- Địa chỉ
- Giới tính
- Trạng thái
- Thời gian xử lý (nếu có)
- Lý do lỗi (nếu có)

#### 🎮 Panel 3: Controls
- **Bật Auto** / **Dừng Auto**
- **Xử lý tiếp** (manual)
- **Tạo 50 người** (test data)
- **Xóa hàng đợi**

---

## 🔄 Workflow tự động

### Khi Auto-run = ON

```
1. Extension lấy CCCD đầu tiên có status = "pending"
   ↓
2. Cập nhật status → "processing"
   ↓
3. Navigate đến VNPost với thông tin CCCD
   ↓
4. Tìm kiếm → Check checkbox → Submit
   ↓
5. Đợi modal xác nhận
   ↓
6a. ✅ Thành công:
    - Cập nhật status → "completed"
    - Đợi 2 giây
    - Lặp lại từ bước 1 (CCCD tiếp theo)
   
6b. ❌ Lỗi (không tìm thấy):
    - Cập nhật status → "error"
    - Lưu vào errorcccd/records
    - Đợi 2 giây
    - Lặp lại từ bước 1 (skip CCCD lỗi)
```

### Khi Auto-run = OFF

- Extension chỉ xử lý 1 CCCD rồi **dừng lại**
- Phải click **"Xử lý tiếp"** để tiếp tục

---

## 🎨 UI Features

### Progress Bar
- Màu xanh lá: % hoàn thành
- Animation khi đang xử lý
- Real-time updates

### Statistics Cards
- Icon màu sắc cho từng trạng thái
- Số lượng real-time
- Spinning animation khi processing

### Current CCCD Card
- Badge hiển thị thứ tự (#1, #2, ...)
- Code block cho CCCD ID
- Tag màu cho giới tính (blue = Nam, pink = Nữ)
- Alert box cho error messages
- Timestamp cho processedAt

### Gradient Buttons
- **Bật Auto**: Purple gradient (667eea → 764ba2)
- **Tạo 50 người**: Pink gradient (f093fb → f5576c)
- **Dừng Auto**: Red danger
- **Xử lý tiếp**: Default với tooltip

---

## 🐛 Xử lý lỗi

### Các loại lỗi tự động detect:

1. **Not Found** - Không tìm thấy CCCD trong hệ thống
   - Status → `error`
   - ErrorReason: `"Not found in system"`
   - Lưu vào `errorcccd/records`

2. **Multiple Records** - Tìm thấy nhiều hơn 1 bản ghi
   - Status → `error`
   - ErrorReason: `"Multiple records found"`

3. **Modal Not Detected** - Không phát hiện modal xác nhận
   - Status → `error`
   - ErrorReason: `"Modal not detected"`

4. **Timeout** - Quá thời gian chờ
   - Status → `error`
   - ErrorReason: `"Timeout"`

---

## 📱 Flutter App Integration

### Upload CCCD Queue từ app

```dart
Future<void> uploadCCCDQueue(List<CCCDInfo> cccdList) async {
  final rootPath = database.child('CCCDAPP').child(firebaseKey);
  final queueRef = rootPath.child('cccdQueue');
  
  // Clear existing queue
  await queueRef.remove();
  
  // Upload each CCCD
  for (int i = 0; i < cccdList.length; i++) {
    final cccdData = {
      'index': i,
      'Name': cccdList[i].name,
      'Id': cccdList[i].id,
      'NgaySinh': cccdList[i].ngaySinh,
      'DiaChi': cccdList[i].diaChi,
      'gioiTinh': cccdList[i].gioiTinh,
      'maBuuGui': cccdList[i].maBuuGui,
      'NgayLamCCCD': cccdList[i].ngayLamCCCD,
      'status': 'pending',
    };
    
    await queueRef.push().set(cccdData);
  }
  
  // Reset currentIndex
  await rootPath.child('currentIndex').set(0);
}
```

### Monitor Progress từ app

```dart
void listenToQueueProgress() {
  final queueRef = database
      .child('CCCDAPP')
      .child(firebaseKey)
      .child('cccdQueue');
  
  queueRef.onValue.listen((event) {
    if (event.snapshot.value != null) {
      final data = event.snapshot.value as Map;
      final cccdList = data.values.toList();
      
      final pending = cccdList.where((c) => c['status'] == 'pending').length;
      final processing = cccdList.where((c) => c['status'] == 'processing').length;
      final completed = cccdList.where((c) => c['status'] == 'completed').length;
      final error = cccdList.where((c) => c['status'] == 'error').length;
      
      print('📊 Queue Progress:');
      print('   Pending: $pending');
      print('   Processing: $processing');
      print('   Completed: $completed');
      print('   Error: $error');
      
      // Update UI
      setState(() {
        queueStats = {
          'pending': pending,
          'processing': processing,
          'completed': completed,
          'error': error,
        };
      });
    }
  });
}
```

---

## 🔧 Developer Notes

### File Structure

```
src/
├── popup/
│   ├── popup.tsx                    # Main popup với queue logic
│   ├── utils/
│   │   └── cccdGenerator.ts         # Random CCCD generator
│   └── components/
│       ├── QueueStatusPanel.tsx     # Progress bar + stats
│       ├── CurrentCCCDDisplay.tsx   # Current CCCD info
│       └── AutoRunControls.tsx      # Control buttons
```

### Key Functions

- `uploadCCCDQueue(cccdList)` - Upload list to Firebase
- `processNextCCCD()` - Process next pending CCCD
- `updateCCCDStatus(key, status, reason)` - Update status
- `generateCCCDList(count)` - Generate random CCCDs

### State Management

```typescript
const [queueData, setQueueData] = useState<Record<string, CCCDInfo>>({});
const [currentIndex, setCurrentIndex] = useState(0);
const [isAutoRunning, setIsAutoRunning] = useState(false);
const [currentCCCD, setCurrentCCCD] = useState<CCCDInfo | null>(null);
const [isProcessing, setIsProcessing] = useState(false);
```

---

## 🎯 Testing Checklist

- [ ] Tạo 50 CCCD ngẫu nhiên
- [ ] Kiểm tra progress bar update
- [ ] Test auto-run mode (full queue)
- [ ] Test manual mode (từng cái một)
- [ ] Verify status updates (pending → processing → completed)
- [ ] Check error handling (not found)
- [ ] Test stop/resume auto-run
- [ ] Verify Firebase data structure
- [ ] Test with different Firebase keys
- [ ] Check clear queue functionality

---

## 📝 Changelog

### v2.0.0 - Firebase Queue System

**New Features:**
- ✨ Firebase-based queue management
- ✨ Auto-run mode với continuous processing
- ✨ Manual mode (process one by one)
- ✨ Real-time progress tracking
- ✨ Random CCCD generator (50 records)
- ✨ Enhanced UI với 3 panels
- ✨ Status tracking (pending/processing/completed/error)
- ✨ Error handling và logging

**UI Improvements:**
- 🎨 Progress bar với gradient colors
- 🎨 Statistics cards với icons
- 🎨 Current CCCD display card
- 🎨 Gradient buttons
- 🎨 Tooltips cho buttons
- 🎨 Animations và transitions

**Technical:**
- 🔧 Firebase listeners cho queue/index/auto state
- 🔧 Async/await error handling
- 🔧 Race condition prevention
- 🔧 TypeScript interfaces
- 🔧 Component-based architecture

---

## 🆘 Troubleshooting

### Queue không tự động chạy?
- ✅ Kiểm tra Firebase key đã cấu hình chưa
- ✅ Verify `cccdauto` = `true` trong Firebase
- ✅ Check có CCCD nào `status = "pending"` không
- ✅ Xem console logs để debug

### UI không update?
- ✅ Refresh extension popup
- ✅ Check Firebase listeners đang active
- ✅ Verify Firebase rules cho phép read/write

### CCCD bị stuck ở "processing"?
- ✅ Click "Dừng Auto" rồi "Bật Auto" lại
- ✅ Manually update status trong Firebase Console
- ✅ Clear queue và upload lại

---

**Happy Automating! 🚀**
