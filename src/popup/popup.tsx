import "../asserts/tailwind.css";
import { initializeApp } from "firebase/app";
import {
  getDatabase,
  ref,
  get,
  child,
  DataSnapshot,
  onValue,
  set,
} from "firebase/database";

import { RedoOutlined } from "@ant-design/icons";
import { Button, Space } from "antd";
import { useEffect } from "react";

// type PopupProps = {
// handleClick :React.MouseEventHandler<HTMLButtonElement>
// }
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

  initializeApp(firebaseConfig);
  const db = getDatabase();
  const refCCCD = ref(db, "CCCDAPP/" + "cccd");
  const refIsAuto = ref(db, "CCCDAPP/" + "cccdauto");


  const showNotification = (message: string) => {
    chrome.notifications.create({
      message: message,
      title: "Thông báo",
      type: "basic",
      iconUrl: "128.jpg",
    });
  };

  let isFirstAutoRun = true;
  const handleGetDataFromPNS = async () => {



  };
  // Hàm gửi thông điệp đến tab hiện tại
  const sendMessageToCurrentTab = (data: any) => {
    chrome.tabs.query(
      { active: true, lastFocusedWindow: true, currentWindow: true },
      (tabs) => {
        const tabId = tabs.length === 0 ? 0 : tabs[0].id!; // Lấy ID của tab hiện tại
        chrome.tabs.sendMessage(
          tabId,
          {
            message: "ADDCCCD", data // Gửi thông điệp với dữ liệu CCCD
          },
          (response) => {
            console.log("Response from content ", response); // Log phản hồi từ content script
          }
        );
      }
    );
  };
  useEffect(() => {
    // Biến để xác định xem có đang chạy tự động hay không
    var isAutoRun = false;
    // Biến để kiểm tra xem đây có phải là lần chạy đầu tiên hay không
    let isFirstRun = true;

    // Lắng nghe sự thay đổi dữ liệu từ refCCCD
    const unsubcribeCCCD = onValue(refCCCD, (snapshot) => {
      const data = snapshot.val(); // Lấy dữ liệu từ snapshot
      console.log("Hiện dữ liệu đã từng :" ,JSON.stringify(data,null,2));

      // Nếu đây là lần chạy đầu tiên, không làm gì cả
      if (isFirstRun) {
        isFirstRun = false; // Đánh dấu là đã chạy lần đầu
        return;
      } else {
        // Gọi hàm gửi thông điệp đến tab hiện tại
      sendMessageToCurrentTab(data);
      }
    });

    // Lắng nghe sự thay đổi dữ liệu từ refIsAuto
    const unsubscribeIsAuto = onValue(refIsAuto, (snapshot) => {
      const data = snapshot.val(); // Lấy dữ liệu từ snapshot
      console.log(data);

      // Nếu đây là lần chạy đầu tiên, không làm gì cả
      if (isFirstAutoRun) {
        isFirstAutoRun = false; // Đánh dấu là đã chạy lần đầu
        return;
      } else {
        isAutoRun = data; // Cập nhật trạng thái isAutoRun
      }
    });

    const messageListener = (msg: any, sender: any, callback: any) => {
      console.log("Đã nhận tin nhắn từ option ", msg);
      if (msg.message === "finded" && isAutoRun) {
        console.log("continueCCCD");
        // Gửi lệnh tiếp tục đến cơ sở dữ liệu
        set(ref(db, "CCCDAPP/message"), {
          "Lenh": "continueCCCD",
          "TimeStamp": new Date().getTime().toString(),
          "DoiTuong": ""
        });
      }
      return true; // Đảm bảo callback không bị hủy
    };

    chrome.runtime.onMessage.addListener(messageListener);
    return () => {
      unsubcribeCCCD();
      unsubscribeIsAuto();
      chrome.runtime.onMessage.removeListener(messageListener);
    }
  }, []); // Chỉ chạy một lần khi component được mount

  return (
    <div className="m-5">
      <Space direction="vertical">
        <Space>

          <Button
            onClick={handleGetDataFromPNS}
            type="primary"
            icon={<RedoOutlined />}
          >Chạy</Button>
        </Space>
      </Space>
    </div>
  );
}
