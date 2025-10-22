(function () {
  window.addEventListener("message", (event) => {
    if (event.source !== window) return;
    if (event.data.type !== "SET_NGAY_SINH") return;

    const data = event.data.payload;
    console.log("[Injected.js] Received data:", data);

    const input = document.querySelector("#NgaySinh");
    if (!input) return console.warn("[Injected.js] Không tìm thấy #NgaySinh");

    // Nếu có datepicker
    if (window.$ && window.$.fn && window.$.fn.datepicker) {
      try {
        window.$(".datepicker-NgaySinh").datepicker("update", data.NgaySinh);
        console.log("[Injected.js] datepicker updated");
        return;
      } catch (e) {
        console.warn("[Injected.js] datepicker error:", e);
      }
    }

    // Nếu không có datepicker
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set;
    setter.call(input, data.NgaySinh);
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new Event("change", { bubbles: true }));

    console.log("[Injected.js] set value done:", input.value);
    // 🔔 Gửi tín hiệu báo đã cập nhật xong
    window.postMessage({ type: "NGAY_SINH_UPDATED" }, "*");
  });
  window.postMessage({ type: "INJECTED_READY" }, "*");
})();