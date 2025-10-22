import "../asserts/tailwind.css";
import { initializeApp } from "firebase/app";
import {
  getDatabase,
  ref,
  onValue,
  set,
} from "firebase/database";

// THAY ĐỔI: Thay đổi icon và loại bỏ xlsx
import { RedoOutlined, CopyOutlined, SendOutlined, EditOutlined, PlusOutlined } from "@ant-design/icons";
import { Button, Space, Input, Modal } from "antd";
import { useEffect, useState } from "react";

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
  const [currentFirebaseKey, setCurrentFirebaseKey] = useState("");
  const [isKeyModalVisible, setIsKeyModalVisible] = useState(false);
  const [isKeySetupComplete, setIsKeySetupComplete] = useState(false);

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

    // Chuyển đổi object thành mảng
    const data: any[] = Object.values(errorRecords);


    // Tạo các hàng dữ liệu, mỗi cột phân tách bằng TAB (\t)
    const dataRows = data.map((record) => {
      // Làm sạch dữ liệu đầu vào, loại bỏ ký tự xuống dòng có thể gây lỗi

      const cells = [
        record.errorIndex,
        record.maBuuGui,
        record.Id || '',
        record.Name || '',
        record.NgaySinh || '',
        record.gioiTinh || '',
        record.DiaChi || '',
        ,
      ];
      return cells.join('\t'); // Nối các ô bằng ký tự TAB
    });

    // Kết hợp tiêu đề và các hàng dữ liệu, mỗi hàng phân tách bằng ký tự xuống dòng (\n)
    const clipboardText = [
      ...dataRows
    ].join('\n');

    // Sử dụng Clipboard API để sao chép
    navigator.clipboard.writeText(clipboardText).then(() => {
      showNotification("Đã sao chép dữ liệu vào clipboard!");
    }).catch(err => {
      console.error("Lỗi khi sao chép: ", err);
      showNotification("Không thể sao chép dữ liệu.");
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
    chrome.notifications.create({
      message: message,
      title: "Thông báo",
      type: "basic",
      iconUrl: "128.jpg",
    });
  };







  const handleGetDataFromPNS = async () => { };

  const sendMessageToCurrentTab = (data: any) => {
    chrome.tabs.query({}, (tabs) => {
      // Tìm tab đầu tiên có URL bắt đầu bằng https://cccd.vnpost.vn/
      const targetTab = tabs.find(tab =>
        tab.url && tab.url.startsWith("https://hanhchinhcong.vnpost.vn/giaodich/xac-nhan-all")
      );

      if (!targetTab || !targetTab.id) {
        console.log("Không tìm thấy tab có URL bắt đầu bằng https://hanhchinhcong.vnpost.vn/giaodich/xac-nhan-all");
        showNotification("Không tìm thấy trang CCCD VNPost đang mở");
        return;
      }

      chrome.tabs.sendMessage(
        targetTab.id,
        { message: "ADDCCCD", data },
        (response) => {
          if (chrome.runtime.lastError) {
            console.log("Could not send message:", chrome.runtime.lastError.message);
          } else {
            console.log("Response from content ", response);
          }
        }
      );
    });
  };

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
    const refMessage = ref(db, getFirebasePath("message"));

    console.log("Firebase paths:", {
      cccd: getFirebasePath("cccd"),
      auto: getFirebasePath("cccdauto"), 
      error: getFirebasePath("errorcccd/records"),
      message: getFirebasePath("message")
    });

    var isAutoRun = false;
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
        if (data && data.Name != "") {
          sendMessageToCurrentTab(data);
        } else {
          console.log("Không có dữ liệu CCCD để gửi");
        }
      }
    });

    const unsubscribeIsAuto = onValue(refIsAuto, (snapshot) => {
      const data = snapshot.val();
      console.log("Auto state received:", data, "with key:", currentFirebaseKey);
      
      if (isFirstAutoRun) {
        isFirstAutoRun = false;
        return;
      } else {
        isAutoRun = data;
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

    const messageListener = (msg: any, _sender: any, _callback: any) => {
      if (isAutoRun) {
        if (msg.message === "not_found") {
          set(refMessage, {
            "Lenh": "notFound",
            "TimeStamp": new Date().getTime().toString(),
            "DoiTuong": msg.name || ""
          });
          // Handle not found case
        } else if (msg.message === "finded") {
          set(refMessage, {
            "Lenh": "continueCCCD",
            "TimeStamp": new Date().getTime().toString(),
            "DoiTuong": ""
          });
        }
      }

      if (msg.message === "finded" && isAutoRun) {
      } else
        return true;
    };

    chrome.runtime.onMessage.addListener(messageListener);

    return () => {
      console.log("Cleaning up Firebase listeners for key:", currentFirebaseKey);
      unsubcribeCCCD();
      unsubscribeIsAuto();
      unsubscribeErrorRecords();
      chrome.runtime.onMessage.removeListener(messageListener);
    }
  }, [currentFirebaseKey]); // Chỉ depend vào currentFirebaseKey

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

        <Space>
          <Button
            onClick={handleGetDataFromPNS}
            type="primary"
            icon={<RedoOutlined />}
          >
            Chạy
          </Button>
          {/* THAY ĐỔI: Nút sao chép dữ liệu */}
          <Button
            onClick={handleCopyData}
            type="primary"
            icon={<CopyOutlined />}
            disabled={!errorRecords || Object.keys(errorRecords).length === 0}
          >
            Sao chép Bảng
          </Button>
        </Space>

        {/* MỚI: Section gửi mã hiệu */}
        <Space direction="vertical" style={{ width: '100%' }}>
          <h4 style={{ margin: '10px 0 5px 0', fontSize: '14px', fontWeight: 'bold' }}>Gửi Mã Hiệu</h4>
          <Space style={{ width: '100%' }}>
            <Input
              placeholder="Nhập mã hiệu..."
              value={maHieu}
              onChange={(e) => setMaHieu(e.target.value)}
              onPressEnter={handleSendMaHieu}
              style={{ flex: 1, width: 200 }}
            />
            <Button
              onClick={handleSendMaHieu}
              type="primary"
              icon={<SendOutlined />}
              disabled={!maHieu.trim()}
            >
              Gửi Mã Hiệu
            </Button>
          </Space>
        </Space>

        {errorRecords && (
          <div>
            <h3 style={{ marginTop: '15px' }}>Danh sách lỗi đã đồng bộ:</h3>
            <pre style={{ maxHeight: '200px', overflow: 'auto', background: '#f0f0f0', padding: '10px', border: '1px solid #ccc', borderRadius: '4px' }}>
              {JSON.stringify(errorRecords, null, 2)}
            </pre>
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