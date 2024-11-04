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
import { Button, Select, Space } from "antd";
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
  useEffect(() => {
    var isAutoRun = false;
    let isFirstRun = true;
    onValue(refCCCD, (snapshot) => {
      const data = snapshot.val();
      console.log("Hiện dữ liệu đã từng :"+ data);
      if (isFirstRun) {
        isFirstRun = false;
        return;
      } else {
        chrome.tabs.query(
          { active: true, lastFocusedWindow: true, currentWindow: true },
          (tabs) => {
            const tabId = tabs.length === 0 ? 0 : tabs[0].id!;
            chrome.tabs.sendMessage(
              tabId,
              {
                message: "ADDCCCD", data
              },
              (response) => {
                console.log("Response from content ", response);
              }
            );
          });
      }
    })
    onValue(refIsAuto, (snapshot) => {
      const data = snapshot.val();
      console.log(data);
      if (isFirstAutoRun) {
        isFirstAutoRun = false;
        return;
      } else {
        isAutoRun = data;


      }
    })

    chrome.runtime.onMessage.addListener((msg, sender, callback) => {
      console.log("DDax nhan tin nhan toi opition ",msg);
      if (msg.message === "finded") {
        if (isAutoRun) {
          console.log("continueCCCD")
          set(ref(db, "CCCDAPP/message"), { "Lenh": "continueCCCD", "TimeStamp": new Date().getTime().toString(), "DoiTuong": "" })
        }
      }
      return true;
    })
  }, [])







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
