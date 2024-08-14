chrome.runtime.onInstalled.addListener(() =>
  console.log("Đã chạy ở chỗ này là background")
)

chrome.bookmarks.onCreated.addListener(() => {
  console.log("Ban da bookmark tai day");
});

function formatDate(date: Date): string {
  const day = date.getDate().toString().padStart(2, "0");
  const month = (date.getMonth() + 1).toString().padStart(2, "0");
  const year = date.getFullYear();
  return `${day}%2F${month}%2F${year}`;
}
function toDayString() {
  const today = new Date();
  // today.setDate(today.getDate() - 12);
  return formatDate(today);
}
function lastDayString() {
  const today = new Date();
  today.setDate(today.getDate() - 2);
  return formatDate(today);
}

chrome.runtime.onMessage.addListener((data, _sender, response) => {
  const { event, list ,content} = data;
  switch (event) {
    case "onSaveTenKhachHangs":
      chrome.storage.local.set({ tenkhachhangs: list });
      break;
    case "onSaveKhachHangs":
      chrome.storage.local.set({ khachhangs: list });
      break;
    case "BADGE":
      console.log(content)
      chrome.action.setBadgeText({text:content.toString()});
      break;
    case "onSaveCurrentKhachHangs":
      chrome.storage.local.set({ ckhachhangs: list });
      break;
    case "onFetchData":
      fetch("https://packnsend.vnpost.vn/Order/Home/ExportExcellOrderManage", {
        headers: {
          accept: "*/*",
          "accept-language": "en-US,en;q=0.9,vi;q=0.8",
          "content-type": "application/x-www-form-urlencoded; charset=UTF-8",
          "sec-ch-ua":
            '"Not A(Brand";v="99", "Google Chrome";v="121", "Chromium";v="121"',
          "sec-ch-ua-mobile": "?0",
          "sec-ch-ua-platform": '"Windows"',
          "sec-fetch-dest": "empty",
          "sec-fetch-mode": "cors",
          "sec-fetch-site": "same-origin",
          "x-requested-with": "XMLHttpRequest",
          cookie:
            "_ga=GA1.1.1252308094.1682309904; tctbdvn-_zldp=yr040hnCEdI2kxlbdwBeQuILj7FFHTSRALXKDo17bUf5oxEi8nvo1%2FHkNiXB4tD3VVj9liGvi%2BU%3D; _ga_PX3P5JLJ7K=GS1.1.1692945085.4.0.1692945085.0.0.0; _ga_TDJH6SEKEF=GS1.1.1703234131.4.1.1703234170.0.0.0; __SRVNAME=pns7; ASP.NET_SessionId=1tl4k4fo4bu5vhqwn53coee3; .ASPXAUTH=9E1633939FA3B00F904E422CCCB86B402F1B1A92F702B251189551D02FEB874EC894F1B04112D0BC9C69BFF93094451F2651D82616FEB484B469B41DDF924CC365801E490B1E3C2D21E993FBAB7EDCCB4716418487A4F9F4D87BC8C3F2A1F8175F2B8048EFC2B4FFABF23E7F62887AB9; panelIdCookie=userid=593280_xonld",
          Referer:
            "https://packnsend.vnpost.vn/tin/quan-ly-tin.html?startDate=11%2F02%2F2024&endDate=11%2F02%2F2024",
          "Referrer-Policy": "strict-origin-when-cross-origin",
        },
        body:
          "Id=0&FromDate=" +
          lastDayString() +
          "+&ToDate=+" +
          toDayString() +
          "&Code=&CustomerCode=&Status=&ContactPhone=&TrackingCode=&Page=0&Channel=&senderDistrictId=0&senderWardId=0&flagConfig=&orderNumber=&serviceCodeMPITS=",
        method: "POST",
      })
        .then((res) => res.json())
        .then((data) => {
          response(data);
        })
        .catch((error) => {
          console.log(error);
          response("ERROR");
        });
      return true;

    default:
      break;
  }
  console.log("Dang chay event", event);
});

const fetchData = () => {};

// const handleStart = (list: []) => {
//     chrome.storage.local.set({ "data": JSON.stringify(list) })
// }
