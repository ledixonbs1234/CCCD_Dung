
// background.ts (MV3 service worker)

// ==================== MODAL DETECTION SYSTEM ====================
// Listener để phát hiện modal sau khi trang reload
chrome.tabs.onUpdated.addListener((updatedTabId, info, _tab) => {
  if (info.status === "complete") {
    chrome.storage.session.get(['waitingForModalTab']).then(({ waitingForModalTab }) => {
      if (waitingForModalTab === updatedTabId) {
        console.log("✅ Background: Tab reloaded completely, injecting modal detector...");
        
        // Inject script để kiểm tra modal
        chrome.scripting.executeScript({
          target: { tabId: updatedTabId },
          func: () => {
            // Helper function: đợi element xuất hiện
            function waitForElm(selector: string, timeout = 10000): Promise<Element | null> {
              return new Promise((resolve) => {
                const element = document.querySelector(selector);
                if (element) {
                  console.log(`✅ Modal "${selector}" đã tồn tại ngay lập tức!`);
                  return resolve(element);
                }

                const observer = new MutationObserver(() => {
                  const element = document.querySelector(selector);
                  if (element) {
                    console.log(`✅ Modal "${selector}" xuất hiện sau khi chờ!`);
                    observer.disconnect();
                    resolve(element);
                  }
                });

                observer.observe(document.body, {
                  childList: true,
                  subtree: true,
                });

                setTimeout(() => {
                  observer.disconnect();
                  console.log(`⚠️ Timeout waiting for modal "${selector}"`);
                  resolve(null);
                }, timeout);
              });
            }

            // Bắt đầu chờ modal
            console.log("🔍 Starting modal detection...");
            waitForElm("#flash-overlay-modal").then((elm) => {
              if (elm) {
                console.log("✅ MODAL DETECTED! Sending message to background...");
                // ✅ Send message về background (script context có thể gọi chrome.runtime)
                chrome.runtime.sendMessage({
                  action: "modalDetected",
                  success: true,
                  timestamp: Date.now()
                });
              } else {
                console.log("❌ Modal not found within timeout");
                chrome.runtime.sendMessage({
                  action: "modalDetected",
                  success: false,
                  reason: "timeout",
                  timestamp: Date.now()
                });
              }
            });
          }
        }).then(() => {
          console.log("✓ Background: Modal detector script injected successfully");
          // ❌ KHÔNG XÓA FLAG Ở ĐÂY - để script trong tab tự xóa sau khi detect xong
        }).catch(err => {
          console.error("❌ Background: Failed to inject modal detector:", err);
          
          // Cleanup flag trên lỗi
          chrome.storage.session.remove(['waitingForModalTab']);
        });
      }
    });
  }
});

// ✅ Listener nhận message từ modal detector script và lưu vào storage
chrome.runtime.onMessage.addListener((message, _sender, _sendResponse) => {
  if (message.action === "modalDetected") {
    console.log("📨 Background received modal detection result:", message);
    
    // Lưu kết quả vào storage
    chrome.storage.session.set({
      modalDetectionResult: {
        success: message.success,
        reason: message.reason,
        timestamp: message.timestamp || Date.now()
      }
    }).then(() => {
      console.log("✅ Background saved modal result to storage:", message.success);
      
      // Cleanup flag
      chrome.storage.session.remove(['waitingForModalTab']);
    });
  }
});

console.log("✅ CCCD Background Service Worker loaded - Modal detection ready");
