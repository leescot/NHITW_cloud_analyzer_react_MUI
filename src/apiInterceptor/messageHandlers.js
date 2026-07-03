// messageHandlers.js — 擴充訊息處理器（chrome.runtime.onMessage）
// 從 legacyContent.js 抽出，透過依賴注入取得所需的外部函數/值，
// 讓本模組不直接耦合 legacyContent.js 的模組狀態。

/**
 * 下載檔名用的身分證號遮罩:檔名本身即 PII,匯出檔名不得含完整身分證號。
 * 格式:前 3 碼 + xxxx + 末 1 碼(檔名不能用 *,以 x 取代;與 debug log 遮罩同精神)。
 * @param {string} id
 * @returns {string}
 */
export function maskIdForFilename(id) {
  if (!id || typeof id !== 'string') return 'unknown';
  if (id.length <= 4) return 'xxxx';
  return id.slice(0, 3) + 'xxxx' + id.slice(-1);
}

/**
 * 註冊 chrome.runtime.onMessage 監聽器，處理 popup / 其他擴充頁面送來的訊息。
 *
 * @param {object} deps
 * @param {Function} deps.fetchAllDataTypes 觸發抓取所有資料型別
 * @param {Function} deps.clearAllData 清空目前已抓取的資料
 * @param {Function} deps.getTokenPayload 取得目前登入 token 解析後的 payload
 * @param {import('../store/dataStore').dataStore} deps.dataStore 資料儲存單例
 * @param {Map<string,string>} deps.API_PATH_MAP 資料型別 → API path 對照表
 */
export function setupMessageListeners(deps) {
  const { fetchAllDataTypes, clearAllData, getTokenPayload, dataStore, API_PATH_MAP } = deps;

  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === "manualFetchData") {
      fetchAllDataTypes();
      sendResponse({ status: "fetching" });
      return true;
    }

    if (message.action === "dataCleared") {
      clearAllData();
      sendResponse({ status: "cleared" });
      return true;
    }

    if (message.action === "openDashboard") {
      const floatingIcon = document.querySelector("#nhi-floating-root button");
      if (floatingIcon) {
        floatingIcon.click();
        sendResponse({ status: "opened" });
      } else {
        sendResponse({ status: "error", message: "Dashboard component not found" });
      }
      return true;
    }

    if (message.action === "settingChanged") {
      const isMedicationSetting = [
        "simplifyMedicineName", "showDiagnosis", "showGenericName",
        "enableATC5Coloring", "copyFormat",
      ].includes(message.setting);

      const isChineseMedSetting = [
        "chineseMedShowDiagnosis", "chineseMedShowEffectName",
        "chineseMedDoseFormat", "chineseMedCopyFormat",
      ].includes(message.setting);

      if (isMedicationSetting || isChineseMedSetting) {
        setTimeout(() => {
          window.dispatchEvent(new CustomEvent("dataFetchCompleted", {
            detail: {
              settingsChanged: true,
              settingType: isMedicationSetting ? "medication" : "chinesemed",
              setting: message.setting,
              value: message.value,
              allSettings: message.allSettings,
            },
          }));
        }, 100);
      }
      sendResponse({ status: "setting_updated" });
      return true;
    }

    if (message.action === "getPatientData") {
      try {
        const payload = getTokenPayload();
        const patientData = {
          UserName: payload?.UserName || '',
          UserID: payload?.UserID || '',
          UserSex: payload?.UserSex || '',
          UserBirthday: payload?.UserBirthday || '',
          ClientTime: new Date().toISOString(),
        };
        for (const dataType of API_PATH_MAP.keys()) {
          const key = dataType === 'labdata' ? 'lab' : dataType;
          patientData[key] = dataStore.getData(dataType);
        }
        patientData.masterMenu = dataStore.getData('masterMenu');

        const hasAnyData = Object.values(patientData).some(value => {
          return value?.rObject && Array.isArray(value.rObject) && value.rObject.length > 0;
        });

        if (hasAnyData) {
          const date = new Date();
          const ts = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, "0")}${String(date.getDate()).padStart(2, "0")}_${String(date.getHours()).padStart(2, "0")}${String(date.getMinutes()).padStart(2, "0")}`;
          const uid = maskIdForFilename(patientData.UserID);
          const fileName = `${ts}_${uid}.json`;
          const jsonString = JSON.stringify(patientData, null, 2);
          const blob = new Blob([jsonString], { type: "application/json" });
          const url = URL.createObjectURL(blob);
          const downloadLink = document.createElement("a");
          downloadLink.href = url;
          downloadLink.download = fileName;
          downloadLink.style.display = "none";
          document.body.appendChild(downloadLink);
          downloadLink.click();
          setTimeout(() => {
            document.body.removeChild(downloadLink);
            URL.revokeObjectURL(url);
          }, 100);
          sendResponse({ status: "success", message: "已直接處理下載", directDownload: true });
        } else {
          sendResponse({ error: "無法獲取病人資料", status: "error" });
        }
      } catch (err) {
        sendResponse({ error: "處理下載時發生錯誤: " + err.message, status: "error" });
      }
      return true;
    }

    sendResponse({ status: "received" });
    return true;
  });
}
