console.log("Content script loaded");

// 使用類似 require 的模式載入舊版內容
function injectLegacyContent() {
  // 此將在建構期間被內嵌
  console.log("Injecting legacy content script");
}

// 初始化主要功能
function initializeExtension() {
  console.log("Content script initializing");

  // 為 React 元件建立掛載點
  const rootDiv = document.createElement("div");
  rootDiv.id = "nhi-floating-root";
  document.body.appendChild(rootDiv);

  // 載入 React 元件與渲染的階段
  const importSteps = new Map([
    ["component", () => import("./components/FloatingIcon")],
    ["react", () => import("react")],
    ["reactDOM", () => import("react-dom/client")]
  ]);

  // 使用串聯的 Promise 來按順序執行導入步驟
  importSteps.get("component")()
    .then((module) => {
      const FloatingIcon = module.default;
      return importSteps.get("react")()
        .then((React) => {
          return importSteps.get("reactDOM")()
            .then((ReactDOM) => {
              ReactDOM.createRoot(rootDiv).render(React.createElement(FloatingIcon));
            });
        });
    })
    .catch(error => {
      console.error("載入 React 元件時出錯:", error);
    });

  // 載入舊版內容
  import("./legacyContent.js")
    .then(() => {
      console.log("Legacy content script loaded");
      
      // 處理任何在初始化前收集的早期事件
      if (window._earlyEvents && window._earlyEvents.length > 0) {
        console.log(`處理 ${window._earlyEvents.length} 個早期事件`);
        window._earlyEvents.forEach(event => {
          // 觸發消息事件以使用正確設置的處理程序
          window.dispatchEvent(new MessageEvent('message', {
            source: window,
            data: event.data
          }));
        });
        // 清除早期事件
        window._earlyEvents = [];
      }
    })
    .catch((error) => {
      console.error("載入舊版內容時出錯:", error);
    });

  // 導入本地資料處理器
  import("./localDataHandler.js")
    .then((localDataHandler) => {
      console.log("本地資料處理器已載入");

      // 使用 Map 處理不同的消息動作
      const messageHandlers = new Map([
        ["loadLocalData", async (message, sendResponse) => {
          console.log("收到載入本地資料請求");
          try {
            // 使用 Promise 處理異步操作
            const result = await localDataHandler.processLocalData(
              message.data,
              message.filename
            );
            console.log("本地資料處理成功:", result);
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
          console.log("收到清除本地資料請求");
          const result = localDataHandler.clearLocalData();
          sendResponse(result);
        }],
        ["getPatientData", (message, sendResponse) => {
          // 此部分保持原有的實現邏輯
          // ...
        }]
      ]);

      // 設置消息監聽器處理本地資料加載
      chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        const handler = messageHandlers.get(message.action);
        if (handler) {
          handler(message, sendResponse);
          return true; // 保持消息通道開啟以進行異步響應
        }
      });
    })
    .catch((error) => {
      console.error("載入本地資料處理器時出錯:", error);
    });

  // 使用 Map 儲存數據類型與對應處理函式的映射
  const dataTypeHandlers = new Map([
    ["medication", (data) => { window.lastInterceptedMedicationData = data; }],
    ["lab", (data) => { window.lastInterceptedLabData = data; }],
    ["chinesemed", (data) => { window.lastInterceptedChineseMedData = data; }],
    ["imaging", (data) => { window.lastInterceptedImagingData = data; }],
    ["allergy", (data) => { window.lastInterceptedAllergyData = data; }],
    ["surgery", (data) => { window.lastInterceptedSurgeryData = data; }],
    ["discharge", (data) => { window.lastInterceptedDischargeData = data; }],
    ["medDays", (data) => { window.lastInterceptedMedDaysData = data; }],
    ["patientSummary", (data) => { window.lastInterceptedPatientSummaryData = data; }]
  ]);

  // 建立事件類型處理器映射
  const eventTypeHandlers = new Map([
    ["dataForExtension", (eventData) => {
      // 创建安全的数据副本
      const safeData = JSON.parse(JSON.stringify(eventData.data));
      
      // 使用 Map 查找並執行相應的處理函式
      const handler = dataTypeHandlers.get(eventData.dataType);
      if (handler) {
        handler(safeData);
      }

      // 使用 setTimeout 確保變數已完全初始化後再觸發事件
      setTimeout(() => {
        const customEvent = new CustomEvent("dataFetchCompleted", {
          detail: { type: eventData.dataType },
        });
        window.dispatchEvent(customEvent);
      }, 100);
    }],
    ["localDataCleared", () => {
      console.log("收到本地數據清除消息");
      // 可以添加一些清除本地數據的邏輯
    }]
  ]);

  // 在現有的 message 監聽器中添加對各種消息類型的處理
  window.addEventListener("message", (event) => {
    // 確保消息來自我們的頁面
    if (event.source !== window) return;

    try {
      // 檢查事件是否有數據和類型
      if (event.data && event.data.type) {
        // 查找並執行相應的處理函式
        const handler = eventTypeHandlers.get(event.data.type);
        if (handler) {
          handler(event.data);
        }
      }
    } catch (error) {
      console.error("擴充功能處理數據消息時出錯:", error);
    }
  });
}

// DOM 加載狀態處理映射
const domLoadStateHandlers = new Map([
  ["loading", () => document.addEventListener('DOMContentLoaded', initializeExtension)],
  ["default", () => initializeExtension()]
]);

// 在 DOM 內容載入後安全地進行初始化
const loadStateHandler = domLoadStateHandlers.get(document.readyState) || domLoadStateHandlers.get("default");
loadStateHandler();

// 預先設置關鍵監聽器以確保不會錯過早期事件
window.addEventListener("message", (event) => {
  // 將實際的處理邏輯延遲到初始化完成後
  if (event.source !== window) return;
  
  // 定義需要捕獲的事件類型
  const earlyEventTypes = new Set(["dataForExtension", "localDataCleared"]);
  
  // 儲存早期事件以便初始化後處理
  if (event.data && earlyEventTypes.has(event.data.type)) {
    if (!window._earlyEvents) window._earlyEvents = [];
    window._earlyEvents.push(event);
  }
});
