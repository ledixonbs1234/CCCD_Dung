
// background.ts (MV3 service worker)
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.cmd === 'RUN_IN_PAGE') {
    console.log('Received RUN_IN_PAGE command with data:', msg.data);
    const tabId = sender.tab?.id;
    if (!tabId) {
      sendResponse({ ok: false, error: 'No tab id' });
      return;
    }

    chrome.scripting.executeScript({
      target: { tabId },
      func: (payload: any) => {
        // --- code chạy TRONG page context ---
        function toDDMMYYYY(d: Date) {
          const dd = String(d.getDate()).padStart(2, '0');
          const mm = String(d.getMonth() + 1).padStart(2, '0');
          const yyyy = d.getFullYear();
          return `${dd}/${mm}/${yyyy}`;
        }
        function normalize(v: string) {
          // nếu truyền dd/mm/yyyy -> trả nguyên
          if (typeof v !== 'string') return v;
          if (v.includes('/')) return v;
          // try ISO yyyy-mm-dd
          const parsed = new Date(v);
          if (!isNaN(parsed.getTime())) return toDDMMYYYY(parsed);
          return v;
        }

        try {
          const data = payload;
          const ngay = normalize(data.NgaySinh);

          // 1) Nếu bootstrap-datepicker (jQuery) tồn tại -> dùng API
          try {
            if ((window as any).$ && (window as any).$.fn && (window as any).$.fn.datepicker) {
              const $ = (window as any).$;
              const picker = $('.datepicker-NgaySinh');
              console.log('[EXT] Found bootstrap datepicker for #NgaySinh:', picker);
              
              if (picker && picker.length) {
                picker.datepicker('update', ngay);
              } else {
                // fallback: set trên input trực tiếp
                const input = document.querySelector('#NgaySinh') as HTMLInputElement | null;
                if (input) {
                  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set;
                  if (setter) setter.call(input, ngay);
                  else input.value = ngay;
                  input.dispatchEvent(new Event('input', { bubbles: true }));
                  input.dispatchEvent(new Event('change', { bubbles: true }));
                }
              }
            } else {
              // 2) Try flatpickr instance
              const input = document.querySelector('#NgaySinh') as any;
              if (input && input._flatpickr) {
                input._flatpickr.setDate(ngay, true);
              } else if (input) {
                // 3) fallback native + dispatch (this runs in page context so React listeners see it)
                const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set;
                if (setter) setter.call(input, ngay);
                else input.value = ngay;
                input.dispatchEvent(new Event('input', { bubbles: true }));
                input.dispatchEvent(new Event('change', { bubbles: true }));
              } else {
                console.warn('[EXT] #NgaySinh input not found');
              }
            }

            // Cập nhật họ tên, mã nếu cần (tương tự)
            const nameInput = document.querySelector<HTMLInputElement>('#HoTen');
            if (nameInput && data.Name) {
              const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set;
              if (setter) setter.call(nameInput, data.Name);
              else nameInput.value = data.Name;
              nameInput.dispatchEvent(new Event('input', { bubbles: true }));
              nameInput.dispatchEvent(new Event('change', { bubbles: true }));
            }

            // Id vào MaHoSo hoặc MaBuuGui
            const idInput = document.querySelector<HTMLInputElement>('#MaHoSo') || document.querySelector<HTMLInputElement>('#MaBuuGui');
            if (idInput && data.Id) {
              const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set;
              if (setter) setter.call(idInput, data.Id);
              else idInput.value = data.Id;
              idInput.dispatchEvent(new Event('input', { bubbles: true }));
              idInput.dispatchEvent(new Event('change', { bubbles: true }));
            }

            // done
          } catch (e) {
            console.error('[EXT] Error updating fields', e);
          }
        } catch (err) {
          console.error('payload error', err);
        }
      },
      args: [msg.data]
    }).then(() => {
      sendResponse({ ok: true });
    }).catch((err) => {
      console.error('executeScript failed', err);
      sendResponse({ ok: false, error: String(err) });
    });

    return true; // async
  }
});