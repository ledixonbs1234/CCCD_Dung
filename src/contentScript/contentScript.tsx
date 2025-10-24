
// Wait for element to appear in DOM
function waitForElm(selector: string, timeout = 10000): Promise<Element | null> {
  return new Promise((resolve) => {
    const element = document.querySelector(selector);
    if (element) {
      return resolve(element);
    }

    const observer = new MutationObserver(() => {
      const element = document.querySelector(selector);
      if (element) {
        observer.disconnect();
        resolve(element);
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });

    // Timeout để tránh đợi vô hạn
    setTimeout(() => {
      observer.disconnect();
      resolve(null);
    }, timeout);
  });
}

// Hàm kiểm tra và xử lý modal detection
function checkAndHandleModalDetection() {
  chrome.storage.local.get(['waitingForModal'], (result) => {
    if (result.waitingForModal) {
      console.log("✓ ContentScript: Found pending modal detection request");
      
      // Kiểm tra ngay lập tức xem modal đã tồn tại chưa (trường hợp modal xuất hiện rất nhanh)
      const existingModal = document.querySelector("#flash-overlay-modal");
      if (existingModal) {
        console.log("✓ CCCD ContentScript: Modal ALREADY EXISTS on page!");
        
        // Đặt thành false
        chrome.storage.local.remove(['waitingForModal']);
        
        // Gửi message về popup/background
        chrome.runtime.sendMessage({
          action: "modalDetected",
          success: true
        }).catch(err => {
          console.log("Failed to send message:", err);
        });
        return;
      }
      
      // Nếu chưa có, bắt đầu chờ modal xuất hiện
      console.log("⏳ ContentScript: Modal not found yet, starting to wait...");
      waitForElm("#flash-overlay-modal", 7000).then((elm) => {
        if (elm) {
          console.log("✓ CCCD ContentScript: Modal detected after waiting!");
          
          // Xóa flag
          chrome.storage.local.remove(['waitingForModal']);
          
          // Gửi message về popup/background
          chrome.runtime.sendMessage({
            action: "modalDetected",
            success: true
          }).catch(err => {
            console.log("Failed to send message:", err);
          });
        } else {
          console.log("⚠️ ContentScript: Modal not found within timeout");
          chrome.storage.local.remove(['waitingForModal']);
          
          chrome.runtime.sendMessage({
            action: "modalDetected",
            success: false,
            reason: "timeout"
          }).catch(err => {
            console.log("Failed to send message:", err);
          });
        }
      });
    }
  });
}

// Sử dụng DOMContentLoaded thay vì load để phản ứng nhanh hơn
if (document.readyState === 'loading') {
  // DOM chưa ready, đợi DOMContentLoaded
  document.addEventListener('DOMContentLoaded', () => {
    console.log("✓ CCCD ContentScript: DOMContentLoaded fired");
    checkAndHandleModalDetection();
  });
} else {
  // DOM đã ready (script được inject muộn), chạy ngay
  console.log("✓ CCCD ContentScript: DOM already ready, checking immediately");
  checkAndHandleModalDetection();
}

console.log("✓ CCCD ContentScript loaded - Monitoring mode active");
