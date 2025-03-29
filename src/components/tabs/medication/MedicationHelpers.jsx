import { medicationProcessor } from "../../../utils/medicationProcessor";

// 判斷藥物所屬顏色的函數
export const getMedicationColor = (medication, settings) => {
  if (!settings.enableATC5Colors) return null;

  let atc5Code = medication.atc_code;

  // Handle cases where the ATC5 code might be in the ATC name
  if (!atc5Code && medication.atc_name) {
    const matches = medication.atc_name.match(/\(([A-Z0-9]+)\)/);
    if (matches && matches[1]) atc5Code = matches[1];
  }

  if (!atc5Code) return null;

  // 檢查是否有 atc5Groups 設定
  if (!settings.atc5Groups || Object.keys(settings.atc5Groups).length === 0) {
    return null;
  }

  // 檢查藥物的 ATC5 代碼是否屬於任何群組
  const group = Object.entries(settings.atc5Groups).find(([groupName, codes]) => {
    const match = codes.some(code => {
      if (code.length === 7) {
        return atc5Code === code; // Exact match for 7-character codes
      } else {
        return atc5Code.startsWith(code); // Prefix match for shorter codes
      }
    });
    return match;
  });

  if (!group) return null;

  const groupName = group[0];

  // 檢查群組是否被分配到顏色
  const colorGroups = settings.atc5ColorGroups || { red: [], orange: [], green: [] };

  if (colorGroups.red && colorGroups.red.includes(groupName)) {
    return { name: 'red', color: '#f44336' };
  } else if (colorGroups.orange && colorGroups.orange.includes(groupName)) {
    return { name: 'orange', color: '#ed6c02' };
  } else if (colorGroups.green && colorGroups.green.includes(groupName)) {
    return { name: 'green', color: '#2e7d32' };
  }

  return null;
};

// 判斷藥物是否應該以粗體顯示的函數
export const shouldBeBold = (medication, settings) => {
  // if (!settings.enableATC5Colors) return false;

  // let atc5Code = medication.atc_code;

  // if (!atc5Code) return false;

  // if (!settings.atc5Groups || Object.keys(settings.atc5Groups).length === 0) {
  //   return false;
  // }

  // const group = Object.entries(settings.atc5Groups).find(([groupName, codes]) => {
  //   return codes.some(code => {
  //     if (code.length === 7) {
  //       return atc5Code === code; // Exact match for 7-character codes
  //     } else {
  //       return atc5Code.startsWith(code); // Prefix match for shorter codes
  //     }
  //   });
  // });

  // if (!group) return false;

  // const groupName = group[0];

  // // 檢查群組是否被分配到顏色
  // const colorGroups = settings.atc5ColorGroups || { red: [], orange: [], green: [] };

  // // 如果藥物屬於任何有顏色的群組（紅色、橘色或綠色），返回 true
  // return (
  //   colorGroups.red.includes(groupName) ||
  //   colorGroups.orange.includes(groupName) ||
  //   colorGroups.green.includes(groupName)
  // );

  // Always return false to disable bold formatting
  return false;
};

// 根據看診類型獲取顏色
export const getVisitTypeColor = (visitType) => {
  switch(visitType) {
    case "急診":
      return "#c62828"; // 較柔和的紅色
    case "住診":
      return "#388e3c"; // 較柔和的綠色
    case "門診":
    default:
      return "primary.main"; // 預設藍色
  }
};

// 複製藥物的函數
export const handleCopyMedications = (medications, group, settings, setSnackbarMessage, setSnackbarOpen) => {
  if (settings.copyFormat === "none") {
    return;
  }

  const groupInfo = {
    date: group.date,
    hosp: group.hosp,
    visitType: group.visitType,
    icd_code: group.icd_code,
    icd_name: group.icd_name,
    showDiagnosis: settings.showDiagnosis,
  };

  const formattedText = medicationProcessor.formatMedicationList(
    medications,
    settings.copyFormat,
    groupInfo
  );
  navigator.clipboard
    .writeText(formattedText)
    .then(() => {
      setSnackbarMessage("藥物清單已複製到剪貼簿");
      setSnackbarOpen(true);
    })
    .catch((err) => {
      console.error("Failed to copy medications: ", err);
      setSnackbarMessage("複製失敗，請重試");
      setSnackbarOpen(true);
    });
};

// 處理藥物圖片連結點擊
export const handleDrugImageClick = (drugcode, setSnackbarMessage, setSnackbarOpen) => {
  if (!drugcode) {
    setSnackbarMessage("無法獲取藥品代碼");
    setSnackbarOpen(true);
    return;
  }

  // 打開藥品圖片頁面
  window.open(`chrome-extension://${chrome.runtime.id}/drug-images.html?code=${drugcode}`, '_blank', 'noopener,noreferrer');

  setSnackbarMessage("已開啟藥品圖片查看器");
  setSnackbarOpen(true);
};