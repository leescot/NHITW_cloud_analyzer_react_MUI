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
    } catch (error) {
      console.error("擴充功能處理數據消息時出錯:", error);
    }
  });
})();
