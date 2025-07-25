import "../asserts/tailwind.css";
import { initializeApp } from "firebase/app";
import {
  getDatabase,
  ref,
  onValue,
  set,
} from "firebase/database";

// THAY ĐỔI: Thay đổi icon và loại bỏ xlsx
import { RedoOutlined, CopyOutlined } from "@ant-design/icons";
import { Button, Space } from "antd";
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

  initializeApp(firebaseConfig);
  const db = getDatabase();
  const refCCCD = ref(db, "CCCDAPP/" + "cccd");
  const refIsAuto = ref(db, "CCCDAPP/" + "cccdauto");
  // SỬA LỖI: Đường dẫn này phải khớp với hàm Flutter
  const refErrorRecords = ref(db,"CCCDAPP/" + "errorcccd/records");

  // MỚI: Hàm xử lý sao chép dữ liệu vào clipboard
  const handleCopyData = () => {
    if (!errorRecords || Object.keys(errorRecords).length === 0) {
      showNotification("Không có dữ liệu để sao chép.");
      return;
    }

    // Chuyển đổi object thành mảng
    const data: any[] = Object.values(errorRecords);


    // Tạo các hàng dữ liệu, mỗi cột phân tách bằng TAB (\t)
    const dataRows = data.map((record, index) => {
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

  const showNotification = (message: string) => {
    chrome.notifications.create({
      message: message,
      title: "Thông báo",
      type: "basic",
      iconUrl: "128.jpg",
    });
  };

  let isFirstAutoRun = true;
  const handleGetDataFromPNS = async () => {};
  
  const sendMessageToCurrentTab = (data: any) => {
    chrome.tabs.query(
      { active: true, lastFocusedWindow: true, currentWindow: true },
      (tabs) => {
        if (tabs.length === 0) return;
        const tabId = tabs[0].id!;
        chrome.tabs.sendMessage(
          tabId,
          { message: "ADDCCCD", data },
          (response) => {
            if (chrome.runtime.lastError) {
              console.log("Could not send message:", chrome.runtime.lastError.message);
            } else {
              console.log("Response from content ", response);
            }
          }
        );
      }
    );
  };

  useEffect(() => {
    var isAutoRun = false;
    let isFirstRun = true;
    let isFirstErrorRun = true;

    const unsubcribeCCCD = onValue(refCCCD, (snapshot) => {
      const data = snapshot.val();
      if (isFirstRun) {
        isFirstRun = false;
        return;
      } else {
        sendMessageToCurrentTab(data);
      }
    });

    const unsubscribeIsAuto = onValue(refIsAuto, (snapshot) => {
      const data = snapshot.val();
      if (isFirstAutoRun) {
        isFirstAutoRun = false;
        return;
      } else {
        isAutoRun = data;
      }
    });
    
    const unsubscribeErrorRecords = onValue(refErrorRecords, (snapshot) => {
        const data = snapshot.val();
        if (isFirstErrorRun) {
            isFirstErrorRun = false;
            if(data) setErrorRecords(data);
            return;
        }

        console.log("Đã nhận được cập nhật dữ liệu lỗi:", data);
        setErrorRecords(data);
        
        if (data) {
            const recordCount = Object.keys(data).length;
            showNotification(`Đã đồng bộ ${recordCount} bản ghi lỗi.`);
        }
    });

    const messageListener = (msg: any, sender: any, callback: any) => {
      if (msg.message === "finded" && isAutoRun) {
        set(ref(db, "CCCDAPP/message"), {
          "Lenh": "continueCCCD",
          "TimeStamp": new Date().getTime().toString(),
          "DoiTuong": ""
        });
      }
      return true;
    };

    chrome.runtime.onMessage.addListener(messageListener);

    return () => {
      unsubcribeCCCD();
      unsubscribeIsAuto();
      unsubscribeErrorRecords();
      chrome.runtime.onMessage.removeListener(messageListener);
    }
  }, []);

  return (
    <div className="m-5">
      <Space direction="vertical" style={{ width: '100%' }}>
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
        {errorRecords && (
            <div>
                <h3 style={{ marginTop: '15px' }}>Danh sách lỗi đã đồng bộ:</h3>
                <pre style={{ maxHeight: '200px', overflow: 'auto', background: '#f0f0f0', padding: '10px', border: '1px solid #ccc', borderRadius: '4px' }}>
                    {JSON.stringify(errorRecords, null, 2)}
                </pre>
            </div>
        )}
      </Space>
    </div>
  );
}