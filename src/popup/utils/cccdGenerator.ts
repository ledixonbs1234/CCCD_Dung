// cccdGenerator.ts - Generate random CCCD data

export interface CCCDInfo {
  index: number;
  Name: string;
  Id: string;
  NgaySinh: string;
  DiaChi: string;
  gioiTinh: string;
  maBuuGui: string;
  NgayLamCCCD: string;
  status: 'pending' | 'processing' | 'completed' | 'error';
  createdAt: string;  // ✅ NEW: ISO timestamp for ordering
  processedAt?: string;
  errorReason?: string;
}

// Vietnamese names database
const firstNames = {
  male: [
    'Văn', 'Hữu', 'Đức', 'Minh', 'Quang', 'Hoàng', 'Tuấn', 'Anh', 
    'Hùng', 'Dũng', 'Thành', 'Tùng', 'Khoa', 'Phong', 'Long', 'Tân',
    'Thịnh', 'Hải', 'Bình', 'Đạt', 'Khánh', 'Trung', 'Nam', 'Sơn'
  ],
  female: [
    'Thị', 'Thu', 'Hồng', 'Mai', 'Lan', 'Hương', 'Nga', 'Linh',
    'Hà', 'Thanh', 'Phương', 'Trang', 'Nhung', 'Tú', 'Vy', 'My',
    'Ánh', 'Diệu', 'Như', 'Thảo', 'Huyền', 'Kim', 'Loan', 'Yến'
  ]
};

const lastNames = [
  'Nguyễn', 'Trần', 'Lê', 'Phạm', 'Hoàng', 'Huỳnh', 'Phan', 'Vũ',
  'Võ', 'Đặng', 'Bùi', 'Đỗ', 'Hồ', 'Ngô', 'Dương', 'Lý'
];

const middleNames = [
  'Văn', 'Thị', 'Đức', 'Hữu', 'Công', 'Minh', 'Thanh', 'Thu',
  'Quốc', 'Bảo', 'Tấn', 'Gia', 'Xuân', 'Kim', 'Hồng', 'Mai'
];

const cities = [
  'Hà Nội', 'TP. Hồ Chí Minh', 'Đà Nẵng', 'Hải Phòng', 'Cần Thơ',
  'Biên Hòa', 'Nha Trang', 'Huế', 'Buôn Ma Thuột', 'Quy Nhơn'
];

const districts = [
  'Quận 1', 'Quận 2', 'Quận 3', 'Quận 4', 'Quận 5',
  'Ba Đình', 'Hoàn Kiếm', 'Hai Bà Trưng', 'Đống Đa', 'Cầu Giấy',
  'Thanh Xuân', 'Hoàng Mai', 'Long Biên', 'Tây Hồ', 'Hà Đông'
];

const streets = [
  'Lê Lợi', 'Trần Hưng Đạo', 'Nguyễn Huệ', 'Hai Bà Trưng', 'Lý Thường Kiệt',
  'Phan Chu Trinh', 'Điện Biên Phủ', 'Nguyễn Thị Minh Khai', 'Hoàng Diệu',
  'Lê Duẩn', 'Nguyễn Du', 'Trần Phú', 'Hùng Vương', 'Quang Trung'
];

// Helper functions
const randomItem = <T>(array: T[]): T => {
  return array[Math.floor(Math.random() * array.length)];
};

const randomNumber = (min: number, max: number): number => {
  return Math.floor(Math.random() * (max - min + 1)) + min;
};

const padZero = (num: number, length: number = 2): string => {
  return num.toString().padStart(length, '0');
};

// Generate random CCCD ID (12 digits)
const generateCCCDId = (): string => {
  // Format: 001 + YYYYMMDD + XXX
  // 001 = location code
  const locationCode = padZero(randomNumber(1, 96), 3);
  
  // YYYYMMDD = birth date (partial)
  const year = randomNumber(70, 99); // 1970-1999
  const month = padZero(randomNumber(1, 12));
  const day = padZero(randomNumber(1, 28));
  
  // Random 3 digits
  const suffix = padZero(randomNumber(1, 999), 3);
  
  return `${locationCode}${year}${month}${day}${suffix}`;
};

// Generate random date in DD/MM/YYYY format
const generateRandomDate = (startYear: number, endYear: number): string => {
  const year = randomNumber(startYear, endYear);
  const month = padZero(randomNumber(1, 12));
  const day = padZero(randomNumber(1, 28)); // Avoid invalid dates
  
  return `${day}/${month}/${year}`;
};

// Generate random name
const generateName = (gender: 'Nam' | 'Nữ'): string => {
  const lastName = randomItem(lastNames);
  const middleName = randomItem(middleNames);
  const firstName = gender === 'Nam' 
    ? randomItem(firstNames.male) 
    : randomItem(firstNames.female);
  
  return `${lastName} ${middleName} ${firstName}`;
};

// Generate random address
const generateAddress = (): string => {
  const streetNumber = randomNumber(1, 999);
  const street = randomItem(streets);
  const district = randomItem(districts);
  const city = randomItem(cities);
  
  return `${streetNumber} ${street}, ${district}, ${city}`;
};

// Generate mã bưu gửi (postal code)
const generateMaBuuGui = (): string => {
  // Format: BĐ + 6 digits
  const code = randomNumber(100000, 999999);
  return `BĐ${code}`;
};

// Generate single CCCD
export const generateSingleCCCD = (index: number): CCCDInfo => {
  const gender = Math.random() > 0.5 ? 'Nam' : 'Nữ';
  const birthYear = randomNumber(1970, 2005);
  const issueYear = randomNumber(birthYear + 18, 2024); // CCCD issued after 18 years old
  
  return {
    index,
    Name: generateName(gender),
    Id: generateCCCDId(),
    NgaySinh: generateRandomDate(birthYear, birthYear), // Same year
    DiaChi: generateAddress(),
    gioiTinh: gender,
    maBuuGui: generateMaBuuGui(),
    NgayLamCCCD: generateRandomDate(issueYear, issueYear),
    status: 'pending',
    createdAt: new Date(Date.now() + index).toISOString() // ✅ Unique timestamp for each CCCD
  };
};

// Generate multiple CCCDs
export const generateCCCDList = (count: number = 50): CCCDInfo[] => {
  const cccdList: CCCDInfo[] = [];
  
  for (let i = 0; i < count; i++) {
    cccdList.push(generateSingleCCCD(i));
  }
  
  return cccdList;
};

// Validate CCCD data
export const validateCCCD = (cccd: CCCDInfo): boolean => {
  return !!(
    cccd.Name &&
    cccd.Id &&
    cccd.Id.length === 12 &&
    cccd.NgaySinh &&
    cccd.DiaChi &&
    cccd.gioiTinh &&
    cccd.maBuuGui
  );
};

// Export all in one function for easy testing
export const generateAndValidateCCCDList = (count: number = 50): CCCDInfo[] => {
  const list = generateCCCDList(count);
  return list.filter(validateCCCD);
};
