console.log("Content script loaded");

// Using require-like pattern for legacy content
function injectLegacyContent() {
  // This will be inlined during build
  console.log("Injecting legacy content script");
}

// Create a self-executing function to avoid global scope pollution
(function () {
  console.log("Content script initialized");

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
    })
    .catch((error) => {
      console.error("Error loading legacy content:", error);
    });

  // Import local data handler
  import("./localDataHandler.js")
    .then((localDataHandler) => {
      console.log("Local data handler loaded");

      // 設置消息監聽器處理本地資料載入
      chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        // 處理載入本地資料的請求
        if (message.action === "loadLocalData") {
          console.log("Received loadLocalData request");

          // 使用本地資料處理器處理資料
          const result = localDataHandler.processLocalData(
            message.data,
            message.filename
          );

          // 發送處理結果
          sendResponse(result);
          return true; // 保持消息通道開啟以進行非同步回應
        }

        // 處理清除本地資料的請求
        if (message.action === "clearLocalData") {
          console.log("Received clearLocalData request");

          // 清除本地資料
          const result = localDataHandler.clearLocalData();

          // 發送處理結果
          sendResponse(result);
          return true;
        }

        // 處理獲取患者資料的請求
        if (message.action === "getPatientData") {
          // 這部分保持原有的實現邏輯
          // ...
        }
      });
    })
    .catch((error) => {
      console.error("Error loading local data handler:", error);
    });

  // 在您現有的 message 監聽器中添加對 dataForExtension 消息的處理
  window.addEventListener("message", (event) => {
    // 確保消息來自我們的頁面
    if (event.source !== window) return;

    try {
      if (event.data && event.data.type === "dataForExtension") {
        // console.log("擴充功能收到頁面傳來的數據:", event.data.dataType);

        // 創建安全的數據副本
        const safeData = JSON.parse(JSON.stringify(event.data.data));

        // 設置相應的全局變量
        switch (event.data.dataType) {
          case "medication":
            window.lastInterceptedMedicationData = safeData;
            // console.log("擴充功能設置了 medication 數據");
            break;
          case "lab":
            window.lastInterceptedLabData = safeData;
            break;
          case "chinesemed":
            window.lastInterceptedChineseMedData = safeData;
            break;
          case "imaging":
            window.lastInterceptedImagingData = safeData;
            break;
          case "allergy":
            window.lastInterceptedAllergyData = safeData;
            break;
          case "surgery":
            window.lastInterceptedSurgeryData = safeData;
            break;
          case "discharge":
            window.lastInterceptedDischargeData = safeData;
            break;
          case "medDays":
            window.lastInterceptedMedDaysData = safeData;
            break;
          case "patientSummary":
            window.lastInterceptedPatientSummaryData = safeData;
            // console.log("patientsummary - Data stored in global variable:", safeData);
            break;
        }

        // 使用 setTimeout 確保變量已完全初始化後再觸發事件
        setTimeout(() => {
          const customEvent = new CustomEvent("dataFetchCompleted", {
            detail: { type: event.data.dataType },
          });
          window.dispatchEvent(customEvent);
        }, 100);
      }

      // 處理本地數據清除消息
      if (event.data && event.data.type === "localDataCleared") {
        console.log("收到本地數據清除消息");

        // 可以添加一些清除本地數據的邏輯
        // ...
      }
    } catch (error) {
      console.error("擴充功能處理數據消息時出錯:", error);
    }
  });
})();
