import "../asserts/tailwind.css";
import { initializeApp } from "firebase/app";
import {
  getDatabase,
  ref,
  onValue,
  set,
} from "firebase/database";

// THAY ĐỔI: Thay đổi icon và loại bỏ xlsx
import { RedoOutlined, CopyOutlined, SendOutlined } from "@ant-design/icons";
import { Button, Space, Input } from "antd";
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

  initializeApp(firebaseConfig);
  const db = getDatabase();
  const refCCCD = ref(db, "CCCDAPP/" + "cccd");
  const refIsAuto = ref(db, "CCCDAPP/" + "cccdauto");
  // SỬA LỖI: Đường dẫn này phải khớp với hàm Flutter
  const refErrorRecords = ref(db, "CCCDAPP/" + "errorcccd/records");

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

  // MỚI: Hàm xử lý gửi mã hiệu
  const handleSendMaHieu = () => {
    if (!maHieu.trim()) {
      showNotification("Vui lòng nhập mã hiệu.");
      return;
    }

    set(ref(db, "CCCDAPP/message"), {
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

  const showNotification = (message: string) => {
    chrome.notifications.create({
      message: message,
      title: "Thông báo",
      type: "basic",
      iconUrl: "128.jpg",
    });
  };

  let isFirstAutoRun = true;
  const handleGetDataFromPNS = async () => { };

  const sendMessageToCurrentTab = (data: any) => {
    chrome.tabs.query({}, (tabs) => {
      // Tìm tab đầu tiên có URL bắt đầu bằng https://cccd.vnpost.vn/
      const targetTab = tabs.find(tab =>
        tab.url && tab.url.startsWith("https://cccd.vnpost.vn/")
      );

      if (!targetTab || !targetTab.id) {
        console.log("Không tìm thấy tab có URL bắt đầu bằng https://cccd.vnpost.vn/");
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
        if (data.Name != "") {
          sendMessageToCurrentTab(data);
        } else {
          console.log("Không có dữ liệu CCCD để gửi");
        }

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

    const messageListener = (msg: any, sender: any, callback: any) => {
      if (isAutoRun) {
        if (msg.message === "not_found") {
          set(ref(db, "CCCDAPP/message"), {
            "Lenh": "notFound",
            "TimeStamp": new Date().getTime().toString(),
            "DoiTuong": msg.name || ""
          });
          // Handle not found case
        } else if (msg.message === "finded") {
          set(ref(db, "CCCDAPP/message"), {
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
    </div>
  );
}