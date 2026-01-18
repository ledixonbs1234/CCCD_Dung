import "../asserts/tailwind.css";
import { initializeApp } from "firebase/app";
import {
  getDatabase,
  ref,
  onValue,
  set,
  get,
  push,
  remove,
} from "firebase/database";

// THAY ĐỔI: Thay đổi icon và loại bỏ xlsx
import { RedoOutlined, CopyOutlined, SendOutlined, EditOutlined, PlusOutlined, DeleteOutlined } from "@ant-design/icons";
import { Button, Space, Input, Modal, Table, Tag, AutoComplete } from "antd";
import { useEffect, useState, useRef } from "react";
import { generateCCCDList, CCCDInfo } from "./utils/cccdGenerator";
import QueueStatusPanel from "./components/QueueStatusPanel";
import CurrentCCCDDisplay from "./components/CurrentCCCDDisplay";
import AutoRunControls from "./components/AutoRunControls";

const firebaseConfig = {
  apiKey: "AIzaSyAs9RtsXMRPeD5vpORJcWLDb1lEJZ3nUWI",
  authDomain: "xonapp.firebaseapp.com",
  databaseURL: "https://xonapp-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "xonapp",
  storageBucket: "xonapp.appspot.com",
  messagingSenderId: "892472148061",
  appId: "1:892472148061:web:f22a5c4ffd25858726cdb4"
};

export default function Popup() {
  const [errorRecords, setErrorRecords] = useState(null);
  const [maHieu, setMaHieu] = useState("");
  const [firebaseKey, setFirebaseKey] = useState("");
  // ✅ NEW: Queue management states
  const [queueData, setQueueData] = useState<Record<string, CCCDInfo>>({});
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAutoRunning, setIsAutoRunning] = useState(false);
  const [currentCCCD, setCurrentCCCD] = useState<CCCDInfo | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // State cho tìm vị trí theo tên
  const [searchName, setSearchName] = useState("");
  const [searchResult, setSearchResult] = useState<null | { index: number, cccd: any }>(null);
  // Gợi ý tên từ queueData
  const nameOptions = Object.values(queueData || {})
    .map((item: any) => item.Name)
    .filter((v, i, arr) => v && arr.indexOf(v) === i)
    .map(name => ({ value: name }));
  const [currentFirebaseKey, setCurrentFirebaseKey] = useState("");
  const [isKeyModalVisible, setIsKeyModalVisible] = useState(false);
  const [isKeySetupComplete, setIsKeySetupComplete] = useState(false);

  // ✅ CRITICAL FIX: useRef để persist lock across re-renders
  const processingLockRef = useRef(false);

  // ✅ Helper function to release processing lock
  const releaseLock = () => {
    processingLockRef.current = false;
    setIsProcessing(false);
    console.log("🔓 Processing lock released");
  };

  // Load Firebase key from storage on mount
  useEffect(() => {
    chrome.storage.local.get(['firebase_key'], (result) => {
      const savedKey = result.firebase_key || "";
      console.log("Loaded Firebase key from storage:", savedKey);
      setCurrentFirebaseKey(savedKey);
      setFirebaseKey(savedKey);
      setIsKeySetupComplete(!!savedKey);
    });
  }, []);

  // Dynamic Firebase path based on key
  const getFirebasePath = (path: string) => {
    const key = currentFirebaseKey;
    return key ? `CCCDAPP/${key}/${path}` : `CCCDAPP/${path}`;
  };

  initializeApp(firebaseConfig);
  const db = getDatabase();

  // MỚI: Hàm xử lý sao chép dữ liệu vào clipboard
  const handleCopyData = () => {
    if (!errorRecords || Object.keys(errorRecords).length === 0) {
      showNotification("Không có dữ liệu để sao chép.");
      return;
    }

    try {
      // Chuyển đổi object thành mảng với key là index
      const dataArray = Object.entries(errorRecords).map(([key, record]: [string, any], index) => ({
        index: index + 1,
        key: key,
        ...record
      }));

      console.log("Data to copy:", dataArray);

      // Tạo các hàng dữ liệu, mỗi cột phân tách bằng TAB (\t)
      // Sử dụng chỉ số của map để tạo số thứ tự (bắt đầu từ 1) thay vì dùng record.index
      const dataRows = dataArray.map((record, idx) => {
        const cells = [
          idx + 1,                                    // STT (số thứ tự bắt đầu từ 1)
          record.Id || '',                            // Số CCCD
          record.Name || '',                          // Họ tên
          record.NgaySinh || '',                      // Ngày sinh
          record.gioiTinh || '',                      // Giới tính
          record.DiaChi || '',                        // Địa chỉ
        ];
        return cells.join('\t'); // Nối các ô bằng ký tự TAB
      });

      // Kết hợp các hàng dữ liệu, mỗi hàng phân tách bằng ký tự xuống dòng (\n)
      const clipboardText = dataRows.join('\n');

      console.log("Clipboard text:", clipboardText);

      // Sử dụng Clipboard API để sao chép
      navigator.clipboard.writeText(clipboardText).then(() => {
        showNotification(`✅ Đã sao chép ${dataArray.length} bản ghi vào clipboard!`);
      }).catch(err => {
        console.error("Lỗi khi sao chép: ", err);
        showNotification("❌ Không thể sao chép dữ liệu.");
      });
    } catch (error) {
      console.error("Error in handleCopyData:", error);
      showNotification("❌ Lỗi khi xử lý dữ liệu sao chép.");
    }
  };

  // MỚI: Hàm xóa danh sách lỗi
  const handleClearErrorRecords = () => {
    Modal.confirm({
      title: 'Xác nhận xóa danh sách lỗi',
      content: 'Bạn có chắc chắn muốn xóa toàn bộ danh sách lỗi?',
      okText: 'Xóa',
      cancelText: 'Hủy',
      okButtonProps: { danger: true },
      onOk: async () => {
        try {
          const refErrorRecords = ref(db, getFirebasePath("errorcccd/records"));
          await remove(refErrorRecords);
          
          showNotification("✅ Đã xóa danh sách lỗi");
        } catch (error) {
          console.error("Error clearing error records:", error);
          showNotification("❌ Lỗi khi xóa danh sách lỗi");
        }
      }
    });
  };

  // MỚI: Hàm xử lý gửi mã hiệu
  const handleSendMaHieu = () => {
    if (!maHieu.trim()) {
      showNotification("Vui lòng nhập mã hiệu.");
      return;
    }

    const refMessage = ref(db, getFirebasePath("message"));
    set(refMessage, {
      "Lenh": "sendMaHieu",
      "TimeStamp": new Date().getTime().toString(),
      "DoiTuong": maHieu.trim()
    }).then(() => {
      showNotification(`Đã gửi mã hiệu: ${maHieu.trim()}`);
      setMaHieu(""); // Clear input after sending
    }).catch((error) => {
      console.error("Lỗi khi gửi mã hiệu:", error);
      showNotification("Không thể gửi mã hiệu.");
    });
  };

  // Firebase key management functions
  const showFirebaseKeyDialog = () => {
    setFirebaseKey(currentFirebaseKey);
    setIsKeyModalVisible(true);
  };

  const saveFirebaseKey = () => {
    // Key validation: alphanumeric, underscore, hyphen only, max 20 chars
    const keyRegex = /^[a-zA-Z0-9_-]{1,20}$/;

    if (!firebaseKey.trim()) {
      showNotification("Firebase key không được để trống.");
      return;
    }

    if (!keyRegex.test(firebaseKey.trim())) {
      showNotification("Firebase key chỉ được chứa chữ, số, dấu gạch dưới và gạch ngang (tối đa 20 ký tự).");
      return;
    }

    const newKey = firebaseKey.trim();
    chrome.storage.local.set({ firebase_key: newKey }, () => {
      setCurrentFirebaseKey(newKey);
      setIsKeySetupComplete(true);
      setIsKeyModalVisible(false);
      showNotification(`Đã lưu Firebase key: ${newKey}`);

      // Reload page to apply new Firebase paths
      window.location.reload();
    });
  };

  const clearFirebaseKey = () => {
    chrome.storage.local.remove(['firebase_key'], () => {
      setCurrentFirebaseKey("");
      setFirebaseKey("");
      setIsKeySetupComplete(false);
      setIsKeyModalVisible(false);
      showNotification("Đã xóa Firebase key. Sử dụng path mặc định.");

      // Reload page to apply default Firebase paths
      window.location.reload();
    });
  };

  const getFirebaseStatus = () => {
    if (currentFirebaseKey) {
      return {
        status: "active",
        message: `🔑 Firebase Key: ${currentFirebaseKey}`,
        style: { backgroundColor: '#f6ffed', border: '1px solid #b7eb8f', color: '#389e0d' }
      };
    } else {
      return {
        status: "warning",
        message: "⚠️ Chưa cấu hình Firebase key",
        style: { backgroundColor: '#fff7e6', border: '1px solid #ffd591', color: '#d46b08' }
      };
    }
  };

  const showNotification = (message: string) => {
    // Set time only show 800ms
    chrome.notifications.create({
      message: message,
      title: "Thông báo",
      type: "basic",
      iconUrl: "128.jpg",
    }, (notificationId) => {
      // Auto clear after 800ms
      setTimeout(() => {
        chrome.notifications.clear(notificationId);
      }, 2000);
    });
  };

  // ✅ NEW: Upload CCCD Queue to Firebase
  const uploadCCCDQueue = async (cccdList: CCCDInfo[]) => {
    try {
      const refQueue = ref(db, getFirebasePath("cccdQueue"));
      
      // Clear existing queue first
      await remove(refQueue);
      
      // Upload each CCCD
      for (const cccd of cccdList) {
        await push(refQueue, cccd);
      }
      
      // Reset currentIndex
      const refIndex = ref(db, getFirebasePath("currentIndex"));
      await set(refIndex, 0);
      
      showNotification(`✅ Đã tải lên ${cccdList.length} CCCD`);
      console.log(`Uploaded ${cccdList.length} CCCD to Firebase`);
    } catch (error) {
      console.error("Error uploading CCCD queue:", error);
      showNotification("❌ Lỗi khi tải lên Firebase");
    }
  };

  // ✅ NEW: Process Next CCCD
  const processNextCCCD = async () => {
    // ✅ CRITICAL FIX: Check global lock trước
    if (processingLockRef.current) {
      console.log("⚠️ Processing locked, another CCCD is being processed. Skip...");
      return;
    }

    if (isProcessing) {
      console.log("Already processing, skip...");
      return;
    }

    try {
      // ✅ Set global lock NGAY LẬP TỨC
      processingLockRef.current = true;
      setIsProcessing(true);
      console.log("🔒 Processing lock acquired");
      
      // 1️⃣ Kiểm tra auto-run state
      const refAuto = ref(db, getFirebasePath("cccdauto"));
      const autoSnapshot = await get(refAuto);
      
      if (!autoSnapshot.val()) {
        console.log("Auto-run is OFF, stopping...");
        showNotification("🛑 Đã dừng tự động");
        releaseLock();
        return;
      }

      // 2️⃣ Lấy danh sách CCCD
      const refQueue = ref(db, getFirebasePath("cccdQueue"));
      const queueSnapshot = await get(refQueue);
      
      if (!queueSnapshot.exists()) {
        console.log("Queue is empty");
        showNotification("✅ Đã xử lý hết danh sách");
        
        // Tắt auto-run
        await set(refAuto, false);
        releaseLock();
        return;
      }

      const queueObj = queueSnapshot.val();
      const cccdList = Object.entries(queueObj).map(([key, value]: [string, any]) => ({
        key,
        ...value
      }));
      
      // 3️⃣ Sắp xếp theo createdAt (thay vì index)
      cccdList.sort((a, b) => {
        const timeA = new Date(a.createdAt || 0).getTime();
        const timeB = new Date(b.createdAt || 0).getTime();
        return timeA - timeB;
      });

      // 4️⃣ Tìm CCCD đầu tiên có status "pending"
      const nextCCCD = cccdList.find((cccd) => cccd.status === "pending");

      if (!nextCCCD) {
        console.log("No pending CCCD found");
        showNotification("✅ Đã xử lý hết danh sách");
        
        // Tắt auto-run
        await set(refAuto, false);
        releaseLock();
        return;
      }

      // 5️⃣ Cập nhật status thành "processing"
      const cccdKey = (nextCCCD as any).key;
      const refCCCDStatus = ref(db, getFirebasePath(`cccdQueue/${cccdKey}/status`));
      await set(refCCCDStatus, "processing");

      // 6️⃣ Cập nhật currentIndex (cho UI display - dựa vào vị trí trong mảng đã sort)
      const currentIdx = cccdList.findIndex((c) => c.key === cccdKey);
      const refIndex = ref(db, getFirebasePath("currentIndex"));
      await set(refIndex, currentIdx);

      // 7️⃣ Xử lý CCCD
      console.log("Processing CCCD:", nextCCCD);
      await sendMessageToCurrentTab(nextCCCD, cccdKey);
      
      // ✅ Lock sẽ được release trong sendMessageToCurrentTab sau khi hoàn thành

    } catch (error) {
      console.error("Error processing next CCCD:", error);
      showNotification("❌ Lỗi khi xử lý CCCD tiếp theo");
      releaseLock();
    }
  };

  // ✅ NEW: Update CCCD Status
  const updateCCCDStatus = async (
    cccdKey: string, 
    status: 'completed' | 'error', 
    errorReason?: string
  ) => {
    try {
      const refStatus = ref(db, getFirebasePath(`cccdQueue/${cccdKey}/status`));
      await set(refStatus, status);
      
      const refProcessedAt = ref(db, getFirebasePath(`cccdQueue/${cccdKey}/processedAt`));
      await set(refProcessedAt, new Date().toISOString());
      
      if (errorReason) {
        const refErrorReason = ref(db, getFirebasePath(`cccdQueue/${cccdKey}/errorReason`));
        await set(refErrorReason, errorReason);
      }
      
      console.log(`Updated CCCD ${cccdKey} status to ${status}`);
    } catch (error) {
      console.error("Error updating CCCD status:", error);
    }
  };

  // ✅ NEW: Generate Random CCCD List
  const handleGenerateRandomCCCD = async () => {
    const cccdList = generateCCCDList(50);
    await uploadCCCDQueue(cccdList);
  };

  // ✅ NEW: Start Auto-run
  const handleStartAutoRun = async () => {
    const refAuto = ref(db, getFirebasePath("cccdauto"));
    await set(refAuto, true);
    
    showNotification("▶️ Đã bật Auto-run");
    
    // Trigger xử lý ngay
    processNextCCCD();
  };

  // ✅ NEW: Stop Auto-run
  const handleStopAutoRun = async () => {
    const refAuto = ref(db, getFirebasePath("cccdauto"));
    await set(refAuto, false);
    
    showNotification("⏸️ Đã tắt Auto-run");
  };

  // ✅ NEW: Navigate to Previous CCCD
  const handleNavigatePrevious = async () => {
    if (currentIndex > 0) {
      const refIndex = ref(db, getFirebasePath("currentIndex"));
      await set(refIndex, currentIndex - 1);
      // showNotification(`← Chuyển về CCCD #${currentIndex}`);
    }
  };

  // ✅ NEW: Navigate to Next CCCD
  const handleNavigateNext = async () => {
    const cccdList = Object.values(queueData);
    if (currentIndex < cccdList.length - 1) {
      const refIndex = ref(db, getFirebasePath("currentIndex"));
      await set(refIndex, currentIndex + 1);
      // showNotification(`→ Chuyển sang CCCD #${currentIndex + 2}`);
    }
  };

  // ✅ NEW: Process Current CCCD (manual single process)
  const handleProcessCurrent = async () => {
    if (isProcessing) {
      showNotification("⚠️ Đang xử lý, vui lòng đợi");
      return;
    }

    try {
      setIsProcessing(true);
      
      // Get current CCCD from queue
      const refQueue = ref(db, getFirebasePath("cccdQueue"));
      const queueSnapshot = await get(refQueue);
      
      if (!queueSnapshot.exists()) {
        showNotification("❌ Không có CCCD trong hàng đợi");
        setIsProcessing(false);
        return;
      }

      const queueObj = queueSnapshot.val();
      const cccdList = Object.entries(queueObj).map(([key, value]: [string, any]) => ({
        key,
        ...value
      }));
      
      // Sắp xếp theo createdAt
      cccdList.sort((a, b) => {
        const timeA = new Date(a.createdAt || 0).getTime();
        const timeB = new Date(b.createdAt || 0).getTime();
        return timeA - timeB;
      });

      // Tìm CCCD theo vị trí currentIndex trong mảng đã sort
      const currentCCCDItem = cccdList[currentIndex];

      if (!currentCCCDItem) {
        showNotification("❌ Không tìm thấy CCCD tại vị trí hiện tại");
        setIsProcessing(false);
        return;
      }

      // Update status to processing
      const cccdKey = (currentCCCDItem as any).key;
      const refCCCDStatus = ref(db, getFirebasePath(`cccdQueue/${cccdKey}/status`));
      await set(refCCCDStatus, "processing");

      // Process the CCCD
      console.log("Processing current CCCD:", currentCCCDItem);
      showNotification(`⚡ Đang xử lý: ${currentCCCDItem.Name}`);
      
      await sendMessageToCurrentTab(currentCCCDItem, cccdKey);

    } catch (error) {
      console.error("Error processing current CCCD:", error);
      showNotification("❌ Lỗi khi xử lý CCCD");
      setIsProcessing(false);
    }
  };

  // ✅ NEW: Clear Queue
  const handleClearQueue = async () => {
    Modal.confirm({
      title: 'Xác nhận xóa hàng đợi',
      content: 'Bạn có chắc chắn muốn xóa toàn bộ hàng đợi?',
      okText: 'Xóa',
      cancelText: 'Hủy',
      okButtonProps: { danger: true },
      onOk: async () => {
        try {
          const refQueue = ref(db, getFirebasePath("cccdQueue"));
          await remove(refQueue);
          
          const refIndex = ref(db, getFirebasePath("currentIndex"));
          await set(refIndex, 0);
          
          showNotification("✅ Đã xóa hàng đợi");
        } catch (error) {
          console.error("Error clearing queue:", error);
          showNotification("❌ Lỗi khi xóa hàng đợi");
        }
      }
    });
  };

  // ✅ HÀM MỚI: Polling storage để đợi kết quả modal detection
  // Unused function - may be used later for modal detection
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
    
    // Cleanup trên timeout
    await chrome.storage.session.remove(['waitingForModalTab']);
    
    return false;
  };

  const handleGetDataFromPNS = async () => {
    // Test automation với data mẫu
    await sendMessageToCurrentTab({
      Name: "Nguyễn Văn A",
      NgaySinh: "01/01/1990",
      Id: "001234567890"
    }, undefined);
  };

  const sendMessageToCurrentTab = async (data: any, cccdKey?: string, retryWithMaHoSo: boolean = false) => {
    try {
      const tabs = await chrome.tabs.query({});

      // Tìm tab đầu tiên có URL bắt đầu bằng https://hanhchinhcong.vnpost.vn/
      const targetTab = tabs.find(tab =>
        tab.url && tab.url.startsWith("https://hanhchinhcong.vnpost.vn/giaodich/xac-nhan-all")
      );

      if (!targetTab || !targetTab.id) {
        console.log("Không tìm thấy tab có URL bắt đầu bằng https://hanhchinhcong.vnpost.vn/giaodich/xac-nhan-all");
        showNotification("Không tìm thấy trang CCCD VNPost đang mở");
        releaseLock();
        return;
      }

      const tabId = targetTab.id;

      // Encode the HoTen and NgaySinh parameters
      const hoTenEncoded = encodeURIComponent(data.Name || "");
      const ngaySinhEncoded = encodeURIComponent(data.NgaySinh || "");
      const maHoSoEncoded = encodeURIComponent(data.Id || "");
      
      // Tạo ngày hôm nay với format dd/MM/yyyy (NgayKetThuc)
      const today = new Date();
      const day = String(today.getDate()).padStart(2, '0');
      const month = String(today.getMonth() + 1).padStart(2, '0'); // Tháng bắt đầu từ 0
      const year = today.getFullYear();
      const ngayKetThuc = `${day}/${month}/${year}`; // Format: dd/MM/yyyy
      const ngayKetThucEncoded = encodeURIComponent(ngayKetThuc);

      // Tính NgayBatDau = NgayKetThuc - 2 tháng
      const startDate = new Date(today);
      startDate.setMonth(startDate.getMonth() - 2);
      const startDay = String(startDate.getDate()).padStart(2, '0');
      const startMonth = String(startDate.getMonth() + 1).padStart(2, '0');
      const startYear = startDate.getFullYear();
      const ngayBatDau = `${startDay}/${startMonth}/${startYear}`;
      const ngayBatDauEncoded = encodeURIComponent(ngayBatDau);

      // Build URL based on retry mode
      let newUrl: string;
      if (retryWithMaHoSo) {
        // 🔄 RETRY: Search by MaHoSo (CCCD ID)
        console.log("🔄 Retry with MaHoSo:", data.Id);
        newUrl = `https://hanhchinhcong.vnpost.vn/giaodich/xac-nhan-all?NhomThuTuc=NTT00002&MaThuTuc=TT0000007&HoTen=&NgaySinh=&DienThoai=&MaHoSo=${maHoSoEncoded}&MaBuuGui=&NgayBatDau=${ngayBatDauEncoded}&NgayKetThuc=${ngayKetThucEncoded}&QRcode=`;
      } else {
        // 🔍 FIRST TRY: Search by HoTen + NgaySinh
        console.log("🔍 First try with HoTen + NgaySinh:", data.Name, data.NgaySinh);
        newUrl = `https://hanhchinhcong.vnpost.vn/giaodich/xac-nhan-all?NhomThuTuc=NTT00002&MaThuTuc=TT0000007&HoTen=${hoTenEncoded}&NgaySinh=${ngaySinhEncoded}&DienThoai=&MaHoSo=&MaBuuGui=&NgayBatDau=${ngayBatDauEncoded}&NgayKetThuc=${ngayKetThucEncoded}&QRcode=`;
      }

      // Update the tab URL
      await chrome.tabs.update(tabId, { url: newUrl });
      console.log("Tab URL updated successfully:", newUrl);

      // ❌ KHÔNG set flag ở đây - sẽ trigger background ở lần load đầu tiên (chưa có modal)
      // Flag sẽ được set TRONG executeScript, TRƯỚC khi form.submit()

      // Đợi trang load xong
      await new Promise<void>((resolve) => {
        const listener = (updatedTabId: number, changeInfo: chrome.tabs.TabChangeInfo) => {
          if (updatedTabId === tabId && changeInfo.status === 'complete') {
            chrome.tabs.onUpdated.removeListener(listener);
            resolve();
          }
        };
        chrome.tabs.onUpdated.addListener(listener);

        // Timeout sau 10s nếu không load xong
        setTimeout(() => {
          chrome.tabs.onUpdated.removeListener(listener);
          resolve();
        }, 10000);
      });

      console.log("Page loaded, executing automation script...");

      // Thực thi script automation: check checkbox và click submit
      // Unused type - may be used later
      type AutomationResult = {
        success: boolean;
        reason: string;
        name?: string;
        message?: string;
        error?: string;
      };

      const result = await chrome.scripting.executeScript({
        target: { tabId },
        func: (): Promise<AutomationResult> => {
          return new Promise((resolve) => {
            // Helper function: đợi element xuất hiện
            function waitForElement(selector: string, timeout = 5000): Promise<Element | null> {
              return new Promise((resolveWait) => {
                const element = document.querySelector(selector);
                if (element) {
                  resolveWait(element);
                  return;
                }

                const observer = new MutationObserver(() => {
                  const el = document.querySelector(selector);
                  if (el) {
                    observer.disconnect();
                    resolveWait(el);
                  }
                });

                observer.observe(document.body, {
                  childList: true,
                  subtree: true,
                });

                setTimeout(() => {
                  observer.disconnect();
                  resolveWait(null);
                }, timeout);
              });
            }

            // Helper: check for "Không tìm thấy kết quả"
            function waitForNoResultText(timeout = 5000): Promise<boolean> {
              return new Promise((resolveWait) => {
                const checkText = () => {
                  const bodyDiv = document.querySelector("#listTbody");
                  if (bodyDiv) {
                    const textContent = bodyDiv.textContent || '';
                    if (textContent.includes("Không tìm thấy kết quả")) {
                      return true;
                    }
                  }
                  return false;
                };

                if (checkText()) {
                  resolveWait(true);
                  return;
                }

                const observer = new MutationObserver(() => {
                  if (checkText()) {
                    observer.disconnect();
                    resolveWait(true);
                  }
                });

                observer.observe(document.body, {
                  childList: true,
                  subtree: true,
                  characterData: true
                });

                setTimeout(() => {
                  observer.disconnect();
                  resolveWait(false);
                }, timeout);
              });
            }

            // Main automation logic
            (async () => {
              try {
                // Race giữa checkbox xuất hiện và text "Không tìm thấy kết quả"
                const raceResult = await Promise.race([
                  waitForElement("#listTbody tr td div input").then(el => ({ type: 'checkbox' as const, element: el })),
                  waitForNoResultText().then(found => ({ type: 'noResult' as const, found }))
                ]);

                if (raceResult.type === 'noResult') {
                  // Không tìm thấy kết quả
                  const hoTenInput = document.querySelector("#HoTen") as HTMLInputElement;
                  const textTen = hoTenInput?.value || "";
                  resolve({
                    success: false,
                    reason: 'not_found',
                    name: textTen
                  });
                  return;
                }

                if (raceResult.type === 'checkbox') {
                  const checkbox = raceResult.element as HTMLInputElement;

                  // Check checkbox
                  checkbox.checked = true;
                  checkbox.dispatchEvent(new Event('change', { bubbles: true }));

                  console.log("✓ Checkbox checked");

                  // Đợi một chút cho UI update
                  await new Promise(r => setTimeout(r, 300));

                  // Kiểm tra submit button
                  const submitButton = document.getElementById("sub_xacnhan") as HTMLButtonElement;

                  if (submitButton && !submitButton.disabled) {
                    // Không click button nữa, thay vào đó BYPASS confirm và submit form trực tiếp
                    console.log("� Bypassing button click - executing form logic directly");

                    // Lấy danh sách giao dịch IDs từ các checkbox đã chọn (giống logic trong trang web)
                    const giaoDichIds: string[] = [];
                    const checkboxes = document.querySelectorAll('.inputCheckBox:checked');

                    // Kiểm tra số lượng checkbox - chỉ nên có 1
                    if (checkboxes.length === 0) {
                      console.warn("⚠️ No checkboxes found");
                      resolve({
                        success: false,
                        reason: 'no_checkbox_selected',
                        message: 'No checkboxes are checked'
                      });
                      return;
                    }

                    if (checkboxes.length > 1) {
                      console.warn("⚠️ Multiple records found:", checkboxes.length);
                      resolve({
                        success: false,
                        reason: 'multiple_records',
                        message: `Found ${checkboxes.length} records - expected only 1`
                      });
                      return;
                    }

                    checkboxes.forEach((checkbox: any) => {
                      const giaoDichId = checkbox.value;
                      if (giaoDichId) {
                        giaoDichIds.push(giaoDichId);
                      }
                    });

                    console.log("📋 Collected giaoDichIds:", giaoDichIds);

                    // Cập nhật input hidden trong form (giống code trang web)
                    const giaoDichIdsInput = document.querySelector('#xacNhan-form input[name="giaoDichIds"]') as HTMLInputElement;
                    if (giaoDichIdsInput) {
                      giaoDichIdsInput.value = giaoDichIds.join(',');
                      console.log("✅ Updated giaoDichIds input:", giaoDichIdsInput.value);
                    }

                    // ✅ KHÔNG submit ngay - return success để options page set flag trước
                    const form = document.getElementById('xacNhan-form') as HTMLFormElement;
                    if (form) {
                      console.log("✅ Form ready to submit (waiting for flag to be set)...");
                      resolve({
                        success: true,
                        reason: 'ready_to_submit'  // ← Changed from 'submitted'
                      });
                    } else {
                      resolve({
                        success: false,
                        reason: 'form_not_found',
                        message: 'Could not find xacNhan-form'
                      });
                    }
                  } else {
                    resolve({
                      success: false,
                      reason: 'submit_disabled',
                      message: 'Submit button is disabled or not found'
                    });
                  }
                } else {
                  resolve({
                    success: false,
                    reason: 'timeout',
                    message: 'Checkbox not found within timeout'
                  });
                }
              } catch (error) {
                resolve({
                  success: false,
                  reason: 'error',
                  error: String(error)
                });
              }
            })();
          });
        }
      });

      const scriptResult = result[0]?.result as AutomationResult | undefined;
      // const scriptResult = { success: true, name: 'Test User', message: 'Thong tin', reason: 'ready_to_submit' }; // For testing
      console.log("Automation result:", scriptResult);

      if (scriptResult) {
        if (scriptResult.success) {
          console.log("✅ Form ready to submit, setting flag NOW...");
          
          // ✅ Set flag TRƯỚC KHI submit
          await chrome.storage.session.set({ 
            waitingForModalTab: tabId,
            setAt: Date.now()
          });
          console.log(`✓ Session flag set for tabId: ${tabId}`);
          
          // // Đợi một chút để ensure flag được commit
          await new Promise(resolve => setTimeout(resolve, 100));
          
          // // ✅ BÂY GIỜ MỚI SUBMIT FORM
          console.log("📤 Submitting form NOW...");
          await chrome.scripting.executeScript({
            target: { tabId },
            func: () => {
              const form = document.getElementById('xacNhan-form') as HTMLFormElement;
              if (form) {
                console.log("✓ Submitting form...");
                form.submit();
                return true;
              }
              return false;
            }
          });

          console.log("✓ Form submitted, waiting for modal detection... with key " + cccdKey);

          // Background sẽ tự động inject modal detector khi tab reload xong
          
          // Đợi kết quả modal detection từ storage (polling)
          const modalDetected = await waitForModalResult();
          // const modalDetected = true;

          if (modalDetected) {
            // ✅ Update Firebase status nếu có cccdKey
            if (cccdKey) {
              await updateCCCDStatus(cccdKey, 'completed');
            }

            // Hiển thị thông báo thành công trên trang web
            await chrome.scripting.executeScript({
              target: { tabId },
              func: (name: string) => {
                // Tạo div thông báo
                const notification = document.createElement('div');
                notification.textContent = `✓ Đã xử lý thành công: ${name}`;
                notification.style.cssText = `
                  position: fixed;
                  bottom: 20px;
                  right: 20px;
                  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                  color: white;
                  padding: 16px 24px;
                  border-radius: 12px;
                  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
                  font-size: 16px;
                  font-weight: 600;
                  z-index: 10000;
                  animation: slideIn 0.4s ease-out, fadeOut 0.4s ease-in 2.6s;
                  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                `;
                
                // Thêm animation CSS
                const style = document.createElement('style');
                style.textContent = `
                  @keyframes slideIn {
                    from {
                      transform: translateX(400px);
                      opacity: 0;
                    }
                    to {
                      transform: translateX(0);
                      opacity: 1;
                    }
                  }
                  @keyframes fadeOut {
                    from {
                      opacity: 1;
                    }
                    to {
                      opacity: 0;
                    }
                  }
                `;
                document.head.appendChild(style);
                document.body.appendChild(notification);
                
                // Tự động xóa sau 3 giây
                setTimeout(() => {
                  notification.remove();
                  style.remove();
                }, 2000);
              },
              args: [data.Name || ""]
            });

            // ✅ Kiểm tra auto-run để tiếp tục
            if (cccdKey) {
              // ✅ Release lock TRƯỚC KHI tiếp tục
              releaseLock();
              
              const refAuto = ref(db, getFirebasePath("cccdauto"));
              const autoSnapshot = await get(refAuto);
              
              if (autoSnapshot.val()) {
                // Đợi 2 giây rồi xử lý tiếp
                setTimeout(() => processNextCCCD(), 200);
              } else {
                showNotification("🛑 Đã dừng (auto-run OFF)");
              }
            } else {
              // Legacy behavior: gửi message về Firebase
              const refMessage = ref(db, getFirebasePath("message"));
              await set(refMessage, {
                "Lenh": "continueCCCD",
                "TimeStamp": new Date().getTime().toString(),
                "DoiTuong": ""
              });
            }
          } else {
            showNotification(`⚠ Không phát hiện modal xác nhận`);
            
            // ✅ Update error status nếu có cccdKey
            if (cccdKey) {
              await updateCCCDStatus(cccdKey, 'error', 'Modal not detected');
            }
            
            // ✅ Release lock VÔ ĐIỀU KIỆN
            releaseLock();
          }
        } else if (scriptResult.reason === 'not_found') {
          // 🔄 Kiểm tra xem đã retry với MaHoSo chưa
          if (!retryWithMaHoSo && data.Id) {
            console.log("⚠️ Not found with HoTen+NgaySinh, retrying with MaHoSo...");
            showNotification(`🔄 Không tìm thấy với tên, thử lại với CCCD...`);
            
            // 🔄 RETRY: Gọi lại hàm với flag retryWithMaHoSo = true
            // KHÔNG release lock ở đây, để retry tiếp tục
            await sendMessageToCurrentTab(data, cccdKey, true);
            return; // Early return để không release lock và không xử lý thêm
          }
          
          // ❌ Đã retry rồi mà vẫn không tìm thấy, hoặc không có MaHoSo để retry
          console.log("❌ Not found after retry (or no MaHoSo available)");
          showNotification(`✗ Không tìm thấy: ${scriptResult.name || data.Name || ""}`);

          // ✅ Update error status nếu có cccdKey
          if (cccdKey) {
            await updateCCCDStatus(cccdKey, 'error', 'Not found in system');
            
            // Thêm vào errorcccd
            const refError = ref(db, getFirebasePath("errorcccd/records"));
            await push(refError, {
              ...data,
              errorTimestamp: new Date().toISOString()
            });
            
            // Kiểm tra auto-run để tiếp tục
            const refAuto = ref(db, getFirebasePath("cccdauto"));
            const autoSnapshot = await get(refAuto);
            
            if (autoSnapshot.val()) {
              // Release lock TRƯỚC KHI tiếp tục
              releaseLock();
              setTimeout(() => processNextCCCD(), 2000);
              return; // Early return để không release 2 lần
            }
          } else {
            // Legacy behavior: gửi message về Firebase
            const refMessage = ref(db, getFirebasePath("message"));
            await set(refMessage, {
              "Lenh": "notFound",
              "TimeStamp": new Date().getTime().toString(),
              "DoiTuong": scriptResult.name || ""
            });
          }
          
          // ✅ Release lock VÔ ĐIỀU KIỆN
          releaseLock();
        } else if (scriptResult.reason === 'multiple_records') {
          showNotification(`⚠️ Tìm thấy nhiều bản ghi: ${scriptResult.message || ""}`);

          // ✅ Update error status nếu có cccdKey
          if (cccdKey) {
            await updateCCCDStatus(cccdKey, 'error', 'Multiple records found');
            
            // Kiểm tra auto-run để tiếp tục
            const refAuto = ref(db, getFirebasePath("cccdauto"));
            const autoSnapshot = await get(refAuto);
            
            if (autoSnapshot.val()) {
              // Release lock TRƯỚC KHI tiếp tục
              releaseLock();
              setTimeout(() => processNextCCCD(), 2000);
              return; // Early return để không release 2 lần
            }
          } else {
            // Legacy behavior: gửi message về Firebase - trường hợp trùng lặp
            const refMessage = ref(db, getFirebasePath("message"));
            await set(refMessage, {
              "Lenh": "multipleRecords",
              "TimeStamp": new Date().getTime().toString(),
              "DoiTuong": data.Name || ""
            });
          }
          
          // ✅ Release lock VÔ ĐIỀU KIỆN
          releaseLock();
        } else {
          showNotification(`⚠ Lỗi: ${scriptResult.message || scriptResult.reason}`);
          
          // ✅ Update error status nếu có cccdKey
          if (cccdKey) {
            await updateCCCDStatus(cccdKey, 'error', scriptResult.message || scriptResult.reason);
          }
          
          // ✅ Release lock VÔ ĐIỀU KIỆN
          releaseLock();
        }
      }

    } catch (error) {
      console.error("Error in sendMessageToCurrentTab:", error);
      showNotification("Có lỗi xảy ra khi xử lý");
      
      // ✅ CRITICAL: Release lock VÔ ĐIỀU KIỆN
      releaseLock();
    }
  };

  // ✅ NEW: Auto-update currentCCCD when queueData or currentIndex changes
  useEffect(() => {
    console.log("📍 Updating currentCCCD - Index:", currentIndex, "Queue size:", Object.keys(queueData).length);
    
    if (Object.keys(queueData).length === 0) {
      setCurrentCCCD(null);
      return;
    }

    const cccdList = Object.entries(queueData).map(([key, value]: [string, any]) => ({
      key,
      ...value
    }));
    
    // Sắp xếp theo createdAt (giống Flutter)
    cccdList.sort((a, b) => {
      const timeA = new Date(a.createdAt || 0).getTime();
      const timeB = new Date(b.createdAt || 0).getTime();
      return timeA - timeB;
    });
    
    // Lấy CCCD theo vị trí currentIndex
    if (cccdList[currentIndex]) {
      console.log("✅ Updated currentCCCD:", cccdList[currentIndex].Name, "Status:", cccdList[currentIndex].status);
      setCurrentCCCD(cccdList[currentIndex]);
    } else {
      console.warn("⚠️ No CCCD found at index:", currentIndex);
      setCurrentCCCD(null);
    }
  }, [queueData, currentIndex]); // ← Chạy mỗi khi queue hoặc index thay đổi

  // Firebase listeners effect - chỉ chạy sau khi currentFirebaseKey đã được load
  useEffect(() => {
    // Đợi cho đến khi Chrome storage đã load xong
    // currentFirebaseKey sẽ là "" (empty) hoặc có giá trị thực
    // isKeySetupComplete sẽ cho biết đã hoàn thành việc load từ storage chưa

    console.log("Firebase effect triggered. Key:", currentFirebaseKey, "Setup complete:", isKeySetupComplete);

    // Tạo Firebase refs với key hiện tại (có thể là "" cho default path)
    const refCCCD = ref(db, getFirebasePath("cccd"));
    const refIsAuto = ref(db, getFirebasePath("cccdauto"));
    const refErrorRecords = ref(db, getFirebasePath("errorcccd/records"));
    
    // ✅ NEW: Queue management refs
    const refQueue = ref(db, getFirebasePath("cccdQueue"));
    const refIndex = ref(db, getFirebasePath("currentIndex"));

    console.log("Firebase paths:", {
      cccd: getFirebasePath("cccd"),
      auto: getFirebasePath("cccdauto"),
      error: getFirebasePath("errorcccd/records"),
      queue: getFirebasePath("cccdQueue"),
      index: getFirebasePath("currentIndex")
    });

    let isFirstRun = true;
    let isFirstErrorRun = true;
    let isFirstAutoRun = true;

    const unsubcribeCCCD = onValue(refCCCD, (snapshot) => {
      const data = snapshot.val();
      console.log("CCCD data received:", data, "with key:", currentFirebaseKey);

      if (isFirstRun) {
        isFirstRun = false;
        return;
      } else {
        // ✅ CRITICAL FIX: Skip nếu đang xử lý queue
        if (processingLockRef.current) {
          console.log("⚠️ Processing lock active, skipping legacy cccd listener");
          return;
        }
        
        if (data && data.Name != "") {
          sendMessageToCurrentTab(data, undefined);
        } else {
          console.log("Không có dữ liệu CCCD để gửi");
        }
      }
    });

    const unsubscribeIsAuto = onValue(refIsAuto, async (snapshot) => {
      const data = snapshot.val();
      console.log("🚀 Auto state received:", data, "with key:", currentFirebaseKey);

      if (isFirstAutoRun) {
        isFirstAutoRun = false;
        setIsAutoRunning(!!data);
        
        // ✅ Nếu auto đã ON từ trước (Flutter đã bật), trigger ngay
        if (data) {
          console.log("🚀 Auto is already ON on first load, triggering processNextCCCD...");
          // Đợi một chút để đảm bảo queueData đã load
          setTimeout(() => {
            processNextCCCD();
          }, 500);
        }
        return;
      }
      
      setIsAutoRunning(!!data);
      
      // ✅ CRITICAL FIX: Auto-trigger processing khi auto được bật (giống Flutter)
      if (data) {
        console.log("🚀 Auto-run enabled from Firebase, checking queue...");
        
        // Đọc queue từ Firebase để tránh stale state
        try {
          const queueSnapshot = await get(refQueue);
          const hasQueue = queueSnapshot.exists() && Object.keys(queueSnapshot.val() || {}).length > 0;
          
          console.log("📊 Queue check:", { hasQueue, queueSize: hasQueue ? Object.keys(queueSnapshot.val()).length : 0 });
          
          if (hasQueue) {
            console.log("✅ Queue available, triggering processNextCCCD...");
            // Đợi một chút để UI update
            setTimeout(() => {
              processNextCCCD();
            }, 300);
          } else {
            console.log("⚠️ No queue available yet");
          }
        } catch (error) {
          console.error("❌ Error checking queue:", error);
        }
      } else {
        console.log("⏸️ Auto-run disabled");
      }
    });

    const unsubscribeErrorRecords = onValue(refErrorRecords, (snapshot) => {
      const data = snapshot.val();
      console.log("Error records received:", data, "with key:", currentFirebaseKey);

      if (isFirstErrorRun) {
        isFirstErrorRun = false;
        if (data) setErrorRecords(data);
        return;
      }

      console.log("Đã nhận được cập nhật dữ liệu lỗi:", data);
      setErrorRecords(data);

      if (data) {
        const recordCount = Object.keys(data).length;
        showNotification(`Đã đồng bộ ${recordCount} bản ghi lỗi.`);
      }
    });

    // ✅ NEW: Listen to queue changes
    const unsubscribeQueue = onValue(refQueue, (snapshot) => {
      const data = snapshot.val();
      console.log("📊 Queue data received:", data ? Object.keys(data).length + " items" : "empty");
      
      if (data) {
        setQueueData(data);
      } else {
        setQueueData({});
      }
    });

    // ✅ NEW: Listen to currentIndex changes
    const unsubscribeIndex = onValue(refIndex, (snapshot) => {
      const idx = snapshot.val();
      console.log("📍 Current index from Firebase:", idx);
      
      setCurrentIndex(idx || 0);
      // currentCCCD sẽ được cập nhật tự động bởi useEffect bên trên
    });

    // Không còn cần message listener vì automation được xử lý trực tiếp trong sendMessageToCurrentTab
    // Tất cả logic automation giờ chạy qua chrome.scripting.executeScript

    return () => {
      console.log("Cleaning up Firebase listeners for key:", currentFirebaseKey);
      unsubcribeCCCD();
      unsubscribeIsAuto();
      unsubscribeErrorRecords();
      unsubscribeQueue();
      unsubscribeIndex();
    }
  }, [currentFirebaseKey]); // Chỉ depend vào currentFirebaseKey

  // Prepare error table data & columns
  // Tìm vị trí CCCD trong queueData (dựa vào Id)
  const queueList = Object.values(queueData || {});
  const errorData = errorRecords
    ? Object.entries(errorRecords).map(([key, record]: [string, any], index) => {
        const cccdIndex = queueList.findIndex((item: any) => item.Id === record.Id);
        return {
          key,
          stt: index + 1,
          viTri: cccdIndex >= 0 ? cccdIndex + 1 : '',
          Id: record.Id || "",
          Name: record.Name || "",
          NgaySinh: record.NgaySinh || "",
          gioiTinh: record.gioiTinh || "",
          DiaChi: record.DiaChi || "",
          errorTimestamp: record.errorTimestamp || "",
        };
      })
    : [];

  const errorColumns = [
    { title: 'STT', dataIndex: 'stt', key: 'stt', width: 70 },
    { title: 'Vị trí lỗi', dataIndex: 'viTri', key: 'viTri', width: 120 },
    { title: 'CCCD', dataIndex: 'Id', key: 'Id' },
    { title: 'Họ tên', dataIndex: 'Name', key: 'Name' },
    { title: 'Ngày sinh', dataIndex: 'NgaySinh', key: 'NgaySinh' },
    {
      title: 'Giới tính',
      dataIndex: 'gioiTinh',
      key: 'gioiTinh',
      render: (val: string) => (val ? <Tag color="blue">{val}</Tag> : null),
    },
    { title: 'Địa chỉ', dataIndex: 'DiaChi', key: 'DiaChi' },
    { title: 'Thời gian lỗi', dataIndex: 'errorTimestamp', key: 'errorTimestamp', width: 160 },
  ];

  return (
    <div className="m-5">
      <Space direction="vertical" style={{ width: '100%' }}>
        {/* Firebase Key Management Section */}
        <div style={{
          padding: '12px',
          borderRadius: '6px',
          ...getFirebaseStatus().style
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '13px', fontWeight: 'bold' }}>
              {getFirebaseStatus().message}
            </span>
            {isKeySetupComplete ? (
              <Button
                size="small"
                type="text"
                icon={<EditOutlined />}
                onClick={showFirebaseKeyDialog}
              >
                Sửa
              </Button>
            ) : (
              <Button
                size="small"
                type="primary"
                icon={<PlusOutlined />}
                onClick={showFirebaseKeyDialog}
              >
                Thêm Key
              </Button>
            )}
          </div>
        </div>

        {/* ✅ NEW: Queue Status Panel */}
        <QueueStatusPanel queueData={queueData} />

        {/* ✅ NEW: Current CCCD Display */}
        <CurrentCCCDDisplay currentCCCD={currentCCCD} currentIndex={currentIndex} />

        {/* ✅ NEW: Auto-run Controls */}
        <AutoRunControls
          isAutoRunning={isAutoRunning}
          isPending={isProcessing}
          currentIndex={currentIndex}
          totalCount={Object.keys(queueData).length}
          onStartAuto={handleStartAutoRun}
          onStopAuto={handleStopAutoRun}
          onNavigatePrevious={handleNavigatePrevious}
          onNavigateNext={handleNavigateNext}
          onProcessCurrent={handleProcessCurrent}
          onGenerateRandom={handleGenerateRandomCCCD}
          onClearQueue={handleClearQueue}
          hasQueue={Object.keys(queueData).length > 0}
        />

        <Space>
          {/* <Button
            onClick={handleGetDataFromPNS}
            type="primary"
            icon={<RedoOutlined />}
          >
            Test Chạy
          </Button> */}
          {/* THAY ĐỔI: Nút sao chép dữ liệu */}
          <Button
            onClick={handleCopyData}
            type="primary"
            icon={<CopyOutlined />}
            disabled={!errorRecords || Object.keys(errorRecords).length === 0}
          >
            Sao chép Lỗi
          </Button>
          {/* MỚI: Nút xóa danh sách lỗi */}
          <Button
            onClick={handleClearErrorRecords}
            danger
            icon={<DeleteOutlined />}
            disabled={!errorRecords || Object.keys(errorRecords).length === 0}
          >
            Xóa Lỗi
          </Button>
        </Space>

        {/* MỚI: Section gửi mã hiệu */}
        <Space direction="vertical" style={{ width: '100%' }}>
          <h4 style={{ margin: '10px 0 5px 0', fontSize: '14px', fontWeight: 'bold' }}>Gửi Mã Hiệu / Tìm vị trí theo tên</h4>
          <Space style={{ width: '100%' }}>
            <Input
              placeholder="Nhập mã hiệu..."
              value={maHieu}
              onChange={(e) => setMaHieu(e.target.value)}
              onPressEnter={handleSendMaHieu}
              style={{ flex: 1, width: 180 }}
            />
            <Button
              onClick={handleSendMaHieu}
              type="primary"
              icon={<SendOutlined />}
              disabled={!maHieu.trim()}
            >
              Gửi Mã Hiệu
            </Button>

            {/* Input tìm vị trí theo tên */}
            <AutoComplete
              options={nameOptions}
              filterOption={(inputValue, option) =>
                (option?.value || '').toLowerCase().includes(inputValue.toLowerCase())
              }
              value={searchName}
              onChange={setSearchName}
              onSelect={val => setSearchName(val)}
              style={{ flex: 1, width: 180 }}
              placeholder="Nhập tên cần tìm..."
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  const list = Object.values(queueData || {});
                  const idx = list.findIndex(
                    (item: any) => (item.Name || "").trim().toLowerCase() === searchName.trim().toLowerCase()
                  );
                  if (idx >= 0) setSearchResult({ index: idx + 1, cccd: list[idx] });
                  else setSearchResult(null);
                }
              }}
            />
            <Button
              onClick={() => {
                const list = Object.values(queueData || {});
                const idx = list.findIndex(
                  (item: any) => (item.Name || "").trim().toLowerCase() === searchName.trim().toLowerCase()
                );
                if (idx >= 0) setSearchResult({ index: idx + 1, cccd: list[idx] });
                else setSearchResult(null);
              }}
              type="default"
              disabled={!searchName.trim()}
            >
              Tìm vị trí
            </Button>
          </Space>
          {/* Hiển thị kết quả tìm kiếm */}
          {searchName.trim() && (
            <div style={{ fontSize: 13, marginTop: 4 }}>
              {searchResult
                ? <span>Vị trí: <b>{searchResult.index}</b> | CCCD: <b>{searchResult.cccd.Id}</b> | Ngày sinh: <b>{searchResult.cccd.NgaySinh}</b></span>
                : <span style={{ color: 'red' }}>Không tìm thấy tên trong danh sách CCCD</span>
              }
            </div>
          )}
        </Space>

        {errorRecords && (
          <div style={{ width: '100%' }}>
            <h3 style={{ marginTop: '15px' }}>Danh sách lỗi đã đồng bộ:</h3>

            <div style={{ width: '100%', overflowX: 'auto' }}>
              <Table
                dataSource={errorData}
                columns={errorColumns}
                pagination={{ pageSize: 20 }}
                size="small"
                bordered
                scroll={{ x: 'max-content', y: 500 }}
                style={{ minWidth: 700 }}
              />
            </div>
          </div>
        )}
      </Space>

      {/* Firebase Key Configuration Modal */}
      <Modal
        title="Cấu hình Firebase Key"
        open={isKeyModalVisible}
        onOk={saveFirebaseKey}
        onCancel={() => setIsKeyModalVisible(false)}
        okText="Lưu"
        cancelText="Hủy"
        footer={[
          currentFirebaseKey && (
            <Button
              key="clear"
              danger
              onClick={clearFirebaseKey}
              style={{ float: 'left' }}
            >
              Xóa Key
            </Button>
          ),
          <Button key="cancel" onClick={() => setIsKeyModalVisible(false)}>
            Hủy
          </Button>,
          <Button key="save" type="primary" onClick={saveFirebaseKey}>
            Lưu
          </Button>
        ]}
      >
        <Space direction="vertical" style={{ width: '100%' }}>
          {currentFirebaseKey && (
            <div>
              <strong>Key hiện tại:</strong> {currentFirebaseKey}
            </div>
          )}
          <div>
            <strong>Key mới:</strong>
            <Input
              placeholder="Nhập Firebase key (ví dụ: user123, room001)"
              value={firebaseKey}
              onChange={(e) => setFirebaseKey(e.target.value)}
              maxLength={20}
              style={{ marginTop: '8px' }}
            />
            <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
              Chỉ được chứa chữ, số, dấu gạch dưới (_) và gạch ngang (-). Tối đa 20 ký tự.
            </div>
          </div>
        </Space>
      </Modal>
    </div>
  );
}
