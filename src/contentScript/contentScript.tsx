
window.onload = () => {
  console.log("Chạy contentScript CCCDHCC");

  const hoTenInput = document.querySelector("#HoTen") as HTMLInputElement;
  const textTen = hoTenInput?.value;

  if (!textTen) {
    chrome.runtime.sendMessage({ message: "finded" });
  } else {
    //thay vi handleInput thi send luon
    // chrome.runtime.sendMessage({ message: "finded", ten: textTen });
    handleExistingInput();
  }
};
// Tạo promise để chờ text "Không tìm khách hàng" xuất hiện
const waitForNoCustomerText = new Promise<string | null>((resolve) => {
  const checkText = () => {
    // Lấy text từ xpath /html/body/div[1]/text()
    const bodyDiv = document.evaluate('/html/body/div[1]', document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue as HTMLElement;
    if (bodyDiv) {
      const textContent = bodyDiv.textContent || '';
      if (textContent.includes("Không tìm khách hàng")) {
        resolve(textContent);
        return true;
      }
    }
    return false;
  };

  // Kiểm tra ngay lập tức
  if (checkText()) return;

  // Nếu chưa có, sử dụng MutationObserver để theo dõi
  const observer = new MutationObserver(() => {
    if (checkText()) {
      observer.disconnect();
    }
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
    characterData: true
  });
});
async function handleExistingInput() {
  // Tạo promise để chờ button xuất hiện
  const waitForButton = waitForElm("#Result > tbody > tr:nth-child(1) > td:nth-child(8) > button");

  // Chờ cái nào xuất hiện trước
  const result = await Promise.race([
    waitForButton.then(button => ({ type: 'button', data: button })),
    waitForNoCustomerText.then(text => ({ type: 'noCustomer', data: text }))
  ]);

  if (result.type === 'button') {
    // Nếu button xuất hiện trước
    const buttonList = document.querySelectorAll("#Result > tbody > tr > td:nth-child(8) > button");

    if (buttonList.length === 1 && result.data) {
      (result.data as HTMLButtonElement).click();
      console.log("Đã tìm thấy onload");
    }
  } else if (result.type === 'noCustomer') {
    // Nếu text "Không tìm khách hàng" xuất hiện trước
    console.log("Không tìm thấy nút submit, và không tìm thấy cccd người này");
    const hoTenInput = document.querySelector("#HoTen") as HTMLInputElement;
    const textTen = hoTenInput?.value;
    chrome.runtime.sendMessage({ message: "not_found", name: textTen });
  }
}
// Ví dụ: set ngày 21/10/2025
let injectedReady = false;
let pendingNgaySinhData: { Name: string; NgaySinh: string } | null = null;
let pendingFallbackTimer: number | null = null;
const FALLBACK_SEND_MS = 1500; // if injected doesn't respond, send anyway after this

// Listen for messages from the page (injected script) via window.postMessage
window.addEventListener("message", (event) => {
  // Only accept messages from same window
  if (event.source !== window) return;
  const data = event.data;
  if (!data || typeof data !== "object") return;

  if (data.type === "INJECTED_READY") {
    injectedReady = true;
    console.log("✅ Received INJECTED_READY from page");
    // If we have pending data, send it now
    if (pendingNgaySinhData) {
      window.postMessage({ type: "SET_NGAY_SINH", payload: pendingNgaySinhData }, "*");
      // clear pending and fallback
      pendingNgaySinhData = null;
      if (pendingFallbackTimer) {
        clearTimeout(pendingFallbackTimer);
        pendingFallbackTimer = null;
      }
    }
  }

  if (data.type === "NGAY_SINH_UPDATED") {
    console.log("✅ Ngày sinh đã được cập nhật (message from page)!");
    const button = document.querySelector<HTMLButtonElement>(
      "#layout-wrapper > div > div > div > div > div:nth-child(3) > form > div.row.row-cols-4 > div.col-12.mb-3 > div > button"
    );
    // small delay to allow UI to settle
    setTimeout(() => button?.click(), 100);
  }
});
chrome.runtime.onMessage.addListener((msg) => {
  console.log("Đã nhận được tin nhắn tới contentScript");

  if (msg?.message === "ADDCCCD") {
    // Nếu injected chưa ready thì đợi
    if (!injectedReady) {
      console.log("⏳ Chờ injected script khởi tạo...");
       updateInputFields(msg.data);
    } else {
      updateInputFields(msg.data);
    }
  } if (msg.data.type === "INJECTED_READY") {
    injectedReady = true;
    console.log("✅ Injected script is ready");
  } else
    if (msg.data.type === "NGAY_SINH_UPDATED") {
      console.log("✅ Ngày sinh đã được cập nhật!");
      // ✅ Click nút submit
      const button = document.querySelector<HTMLButtonElement>(
        "#layout-wrapper > div > div > div > div > div:nth-child(3) > form > div.row.row-cols-4 > div.col-12.mb-3 > div > button"
      );
      button?.click();
    }
});
declare const $: any; // nếu bạn chưa có @types/jquery



function updateInputFields(data: { Name: string; NgaySinh: string }) {
  try {
    // ✅ Cập nhật họ tên

    // Inject script file vào page context
    if (!document.getElementById("injected-script")) {
      const script = document.createElement("script");
      script.id = "injected-script";
      script.src = chrome.runtime.getURL("injected.js");
      // script.onload = () => script.remove(); // dọn sạch thẻ sau khi nạp
      (document.head || document.documentElement).appendChild(script);
      console.log("✅ injected.js đã được chèn");
      const nameInput = document.querySelector<HTMLInputElement>("#HoTen");
      if (nameInput) {
        nameInput.value = data.Name || "";
        nameInput.dispatchEvent(new Event("input", { bubbles: true }));
        nameInput.dispatchEvent(new Event("change", { bubbles: true }));
      }
      // Instead of waiting a fixed timeout, queue the data and wait for the injected
      // script to notify readiness via window.postMessage({ type: 'INJECTED_READY' }).
      pendingNgaySinhData = data;
      // Fallback: if injected doesn't respond, send after FALLBACK_SEND_MS
      if (pendingFallbackTimer) {
        clearTimeout(pendingFallbackTimer);
      }
      pendingFallbackTimer = window.setTimeout(() => {
        if (pendingNgaySinhData) {
          console.warn("⚠️ injected did not signal readiness — sending SET_NGAY_SINH as fallback");
          window.postMessage({ type: "SET_NGAY_SINH", payload: pendingNgaySinhData }, "*");
          pendingNgaySinhData = null;
          pendingFallbackTimer = null;
        }
      }, FALLBACK_SEND_MS);
      // Gửi data sang page context qua window.postMessage
    } else {
      console.log("⚠️ injected.js đã tồn tại, bỏ qua inject lại");
      const nameInput = document.querySelector<HTMLInputElement>("#HoTen");
      if (nameInput) {
        nameInput.value = data.Name || "";
        nameInput.dispatchEvent(new Event("input", { bubbles: true }));
        nameInput.dispatchEvent(new Event("change", { bubbles: true }));
      }
      // If injected is already ready, send immediately. Otherwise queue and wait (see above listener).
      if (injectedReady) {
        window.postMessage({ type: "SET_NGAY_SINH", payload: data }, "*");
      } else {
        pendingNgaySinhData = data;
        if (pendingFallbackTimer) {
          clearTimeout(pendingFallbackTimer);
        }
        pendingFallbackTimer = window.setTimeout(() => {
          if (pendingNgaySinhData) {
            console.warn("⚠️ injected did not signal readiness — sending SET_NGAY_SINH as fallback");
            window.postMessage({ type: "SET_NGAY_SINH", payload: pendingNgaySinhData }, "*");
            pendingNgaySinhData = null;
            pendingFallbackTimer = null;
          }
        }, FALLBACK_SEND_MS);
      }
    }
  } catch (err) {
    console.error("[EXT] Lỗi khi cập nhật form:", err);
  }

}


function waitForElm(selector: string): Promise<Element | null> {
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
  });
}
