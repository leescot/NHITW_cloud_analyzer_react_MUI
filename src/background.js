// background.js
// 精簡版 — 只保留 content script 無法執行的 Chrome API

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'openPopup') {
    chrome.action.openPopup();
    sendResponse({ status: 'ok' });
    return true;
  }

  if (message.action === 'setBadge') {
    chrome.action.setBadgeText({ text: message.text || '' });
    if (message.color) {
      chrome.action.setBadgeBackgroundColor({ color: message.color });
    }
    sendResponse({ status: 'ok' });
    return true;
  }

  sendResponse({ status: 'received' });
  return true;
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
  if (changeInfo.url && (
    changeInfo.url.includes('medcloud2.nhi.gov.tw/imu/login') ||
    changeInfo.url.includes('medcloud2.nhi.gov.tw/imu/IMUE1000/IMUE0001'))) {
    chrome.action.setBadgeText({ text: '' });
  }
});
