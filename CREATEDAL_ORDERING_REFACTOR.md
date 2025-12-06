# CreatedAt-Based Ordering Refactor

## 🎯 Mục đích
Thay thế logic sử dụng `index` field bằng `createdAt` timestamp để đảm bảo thứ tự CCCD an toàn và đúng trong môi trường multi-user (Flutter app + Chrome Extension).

## 🐛 Vấn đề cũ

### 1. Index Confusion
```typescript
// ❌ SAI: Nhầm lẫn giữa array index và CCCD.index field
const nextCCCD = cccdList.find((cccd, idx) => 
  idx >= currentIdx && cccd.status === "pending"
);
// idx = vị trí trong mảng (0,1,2,3...)
// currentIdx = giá trị CCCD.index field
// → So sánh 2 thứ khác nhau!
```

### 2. Race Condition với Flutter
- Flutter app thêm CCCD mới vào queue với `index: maxIndex + 1`
- Extension đang xử lý index 5, sau đó tăng lên index 6
- Nhưng khi sort lại mảng, CCCD.index = 6 có thể không còn ở vị trí [6] nữa

### 3. Duplicate Index khi xóa
- Queue có CCCD với index: 1, 2, 3, 4, 5
- Xóa CCCD index 3
- Queue còn: 1, 2, 4, 5
- Flutter thêm mới với index 6, nhưng nếu không reindex, có thể có duplicate

## ✅ Giải pháp: CreatedAt Timestamp

### Interface Update
```typescript
export interface CCCDInfo {
  index: number;          // Giữ lại cho compatibility
  Name: string;
  Id: string;
  NgaySinh: string;
  DiaChi: string;
  gioiTinh: string;
  maBuuGui: string;
  NgayLamCCCD: string;
  status: 'pending' | 'processing' | 'completed' | 'error';
  createdAt: string;      // ✅ NEW: ISO timestamp cho ordering
  processedAt?: string;
  errorReason?: string;
}
```

### Generator Update
```typescript
const generateSingleCCCD = (index: number): CCCDInfo => {
  return {
    index,
    // ... other fields
    status: "pending",
    createdAt: new Date(Date.now() + index).toISOString(),  // ✅ Unique timestamp
  };
};
```

### Sorting Logic
```typescript
// ✅ ĐÚNG: Sort theo createdAt
cccdList.sort((a, b) => {
  const timeA = new Date(a.createdAt || 0).getTime();
  const timeB = new Date(b.createdAt || 0).getTime();
  return timeA - timeB;
});
```

## 🔄 Các thay đổi chính

### 1. processNextCCCD (src/popup/popup.tsx)

**Trước:**
```typescript
// Lấy currentIndex từ Firebase
const currentIdx = indexSnapshot.val() || 0;

// Sort theo index
cccdList.sort((a, b) => a.index - b.index);

// Tìm CCCD với idx >= currentIdx
const nextCCCD = cccdList.find((cccd, idx) => 
  idx >= currentIdx && cccd.status === "pending"
);

// Update currentIndex = nextCCCD.index
await set(refIndex, nextCCCD.index);
```

**Sau:**
```typescript
// Sort theo createdAt
cccdList.sort((a, b) => {
  const timeA = new Date(a.createdAt || 0).getTime();
  const timeB = new Date(b.createdAt || 0).getTime();
  return timeA - timeB;
});

// Tìm CCCD đầu tiên có status "pending" (mảng đã sort theo thời gian)
const nextCCCD = cccdList.find((cccd) => cccd.status === "pending");

// Update currentIndex = vị trí trong mảng (cho UI display)
const currentIdx = cccdList.findIndex((c) => c.key === cccdKey);
await set(refIndex, currentIdx);
```

### 2. handleProcessCurrent

**Trước:**
```typescript
cccdList.sort((a, b) => a.index - b.index);
const currentCCCDItem = cccdList.find((cccd) => cccd.index === currentIndex);
```

**Sau:**
```typescript
// Sort theo createdAt
cccdList.sort((a, b) => {
  const timeA = new Date(a.createdAt || 0).getTime();
  const timeB = new Date(b.createdAt || 0).getTime();
  return timeA - timeB;
});

// Lấy CCCD theo vị trí trong mảng đã sort
const currentCCCDItem = cccdList[currentIndex];
```

### 3. unsubscribeIndex Listener

**Trước:**
```typescript
const cccdList = Object.values(queueObj) as CCCDInfo[];
cccdList.sort((a, b) => a.index - b.index);

if (cccdList[idx]) {
  setCurrentCCCD(cccdList[idx]);
}
```

**Sau:**
```typescript
const cccdList = Object.entries(queueObj).map(([key, value]: [string, any]) => ({
  key,
  ...value
}));

// Sort theo createdAt
cccdList.sort((a, b) => {
  const timeA = new Date(a.createdAt || 0).getTime();
  const timeB = new Date(b.createdAt || 0).getTime();
  return timeA - timeB;
});

// Lấy theo vị trí idx
if (cccdList[idx]) {
  setCurrentCCCD(cccdList[idx]);
}
```

### 4. Navigation Functions (Không đổi)
```typescript
// handleNavigatePrevious & handleNavigateNext chỉ cập nhật currentIndex
// currentIndex = vị trí trong mảng đã sort theo createdAt
const handleNavigatePrevious = async () => {
  if (currentIndex > 0) {
    await set(refIndex, currentIndex - 1);
  }
};

const handleNavigateNext = async () => {
  const cccdList = Object.values(queueData);
  if (currentIndex < cccdList.length - 1) {
    await set(refIndex, currentIndex + 1);
  }
};
```

## 🎯 Lợi ích

### 1. Tránh Index Confusion
- Không còn nhầm lẫn giữa array position và CCCD.index field
- currentIndex = vị trí trong mảng đã sort theo createdAt
- CCCD.index giữ lại cho compatibility, nhưng không dùng cho logic ordering

### 2. An toàn với Concurrent Writes
- Flutter thêm CCCD với timestamp hiện tại
- Extension thêm CCCD với timestamp hiện tại
- Sort theo createdAt luôn cho thứ tự đúng theo thời gian tạo
- Không có conflict vì timestamp là unique (millisecond precision)

### 3. Xử lý Deletion đúng
- Xóa CCCD không ảnh hưởng thứ tự của các CCCD còn lại
- createdAt không thay đổi khi xóa/thêm CCCD khác
- Không cần reindex

### 4. Consistent Sorting
- Mọi nơi đều sort theo createdAt với cùng logic
- Helper function có thể tái sử dụng:
```typescript
const sortCCCDByCreatedAt = (list: CCCDInfo[]) => {
  return list.sort((a, b) => {
    const timeA = new Date(a.createdAt || 0).getTime();
    const timeB = new Date(b.createdAt || 0).getTime();
    return timeA - timeB;
  });
};
```

## 🧪 Testing Checklist

- [ ] Tạo queue 50 CCCD ngẫu nhiên
- [ ] Verify các CCCD được sort theo thời gian tạo
- [ ] Chạy auto-run và kiểm tra thứ tự xử lý đúng
- [ ] Xóa 1 CCCD ở giữa queue, verify queue còn lại vẫn đúng thứ tự
- [ ] Navigate Trước/Sau hoạt động đúng
- [ ] Process current CCCD hoạt động đúng
- [ ] Mở Flutter app và thêm CCCD mới trong khi Extension đang chạy
- [ ] Verify không có race condition
- [ ] Reload extension và verify queue state được restore đúng

## 📝 Notes

### CurrentIndex trong Firebase
- `currentIndex` trong Firebase giờ là **vị trí trong mảng đã sort** (0-based)
- Không phải là `CCCD.index` field
- Dùng để:
  - UI hiển thị CCCD đang chọn
  - Navigation (Trước/Sau)
  - Resume processing sau khi reload

### CCCD.index field
- Vẫn giữ lại trong interface cho compatibility
- Có thể dùng cho display (hiển thị số thứ tự cho user)
- Không dùng cho logic ordering nữa
- Flutter app vẫn có thể set index khi tạo CCCD

### Migration từ old data
Nếu có CCCD cũ không có `createdAt`:
```typescript
cccdList.sort((a, b) => {
  const timeA = new Date(a.createdAt || 0).getTime();
  const timeB = new Date(b.createdAt || 0).getTime();
  return timeA - timeB;
});
// CCCD không có createdAt sẽ có timestamp = 0 → lên đầu danh sách
```

## 🚀 Deployment

1. Test thoroughly trên local
2. Backup Firebase data
3. Deploy extension update
4. Cập nhật Flutter app để thêm `createdAt` khi tạo CCCD mới
5. Monitor logs để verify không có lỗi

## ✅ Status
- [x] Interface update với createdAt field
- [x] Generator update
- [x] processNextCCCD refactor
- [x] handleProcessCurrent refactor
- [x] unsubscribeIndex listener refactor
- [ ] Testing
- [ ] Flutter app update (nếu cần)
