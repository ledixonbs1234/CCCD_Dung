/******/ (() => { // webpackBootstrap
/******/ 	"use strict";
var __webpack_exports__ = {};
/*!*********************************************!*\
  !*** ./src/contentScript/contentScript.tsx ***!
  \*********************************************/

window.onload = () => {
    console.log("chay contentScript");
    waitForElm("#Result > tbody > tr:nth-child(1) > td:nth-child(8) > button").then((e) => {
        var list = document.querySelectorAll("#Result > tbody > tr > td:nth-child(8) > button");
        if (list.length == 1) {
            console.log("da tim thay");
            if (e)
                e.click();
        }
    });
};
document.addEventListener("DOMContentLoaded", function () {
    console.log("chay");
    waitForElm("#Result > tbody > tr:nth-child(1) > td:nth-child(8) > button").then((e) => {
        var list = document.querySelectorAll("#Result > tbody > tr > td:nth-child(8) > button");
        if (list.length == 1) {
            console.log("da tim thay");
            if (e)
                e.click();
        }
    });
});
chrome.runtime.onMessage.addListener((msg, sender, callback) => {
    if (msg) {
        if (msg.message === "ADDCCCD") {
            var event = new Event("input", { bubbles: true });
            let a = document.querySelector("#HoTen");
            a?.setAttribute("value", msg.data.Name);
            a.value = msg.data.Name;
            a?.dispatchEvent(event);
            let b = document.querySelector("#NgaySinh");
            b?.setAttribute("value", msg.data.NgaySinh);
            b.value = msg.data.NgaySinh;
            b?.dispatchEvent(event);
            let c = document.querySelector("#submit");
            c?.click();
            waitForElm("#Result > tbody > tr:nth-child(1) > td:nth-child(8) > button").then((e) => {
                var list = document.querySelectorAll("#Result > tbody > tr > td:nth-child(8) > button");
                if (list.length == 1) {
                    console.log("da tim thay");
                    if (e)
                        e.click();
                }
            });
        }
    }
});
function waitForElm(selector) {
    return new Promise((resolve) => {
        if (document.querySelector(selector)) {
            return resolve(document.querySelector(selector));
        }
        const observer = new MutationObserver(() => {
            if (document.querySelector(selector)) {
                observer.disconnect();
                resolve(document.querySelector(selector));
            }
        });
        // If you get "parameter 1 is not of type 'Node'" error, see https://stackoverflow.com/a/77855838/492336
        observer.observe(document.body, {
            childList: true,
            subtree: true,
        });
    });
}

/******/ })()
;
//# sourceMappingURL=contentScript.js.map