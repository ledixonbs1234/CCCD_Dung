window.onload = () => {
  console.log("Chạy contentScript");
  const hoTenInput = document.querySelector("#HoTen") as HTMLInputElement;
  const textTen = hoTenInput?.value;

  if (!textTen) {
    chrome.runtime.sendMessage({ message: "finded" });
  } else {
    
    handleExistingInput();
  }
};
async function handleExistingInput() {
  const button = await waitForElm("#Result > tbody > tr:nth-child(1) > td:nth-child(8) > button");
  const buttonList = document.querySelectorAll("#Result > tbody > tr > td:nth-child(8) > button");

  if (buttonList.length === 1 && button) {
    // (button as HTMLButtonElement).click();
    console.log("Đã tìm thấy onload");
  }
}
chrome.runtime.onMessage.addListener((msg) => {
  console.log("Đã nhận được tin nhắn tới contentScript");

  if (msg && msg.message === "ADDCCCD") {
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
