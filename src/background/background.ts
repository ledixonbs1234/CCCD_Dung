
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
                console.log("✅ MODAL DETECTED! Sending message to popup...");
                chrome.runtime.sendMessage({
                  action: "modalDetected",
                  success: true
                });
              } else {
                console.log("❌ Modal not found within timeout");
                chrome.runtime.sendMessage({
                  action: "modalDetected",
                  success: false,
                  reason: "timeout"
                });
              }
            });
          }
        }).then(() => {
          console.log("✓ Background: Modal detector script injected successfully");
        }).catch(err => {
          console.error("❌ Background: Failed to inject modal detector:", err);
        });
        
        // Xóa flag session sau khi inject
        chrome.storage.session.remove(['waitingForModalTab']);
      }
    });
  }
});

// Listener nhận message từ injected script và forward đến popup
chrome.runtime.onMessage.addListener((message, _sender, _sendResponse) => {
  if (message.action === "modalDetected") {
    console.log("📨 Background received modal detection result:", message);
    // Message này sẽ được forward đến popup qua runtime.onMessage
    // Popup listener sẽ nhận và xử lý
  }
});

console.log("✅ CCCD Background Service Worker loaded - Modal detection ready");
