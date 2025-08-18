
window.onload = () => {
  console.log("Chạy contentScript");

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
chrome.runtime.onMessage.addListener((msg) => {
  console.log("Đã nhận được tin nhắn tới contentScript");

  if (msg?.message === "ADDCCCD") {
    updateInputFields(msg.data);
  }
});

function updateInputFields(data: { Name: string; NgaySinh: string }) {
  const hoTenInput = document.querySelector("#HoTen") as HTMLInputElement;
  const ngaySinhInput = document.querySelector("#NgaySinh") as HTMLInputElement;
  const submitButton = document.querySelector("#submit") as HTMLButtonElement;

  const event = new Event("input", { bubbles: true });

  hoTenInput.value = data.Name;
  hoTenInput.dispatchEvent(event);

  ngaySinhInput.value = data.NgaySinh;
  ngaySinhInput.dispatchEvent(event);

  submitButton?.click();
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
