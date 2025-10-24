# Architecture Comparison

## 🔴 OLD ARCHITECTURE (Content Script Based)

```
┌─────────────────────────────────────────────────────────────────┐
│ POPUP.TSX                                                        │
│ ┌─────────────────────────────────────────────────────┐        │
│ │ sendMessageToCurrentTab(data)                       │        │
│ │ • chrome.tabs.update(url)                           │        │
│ │ • ❌ Không biết kết quả                              │        │
│ └────────────────────┬────────────────────────────────┘        │
└──────────────────────┼──────────────────────────────────────────┘
                       │ URL update
                       ▼
┌─────────────────────────────────────────────────────────────────┐
│ TARGET PAGE (hanhchinhcong.vnpost.vn)                           │
│                                                                  │
│  window.onload → contentScript.tsx tự động chạy                 │
└──────────────────────┬──────────────────────────────────────────┘
                       │ Auto execute
                       ▼
┌─────────────────────────────────────────────────────────────────┐
│ CONTENTSCRIPT.TSX (~230 lines)                                  │
│ ┌─────────────────────────────────────────────────────┐        │
│ │ handleExistingInput()                                │        │
│ │ • waitForElm(checkbox)                               │        │
│ │ • checkbox.checked = true                            │        │
│ │ • submitButton.click()                               │        │
│ │ • chrome.runtime.sendMessage({message: "finded"})    │        │
│ └────────────────────┬────────────────────────────────┘        │
└──────────────────────┼──────────────────────────────────────────┘
                       │ Page refresh sau click submit
                       ▼
                   ❌ MẤT STATE
                   ❌ KHÓ QUẢN LÝ LUỒNG
                   ❌ MESSAGE PASSING PHỨC TẠP
```

---

## 🟢 NEW ARCHITECTURE (Scripting API Based)

```
┌─────────────────────────────────────────────────────────────────┐
│ POPUP.TSX                                                        │
│ ┌─────────────────────────────────────────────────────┐        │
│ │ async sendMessageToCurrentTab(data)                 │        │
│ │                                                      │        │
│ │ 1️⃣  chrome.tabs.update(url)                         │        │
│ └────────────────────┬────────────────────────────────┘        │
└──────────────────────┼──────────────────────────────────────────┘
                       │ URL update
                       ▼
┌─────────────────────────────────────────────────────────────────┐
│ TARGET PAGE                                                      │
│  Loading... (không có automation tự động)                        │
└──────────────────────┬──────────────────────────────────────────┘
                       │ Wait for complete
                       ▼
┌─────────────────────────────────────────────────────────────────┐
│ POPUP.TSX (continued)                                            │
│ ┌─────────────────────────────────────────────────────┐        │
│ │ 2️⃣  await chrome.tabs.onUpdated                     │        │
│ │    (đợi status === 'complete')                       │        │
│ │                                                      │        │
│ │ 3️⃣  chrome.scripting.executeScript({                │        │
│ │      target: { tabId },                              │        │
│ │      func: () => {                                   │        │
│ │        // Code chạy trong page context               │        │
│ │        return Promise.race([                         │        │
│ │          waitForElement(checkbox),                   │        │
│ │          waitForNoResultText()                       │        │
│ │        ])                                            │        │
│ │      }                                               │        │
│ │    })                                                │        │
│ └────────────────────┬────────────────────────────────┘        │
└──────────────────────┼──────────────────────────────────────────┘
                       │ Return result
                       ▼
┌─────────────────────────────────────────────────────────────────┐
│ POPUP.TSX (handle result)                                        │
│ ┌─────────────────────────────────────────────────────┐        │
│ │ 4️⃣  const result = { success, reason, name }        │        │
│ │                                                      │        │
│ │    if (success) {                                    │        │
│ │      Firebase.set("continueCCCD")                    │        │
│ │      notification("✓ Thành công")                    │        │
│ │    }                                                 │        │
│ │    else if (not_found) {                             │        │
│ │      Firebase.set("notFound", name)                  │        │
│ │      notification("✗ Không tìm thấy")                │        │
│ │    }                                                 │        │
│ └─────────────────────────────────────────────────────┘        │
└─────────────────────────────────────────────────────────────────┘
                       ▼
                   ✅ FULL CONTROL
                   ✅ TRACKABLE STATE
                   ✅ PROMISE-BASED
                   ✅ DỄ DEBUG
```

---

## 🔍 Chi tiết Automation Script

### Script được inject vào page:

```javascript
chrome.scripting.executeScript({
  target: { tabId },
  func: (): Promise<AutomationResult> => {
    return new Promise((resolve) => {
      
      // Helper 1: Đợi element
      function waitForElement(selector, timeout = 5000) {
        // MutationObserver logic...
      }
      
      // Helper 2: Đợi text "Không tìm thấy kết quả"
      function waitForNoResultText(timeout = 5000) {
        // MutationObserver logic...
      }
      
      // Main automation
      (async () => {
        try {
          // Race condition: cái nào đến trước
          const result = await Promise.race([
            waitForElement("#listTbody tr td div input"),
            waitForNoResultText()
          ]);
          
          if (result.type === 'noResult') {
            resolve({ 
              success: false, 
              reason: 'not_found',
              name: document.querySelector("#HoTen").value
            });
          }
          
          if (result.type === 'checkbox') {
            // Check checkbox
            checkbox.checked = true;
            checkbox.dispatchEvent(new Event('change'));
            
            // Wait for UI
            await new Promise(r => setTimeout(r, 300));
            
            // Click submit
            const submitBtn = document.getElementById("sub_xacnhan");
            if (submitBtn && !submitBtn.disabled) {
              submitBtn.click();
              resolve({ success: true, reason: 'submitted' });
            } else {
              resolve({ 
                success: false, 
                reason: 'submit_disabled' 
              });
            }
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
```

---

## 📊 Comparison Table

| Aspect | Old (Content Script) | New (Scripting API) |
|--------|---------------------|---------------------|
| **Code Location** | contentScript.tsx | popup.tsx |
| **Lines of Code** | ~230 lines | ~150 lines inline |
| **Control Flow** | Event-driven | Promise-based |
| **State Management** | Lost on refresh | Preserved in popup |
| **Result Tracking** | Message passing | Direct return value |
| **Debugging** | Multiple consoles | Single popup console |
| **Error Handling** | try/catch + messages | try/catch + return |
| **Maintainability** | ⭐⭐ | ⭐⭐⭐⭐⭐ |

---

## 🎯 Key Benefits

1. **Tập trung hóa**: Tất cả logic ở một nơi (popup.tsx)
2. **Minh bạch**: Biết chính xác kết quả automation
3. **Linh hoạt**: Dễ thêm logic xử lý phức tạp
4. **Reliable**: Không bị ảnh hưởng bởi page lifecycle
5. **Modern**: Sử dụng async/await thay vì callbacks

---

## 🚀 Next Steps

1. Test với real data từ Firebase
2. Monitor performance và error rate
3. Consider adding retry logic
4. Add metrics tracking
5. Improve error handling cho edge cases
