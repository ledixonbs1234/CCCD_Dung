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

  // ✅ HÀM MỚI: Polling storage để đợi kết quả modal detection
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
    });
  };

  const sendMessageToCurrentTab = async (data: any) => {
    try {
      const tabs = await chrome.tabs.query({});

      // Tìm tab đầu tiên có URL bắt đầu bằng https://hanhchinhcong.vnpost.vn/
      const targetTab = tabs.find(tab =>
        tab.url && tab.url.startsWith("https://hanhchinhcong.vnpost.vn/giaodich/xac-nhan-all")
      );

      if (!targetTab || !targetTab.id) {
        console.log("Không tìm thấy tab có URL bắt đầu bằng https://hanhchinhcong.vnpost.vn/giaodich/xac-nhan-all");
        showNotification("Không tìm thấy trang CCCD VNPost đang mở");
        return;
      }

      const tabId = targetTab.id;

      // Encode the HoTen and NgaySinh parameters
      const hoTenEncoded = encodeURIComponent(data.Name || "");
      const ngaySinhEncoded = encodeURIComponent(data.NgaySinh || "");
      
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

      // Build the new URL with updated parameters
      const newUrl = `https://hanhchinhcong.vnpost.vn/giaodich/xac-nhan-all?NhomThuTuc=NTT00002&MaThuTuc=TT0000007&HoTen=${hoTenEncoded}&NgaySinh=${ngaySinhEncoded}&DienThoai=&MaHoSo=&MaBuuGui=&NgayBatDau=${ngayBatDauEncoded}&NgayKetThuc=${ngayKetThucEncoded}&QRcode=`;

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
          
          // Đợi một chút để ensure flag được commit
          await new Promise(resolve => setTimeout(resolve, 100));
          
          // ✅ BÂY GIỜ MỚI SUBMIT FORM
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
          
          console.log("✓ Form submitted, waiting for modal detection...");
          
          // Background sẽ tự động inject modal detector khi tab reload xong
          
          // Đợi kết quả modal detection từ storage (polling)
          const modalDetected = await waitForModalResult();

          if (modalDetected) {
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

            // Gửi message về Firebase để tiếp tục
            const refMessage = ref(db, getFirebasePath("message"));
            await set(refMessage, {
              "Lenh": "continueCCCD",
              "TimeStamp": new Date().getTime().toString(),
              "DoiTuong": ""
            });
          } else {
            showNotification(`⚠ Không phát hiện modal xác nhận`);
          }
        } else if (scriptResult.reason === 'not_found') {
          showNotification(`✗ Không tìm thấy: ${scriptResult.name || data.Name || ""}`);

          // Gửi message về Firebase
          const refMessage = ref(db, getFirebasePath("message"));
          await set(refMessage, {
            "Lenh": "notFound",
            "TimeStamp": new Date().getTime().toString(),
            "DoiTuong": scriptResult.name || ""
          });
        } else if (scriptResult.reason === 'multiple_records') {
          showNotification(`⚠️ Tìm thấy nhiều bản ghi: ${scriptResult.message || ""}`);

          // Gửi message về Firebase - trường hợp trùng lặp
          const refMessage = ref(db, getFirebasePath("message"));
          await set(refMessage, {
            "Lenh": "multipleRecords",
            "TimeStamp": new Date().getTime().toString(),
            "DoiTuong": data.Name || ""
          });
        } else {
          showNotification(`⚠ Lỗi: ${scriptResult.message || scriptResult.reason}`);
        }
      }

    } catch (error) {
      console.error("Error in sendMessageToCurrentTab:", error);
      showNotification("Có lỗi xảy ra khi xử lý");
    }
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

    console.log("Firebase paths:", {
      cccd: getFirebasePath("cccd"),
      auto: getFirebasePath("cccdauto"),
      error: getFirebasePath("errorcccd/records")
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
      }
      // Auto state is monitored but handled by sendMessageToCurrentTab flow
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

    // Không còn cần message listener vì automation được xử lý trực tiếp trong sendMessageToCurrentTab
    // Tất cả logic automation giờ chạy qua chrome.scripting.executeScript

    return () => {
      console.log("Cleaning up Firebase listeners for key:", currentFirebaseKey);
      unsubcribeCCCD();
      unsubscribeIsAuto();
      unsubscribeErrorRecords();
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