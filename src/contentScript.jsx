console.log("Content script loaded");

function initializeExtension() {
  console.log("Content script initializing");

  const rootDiv = document.createElement("div");
  rootDiv.id = "nhi-floating-root";
  document.body.appendChild(rootDiv);

  import("./components/FloatingIcon")
    .then((module) => {
      const FloatingIcon = module.default;
      return Promise.all([import("react"), import("react-dom/client")])
        .then(([React, ReactDOM]) => {
          ReactDOM.createRoot(rootDiv).render(React.createElement(FloatingIcon));
        });
    })
    .catch(error => {
      console.error("載入 React 元件時出錯:", error);
    });

  import("./legacyContent.js")
    .then(() => {
      console.log("Legacy content script loaded");
    })
    .catch((error) => {
      console.error("載入舊版內容時出錯:", error);
    });

  import("./localDataHandler.js")
    .then((localDataHandler) => {
      console.log("本地資料處理器已載入");

      const messageHandlers = new Map([
        ["loadLocalData", async (message, sendResponse) => {
          try {
            const result = await localDataHandler.processLocalData(
              message.data,
              message.filename
            );
            sendResponse(result);
          } catch (error) {
            console.error("處理本地資料時出錯:", error);
            sendResponse({
              success: false,
              message: `處理資料時出錯: ${error.message}`,
              error: error.toString()
            });
          }
        }],
        ["clearLocalData", (message, sendResponse) => {
          const result = localDataHandler.clearLocalData();
          sendResponse(result);
        }]
      ]);

      chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        const handler = messageHandlers.get(message.action);
        if (handler) {
          handler(message, sendResponse);
          return true;
        }
      });
    })
    .catch((error) => {
      console.error("載入本地資料處理器時出錯:", error);
    });
}

if (document.readyState === "loading") {
  document.addEventListener('DOMContentLoaded', initializeExtension);
} else {
  initializeExtension();
}
