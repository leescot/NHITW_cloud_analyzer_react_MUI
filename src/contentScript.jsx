console.log("Content script loaded");

// Using require-like pattern for legacy content
function injectLegacyContent() {
  // This will be inlined during build
  console.log("Injecting legacy content script");
}

// 初始化主要功能
function initializeExtension() {
  console.log("Content script initializing");

  // Create a mount point for React components
  const rootDiv = document.createElement("div");
  rootDiv.id = "nhi-floating-root";
  document.body.appendChild(rootDiv);

  // Load the React component
  import("./components/FloatingIcon").then((module) => {
    const FloatingIcon = module.default;

    // Use React to render the component
    import("react").then((React) => {
      import("react-dom/client").then((ReactDOM) => {
        ReactDOM.createRoot(rootDiv).render(React.createElement(FloatingIcon));
      });
    });
  });

  // Also load the legacy content
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
      console.error("Error loading legacy content:", error);
    });

  // Import local data handler
  import("./localDataHandler.js")
    .then((localDataHandler) => {
      console.log("Local data handler loaded");

      // 使用 Map 处理不同的消息动作
      const messageHandlers = new Map([
        ["loadLocalData", (message, sendResponse) => {
          console.log("Received loadLocalData request");
          const result = localDataHandler.processLocalData(
            message.data,
            message.filename
          );
          sendResponse(result);
        }],
        ["clearLocalData", (message, sendResponse) => {
          console.log("Received clearLocalData request");
          const result = localDataHandler.clearLocalData();
          sendResponse(result);
        }],
        ["getPatientData", (message, sendResponse) => {
          // 这部分保持原有的实现逻辑
          // ...
        }]
      ]);

      // 设置消息监听器处理本地数据加载
      chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        const handler = messageHandlers.get(message.action);
        if (handler) {
          handler(message, sendResponse);
          return true; // 保持消息通道开启以进行异步响应
        }
      });
    })
    .catch((error) => {
      console.error("Error loading local data handler:", error);
    });

  // 使用 Map 存储数据类型与对应处理函数的映射
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

  // 在您现有的 message 监听器中添加对 dataForExtension 消息的处理
  window.addEventListener("message", (event) => {
    // 确保消息来自我们的页面
    if (event.source !== window) return;

    try {
      if (event.data && event.data.type === "dataForExtension") {
        // console.log("扩充功能收到页面传来的数据:", event.data.dataType);

        // 创建安全的数据副本
        const safeData = JSON.parse(JSON.stringify(event.data.data));
        
        // 使用 Map 查找并执行相应的处理函数
        const handler = dataTypeHandlers.get(event.data.dataType);
        if (handler) {
          handler(safeData);
        }

        // 使用 setTimeout 确保变量已完全初始化后再触发事件
        setTimeout(() => {
          const customEvent = new CustomEvent("dataFetchCompleted", {
            detail: { type: event.data.dataType },
          });
          window.dispatchEvent(customEvent);
        }, 100);
      }

      // 处理本地数据清除消息
      if (event.data && event.data.type === "localDataCleared") {
        console.log("收到本地數據清除消息");

        // 可以添加一些清除本地数据的逻辑
        // ...
      }
    } catch (error) {
      console.error("擴充功能處理數據消息時出錯:", error);
    }
  });
}

// 在 DOM 內容載入後安全地進行初始化
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeExtension);
} else {
  // 如果 DOM 已經載入完成，立即初始化
  initializeExtension();
}

// 預先設置關鍵監聽器以確保不會錯過早期事件
window.addEventListener("message", (event) => {
  // 將實際的處理邏輯延遲到初始化完成後
  if (event.source !== window) return;
  
  // 儲存早期事件以便初始化後處理
  if (event.data && (event.data.type === "dataForExtension" || event.data.type === "localDataCleared")) {
    if (!window._earlyEvents) window._earlyEvents = [];
    window._earlyEvents.push(event);
  }
});
