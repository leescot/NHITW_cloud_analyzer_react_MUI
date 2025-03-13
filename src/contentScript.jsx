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

  // 首先判斷當前環境
  const isRealEnvironment = window.location.href.includes("medcloud2.nhi.gov.tw");
  const isTestEnvironment = window.location.href.includes("nhitw-mock-api.vercel.app") || 
                           window.location.href.includes("localhost");
  
  console.log("當前環境:", isRealEnvironment ? "真實環境" : (isTestEnvironment ? "測試環境" : "未知環境"));

  // 在真實環境中，優先載入舊版內容腳本
  if (isRealEnvironment) {
    console.log("在真實環境中載入舊版內容腳本");
    import("./legacyContent.js")
      .then((module) => {
        console.log("舊版內容腳本載入成功");
        // 如果有導出 initLegacyContent 函數，則調用它
        if (typeof module.initLegacyContent === 'function') {
          module.initLegacyContent();
        }
      })
      .catch((error) => {
        console.error("載入舊版內容腳本時出錯:", error);
      });
  } else {
    // 在測試環境中，先加載測試模式模組
    let testModeModule = null;
    import("./modules/testMode.js")
      .then((module) => {
        console.log("測試模式模組已加載");
        testModeModule = module;
        
        // 在測試環境中，使用導出模組
        import("./legacyContentExport.js")
          .then((module) => {
            console.log("舊版內容腳本導出模組已加載");
            // 初始化舊版內容腳本
            if (typeof module.initLegacyContent === 'function') {
              module.initLegacyContent();
            }
          })
          .catch((error) => {
            console.error("加載舊版內容腳本導出模組時出錯:", error);
            
            // 如果新的導出模組加載失敗，嘗試直接加載舊版內容腳本
            import("./legacyContent.js")
              .then((module) => {
                console.log("直接加載舊版內容腳本成功");
                // 嘗試初始化，但舊版可能沒有導出 initLegacyContent 函數
                if (typeof module.initLegacyContent === 'function') {
                  module.initLegacyContent();
                } else {
                  console.log("舊版內容腳本沒有導出 initLegacyContent 函數");
                }
              })
              .catch((err) => {
                console.error("直接加載舊版內容腳本也失敗:", err);
              });
          });
      })
      .catch((error) => {
        console.error("加載測試模式模組時出錯:", error);
        // 測試模式加載失敗時，嘗試直接加載舊版內容腳本
        import("./legacyContent.js")
          .then((module) => {
            console.log("直接加載舊版內容腳本成功");
            if (typeof module.initLegacyContent === 'function') {
              module.initLegacyContent();
            }
          })
          .catch((err) => {
            console.error("直接加載舊版內容腳本也失敗:", err);
          });
      });
  }

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
          
          // 通知 background.js 更新數據狀態
          chrome.runtime.sendMessage({ action: "updateDataStatus" }, (response) => {
            console.log("數據狀態更新回應:", response);
          });
        }, 100);
      }
    } catch (error) {
      console.error("擴充功能處理數據消息時出錯:", error);
    }
  });
  
  // 監聽來自 background.js 的消息
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log("Content script 收到消息:", message);
    
    // 處理測試數據載入消息
    if (message.action === "testDataLoaded" || message.action === "testDataTypeLoaded") {
      // 嘗試使用測試模式模組處理消息
      try {
        // 動態導入測試模式模組
        import("./modules/testMode.js").then(module => {
          if (typeof module.handleTestDataMessage === 'function') {
            module.handleTestDataMessage(message);
          }
          sendResponse({ status: "received" });
        }).catch(error => {
          console.error("動態導入測試模式模組失敗:", error);
          sendResponse({ status: "error", message: error.message });
        });
      } catch (error) {
        console.error("處理測試數據消息時出錯:", error);
        sendResponse({ status: "error", message: error.message });
      }
      return true; // 保持通道開啟以進行非同步回應
    }
    
    // 處理數據狀態更新消息
    if (message.action === "dataStatusUpdated") {
      console.log("收到數據狀態更新消息");
      // 觸發 UI 更新事件
      window.dispatchEvent(new CustomEvent('dataStatusUpdated', { detail: null }));
      sendResponse({ status: "received" });
      return true;
    }
    
    return false;
  });
})();
