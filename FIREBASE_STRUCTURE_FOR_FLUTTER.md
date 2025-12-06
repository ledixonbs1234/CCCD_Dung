# Firebase Structure for Flutter App - Migration Guide

## 🎯 Mục đích
Document này mô tả cấu trúc Firebase Realtime Database được sử dụng bởi Chrome Extension, để Flutter app có thể tích hợp và đồng bộ dữ liệu.

## 📊 Firebase Configuration

### Project Details
```
Project ID: xonapp
Database URL: https://xonapp-default-rtdb.asia-southeast1.firebasedatabase.app
Region: Asia-Southeast1
```

### Firebase Config (Reference)
```javascript
const firebaseConfig = {
  apiKey: "AIzaSyA_Sk2BvOqh_rT3UHG4zDQjgN-OQnWowYU",
  authDomain: "xonapp.firebaseapp.com",
  databaseURL: "https://xonapp-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "xonapp",
  storageBucket: "xonapp.appspot.com",
  messagingSenderId: "1062012046846",
  appId: "1:1062012046846:web:7e1d63fe96f4a1abf38e94"
};
```

## 🗂️ Database Structure

### Root Path Pattern
```
CCCDAPP/
├── {firebase_key}/           # User-specific namespace (dynamic)
│   ├── cccdQueue/           # ✅ NEW: Main CCCD queue
│   ├── currentIndex         # ✅ NEW: Current position in queue
│   ├── cccdauto            # Auto-run state (boolean)
│   ├── message/            # Command messages (legacy)
│   ├── cccd                # Single CCCD data (legacy)
│   └── errorcccd/
│       └── records/        # Error tracking
└── (default)/              # Fallback when no firebase_key set
    ├── cccdQueue/
    ├── currentIndex
    ├── cccdauto
    └── message/
```

### Firebase Key Management
- **Purpose**: Ngăn conflict giữa nhiều user
- **Storage**: Được lưu trong Chrome Extension's local storage
- **Format**: Alphanumeric + underscore/hyphen, max 20 chars
- **Example**: `user_john`, `admin-001`, `flutter_client_1`

## 🔄 CCCD Queue Structure (NEW)

### Path
```
CCCDAPP/{firebase_key}/cccdQueue/
```

### Data Model
```typescript
interface CCCDInfo {
  // Identity Fields
  index: number;              // Sequential number (for display, not for ordering)
  Name: string;              // Tên đầy đủ
  Id: string;                // Số CCCD (12 số)
  
  // Personal Info
  NgaySinh: string;          // Format: DD/MM/YYYY
  DiaChi: string;            // Địa chỉ đầy đủ
  gioiTinh: string;          // "Nam" hoặc "Nữ"
  
  // Postal Info
  maBuuGui: string;          // Mã bưu gửi VNPost
  NgayLamCCCD: string;       // Format: DD/MM/YYYY
  
  // ✅ Processing Status
  status: 'pending' | 'processing' | 'completed' | 'error';
  
  // ✅ CRITICAL: Ordering Field
  createdAt: string;         // ISO 8601 timestamp (REQUIRED for ordering)
                             // Example: "2025-11-05T10:30:45.123Z"
  
  // Optional Fields
  processedAt?: string;      // ISO timestamp when processed
  errorReason?: string;      // Error message if status = 'error'
}
```

### Firebase Storage Format
```json
{
  "CCCDAPP": {
    "user_john": {
      "cccdQueue": {
        "-NxAbCd123": {
          "index": 0,
          "Name": "Nguyễn Văn A",
          "Id": "001234567890",
          "NgaySinh": "01/01/1990",
          "DiaChi": "123 Đường ABC, Quận 1, TP.HCM",
          "gioiTinh": "Nam",
          "maBuuGui": "VN123456789",
          "NgayLamCCCD": "01/11/2025",
          "status": "pending",
          "createdAt": "2025-11-05T10:30:45.123Z"
        },
        "-NxAbCd124": {
          "index": 1,
          "Name": "Trần Thị B",
          "Id": "001234567891",
          "NgaySinh": "15/05/1992",
          "DiaChi": "456 Đường XYZ, Quận 2, TP.HCM",
          "gioiTinh": "Nữ",
          "maBuuGui": "VN123456790",
          "NgayLamCCCD": "01/11/2025",
          "status": "processing",
          "createdAt": "2025-11-05T10:30:45.456Z",
          "processedAt": "2025-11-05T10:35:12.789Z"
        },
        "-NxAbCd125": {
          "index": 2,
          "Name": "Lê Văn C",
          "Id": "001234567892",
          "NgaySinh": "20/12/1988",
          "DiaChi": "789 Đường DEF, Quận 3, TP.HCM",
          "gioiTinh": "Nam",
          "maBuuGui": "VN123456791",
          "NgayLamCCCD": "02/11/2025",
          "status": "error",
          "createdAt": "2025-11-05T10:30:45.789Z",
          "processedAt": "2025-11-05T10:36:00.123Z",
          "errorReason": "Không tìm thấy khách hàng trên hệ thống"
        }
      }
    }
  }
}
```

## 📍 Current Index

### Path
```
CCCDAPP/{firebase_key}/currentIndex
```

### Purpose
Lưu vị trí hiện tại trong queue (0-based array index)

### Data Type
```typescript
number  // 0, 1, 2, 3, ...
```

### Usage
- Extension cập nhật khi xử lý CCCD mới
- Flutter app có thể đọc để biết CCCD đang được xử lý
- **IMPORTANT**: Đây là vị trí trong mảng đã sort theo `createdAt`, KHÔNG phải `CCCD.index` field

### Example
```json
{
  "CCCDAPP": {
    "user_john": {
      "currentIndex": 5  // Đang xử lý CCCD thứ 6 trong danh sách
    }
  }
}
```

## 🔄 Auto-Run State

### Path
```
CCCDAPP/{firebase_key}/cccdauto
```

### Purpose
Bật/tắt chế độ tự động xử lý CCCD

### Data Type
```typescript
boolean  // true = đang chạy, false = đã dừng
```

### Behavior
- Extension set `true` khi user nhấn "Bắt đầu"
- Extension set `false` khi:
  - User nhấn "Dừng"
  - Hết CCCD trong queue
  - Gặp lỗi nghiêm trọng

### Example
```json
{
  "CCCDAPP": {
    "user_john": {
      "cccdauto": true
    }
  }
}
```

## 📝 Error Records

### Path
```
CCCDAPP/{firebase_key}/errorcccd/records/
```

### Purpose
Lưu lịch sử các CCCD bị lỗi

### Data Structure
```json
{
  "CCCDAPP": {
    "user_john": {
      "errorcccd": {
        "records": {
          "-NxErrorKey1": {
            "Name": "Nguyễn Văn X",
            "Id": "001234567899",
            "errorReason": "Không tìm thấy khách hàng",
            "timestamp": "2025-11-05T11:00:00.000Z",
            "maBuuGui": "VN123456799"
          }
        }
      }
    }
  }
}
```

## 🔧 Flutter App Integration Guide

### 1. Setup Firebase
```dart
// pubspec.yaml
dependencies:
  firebase_core: ^2.24.0
  firebase_database: ^10.3.0

// Initialize Firebase
await Firebase.initializeApp(
  options: const FirebaseOptions(
    apiKey: 'AIzaSyA_Sk2BvOqh_rT3UHG4zDQjgN-OQnWowYU',
    appId: '1:1062012046846:web:7e1d63fe96f4a1abf38e94',
    messagingSenderId: '1062012046846',
    projectId: 'xonapp',
    databaseURL: 'https://xonapp-default-rtdb.asia-southeast1.firebasedatabase.app',
    storageBucket: 'xonapp.appspot.com',
  ),
);
```

### 2. Define Data Model
```dart
class CCCDInfo {
  final int index;
  final String name;
  final String id;
  final String ngaySinh;
  final String diaChi;
  final String gioiTinh;
  final String maBuuGui;
  final String ngayLamCCCD;
  final String status; // 'pending', 'processing', 'completed', 'error'
  final String createdAt; // ✅ REQUIRED: ISO timestamp
  final String? processedAt;
  final String? errorReason;

  CCCDInfo({
    required this.index,
    required this.name,
    required this.id,
    required this.ngaySinh,
    required this.diaChi,
    required this.gioiTinh,
    required this.maBuuGui,
    required this.ngayLamCCCD,
    required this.status,
    required this.createdAt,
    this.processedAt,
    this.errorReason,
  });

  factory CCCDInfo.fromJson(Map<String, dynamic> json) {
    return CCCDInfo(
      index: json['index'] ?? 0,
      name: json['Name'] ?? '',
      id: json['Id'] ?? '',
      ngaySinh: json['NgaySinh'] ?? '',
      diaChi: json['DiaChi'] ?? '',
      gioiTinh: json['gioiTinh'] ?? '',
      maBuuGui: json['maBuuGui'] ?? '',
      ngayLamCCCD: json['NgayLamCCCD'] ?? '',
      status: json['status'] ?? 'pending',
      createdAt: json['createdAt'] ?? DateTime.now().toIso8601String(),
      processedAt: json['processedAt'],
      errorReason: json['errorReason'],
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'index': index,
      'Name': name,
      'Id': id,
      'NgaySinh': ngaySinh,
      'DiaChi': diaChi,
      'gioiTinh': gioiTinh,
      'maBuuGui': maBuuGui,
      'NgayLamCCCD': ngayLamCCCD,
      'status': status,
      'createdAt': createdAt,
      if (processedAt != null) 'processedAt': processedAt,
      if (errorReason != null) 'errorReason': errorReason,
    };
  }
}
```

### 3. Add CCCD to Queue
```dart
Future<void> addCCCDToQueue({
  required String firebaseKey,
  required CCCDInfo cccd,
}) async {
  final dbRef = FirebaseDatabase.instance
      .ref('CCCDAPP/$firebaseKey/cccdQueue');
  
  // Push with auto-generated key
  await dbRef.push().set(cccd.toJson());
  
  print('✅ Added CCCD to queue: ${cccd.name}');
}
```

### 4. Listen to Queue Changes
```dart
Stream<List<CCCDInfo>> watchCCCDQueue(String firebaseKey) {
  final dbRef = FirebaseDatabase.instance
      .ref('CCCDAPP/$firebaseKey/cccdQueue');
  
  return dbRef.onValue.map((event) {
    if (event.snapshot.value == null) return [];
    
    final data = event.snapshot.value as Map<dynamic, dynamic>;
    final cccdList = data.entries.map((entry) {
      final cccdData = entry.value as Map<dynamic, dynamic>;
      return CCCDInfo.fromJson(Map<String, dynamic>.from(cccdData));
    }).toList();
    
    // ✅ CRITICAL: Sort by createdAt timestamp
    cccdList.sort((a, b) {
      final timeA = DateTime.parse(a.createdAt);
      final timeB = DateTime.parse(b.createdAt);
      return timeA.compareTo(timeB);
    });
    
    return cccdList;
  });
}
```

### 5. Listen to Current Index
```dart
Stream<int> watchCurrentIndex(String firebaseKey) {
  final dbRef = FirebaseDatabase.instance
      .ref('CCCDAPP/$firebaseKey/currentIndex');
  
  return dbRef.onValue.map((event) {
    return (event.snapshot.value as int?) ?? 0;
  });
}
```

### 6. Listen to Auto-Run State
```dart
Stream<bool> watchAutoRunState(String firebaseKey) {
  final dbRef = FirebaseDatabase.instance
      .ref('CCCDAPP/$firebaseKey/cccdauto');
  
  return dbRef.onValue.map((event) {
    return (event.snapshot.value as bool?) ?? false;
  });
}
```

### 7. Update CCCD Status
```dart
Future<void> updateCCCDStatus({
  required String firebaseKey,
  required String cccdKey,
  required String status,
  String? errorReason,
}) async {
  final updates = <String, dynamic>{
    'status': status,
  };
  
  if (status == 'processing' || status == 'completed' || status == 'error') {
    updates['processedAt'] = DateTime.now().toIso8601String();
  }
  
  if (errorReason != null) {
    updates['errorReason'] = errorReason;
  }
  
  final dbRef = FirebaseDatabase.instance
      .ref('CCCDAPP/$firebaseKey/cccdQueue/$cccdKey');
  
  await dbRef.update(updates);
}
```

### 8. Complete Example: Add Multiple CCCDs
```dart
Future<void> uploadCCCDList({
  required String firebaseKey,
  required List<CCCDInfo> cccdList,
}) async {
  final dbRef = FirebaseDatabase.instance
      .ref('CCCDAPP/$firebaseKey/cccdQueue');
  
  // Clear existing queue (optional)
  await dbRef.remove();
  
  // Add all CCCDs
  for (int i = 0; i < cccdList.length; i++) {
    final cccd = cccdList[i];
    
    // ✅ IMPORTANT: Set createdAt with unique timestamp
    final cccdWithTimestamp = CCCDInfo(
      index: i,
      name: cccd.name,
      id: cccd.id,
      ngaySinh: cccd.ngaySinh,
      diaChi: cccd.diaChi,
      gioiTinh: cccd.gioiTinh,
      maBuuGui: cccd.maBuuGui,
      ngayLamCCCD: cccd.ngayLamCCCD,
      status: 'pending',
      createdAt: DateTime.now()
          .add(Duration(milliseconds: i))
          .toIso8601String(),
    );
    
    await dbRef.push().set(cccdWithTimestamp.toJson());
  }
  
  // Reset currentIndex
  await FirebaseDatabase.instance
      .ref('CCCDAPP/$firebaseKey/currentIndex')
      .set(0);
  
  print('✅ Uploaded ${cccdList.length} CCCDs to queue');
}
```

## ⚠️ Critical Notes for Flutter Team

### 1. **createdAt Field is MANDATORY**
```dart
// ✅ CORRECT
final cccd = CCCDInfo(
  // ... other fields
  createdAt: DateTime.now().toIso8601String(),
);

// ❌ WRONG - Will break ordering
final cccd = CCCDInfo(
  // ... other fields
  // Missing createdAt!
);
```

### 2. **Always Sort by createdAt**
```dart
// ✅ CORRECT
cccdList.sort((a, b) {
  final timeA = DateTime.parse(a.createdAt);
  final timeB = DateTime.parse(b.createdAt);
  return timeA.compareTo(timeB);
});

// ❌ WRONG - Will show incorrect order
cccdList.sort((a, b) => a.index.compareTo(b.index));
```

### 3. **Don't Use index Field for Ordering**
- `index` field chỉ dùng để hiển thị số thứ tự cho user
- KHÔNG sử dụng `index` để sắp xếp hoặc tìm kiếm
- Sử dụng `createdAt` cho mọi logic ordering

### 4. **Unique Timestamps**
Khi thêm nhiều CCCD cùng lúc, đảm bảo `createdAt` unique:
```dart
for (int i = 0; i < cccdList.length; i++) {
  // Add milliseconds offset để tránh duplicate timestamp
  final timestamp = DateTime.now()
      .add(Duration(milliseconds: i))
      .toIso8601String();
  
  cccd.createdAt = timestamp;
}
```

### 5. **Status Flow**
```
pending → processing → completed
                    ↘ error
```

### 6. **Firebase Key Sync**
- Flutter và Extension phải dùng chung `firebase_key`
- Nếu không có key, dùng path mặc định (không có segment `{firebase_key}`)
- Recommend: Flutter lưu `firebase_key` trong SharedPreferences

## 🧪 Testing Scenarios

### Scenario 1: Flutter adds CCCD while Extension is running
```dart
// Flutter app
await addCCCDToQueue(
  firebaseKey: 'user_john',
  cccd: CCCDInfo(
    index: 10,
    name: 'New User',
    // ... other fields
    status: 'pending',
    createdAt: DateTime.now().toIso8601String(),
  ),
);

// Extension sẽ tự động nhận và xử lý CCCD mới
```

### Scenario 2: Check Processing Status
```dart
// Watch queue
watchCCCDQueue('user_john').listen((cccdList) {
  final pending = cccdList.where((c) => c.status == 'pending').length;
  final processing = cccdList.where((c) => c.status == 'processing').length;
  final completed = cccdList.where((c) => c.status == 'completed').length;
  final errors = cccdList.where((c) => c.status == 'error').length;
  
  print('📊 Queue Status:');
  print('  Pending: $pending');
  print('  Processing: $processing');
  print('  Completed: $completed');
  print('  Errors: $errors');
});
```

### Scenario 3: Monitor Current CCCD
```dart
StreamBuilder<int>(
  stream: watchCurrentIndex('user_john'),
  builder: (context, indexSnapshot) {
    if (!indexSnapshot.hasData) return Text('Loading...');
    
    return StreamBuilder<List<CCCDInfo>>(
      stream: watchCCCDQueue('user_john'),
      builder: (context, queueSnapshot) {
        if (!queueSnapshot.hasData) return Text('Loading...');
        
        final currentIndex = indexSnapshot.data!;
        final cccdList = queueSnapshot.data!;
        
        if (currentIndex >= cccdList.length) {
          return Text('Queue completed');
        }
        
        final currentCCCD = cccdList[currentIndex];
        return Text('Processing: ${currentCCCD.name}');
      },
    );
  },
);
```

## 🚀 Migration Checklist for Flutter Team

- [ ] Add Firebase dependencies to `pubspec.yaml`
- [ ] Initialize Firebase with provided config
- [ ] Create `CCCDInfo` model class with **createdAt** field
- [ ] Implement `fromJson` and `toJson` methods
- [ ] Create Firebase service class for CCCD operations
- [ ] Implement `addCCCDToQueue` function
- [ ] Implement `uploadCCCDList` function
- [ ] Add listeners for queue, currentIndex, autorun state
- [ ] **IMPORTANT**: Always sort by `createdAt` when displaying list
- [ ] Test concurrent writes with Extension
- [ ] Handle error cases (network, permission, invalid data)
- [ ] Add UI to display queue status
- [ ] Test with firebase_key parameter
- [ ] Document API for other team members

## 📞 Support

Nếu có thắc mắc về Firebase structure hoặc integration:
1. Check document này trước
2. Review Chrome Extension source code: `src/popup/popup.tsx`
3. Check `CREATEDAL_ORDERING_REFACTOR.md` để hiểu về createdAt logic
4. Contact Extension team để clarify

## 📚 Related Documents
- `FIREBASE_QUEUE_GUIDE.md` - User guide for Chrome Extension
- `CREATEDAL_ORDERING_REFACTOR.md` - Technical details about createdAt ordering
- `IMPLEMENTATION_COMPLETE.md` - Implementation summary
