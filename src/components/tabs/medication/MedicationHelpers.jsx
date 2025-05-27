import { medicationProcessor } from "../../../utils/medicationProcessor";

// 判斷藥物所屬顏色的函數
export const getMedicationColor = (medication, settings) => {
  if (!settings.enableATC5Colors) return null;

  let atc5Code = medication.atc_code;

  // 處理 ATC5 代碼可能存在於 ATC 名稱中的情況
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
        return atc5Code === code; // 7字元代碼的精確匹配
      } else {
        return atc5Code.startsWith(code); // 較短代碼的前綴匹配
      }
    });
    return match;
  });

  if (!group) return null;

  const groupName = group[0];

  // 檢查群組是否被分配到顏色
  const colorGroups = settings.atc5ColorGroups || { red: [], orange: [], green: [] };
  
  // 使用 Map 儲存顏色映射關係
  const colorMap = new Map([
    ['red', { name: 'red', color: '#f44336' }],
    ['orange', { name: 'orange', color: '#ed6c02' }],
    ['green', { name: 'green', color: '#2e7d32' }]
  ]);
  
  // 檢查群組屬於哪個顏色類別
  for (const [colorKey, groupNames] of Object.entries(colorGroups)) {
    if (groupNames && groupNames.includes(groupName) && colorMap.has(colorKey)) {
      return colorMap.get(colorKey);
    }
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

  // 始終返回 false 以禁用粗體格式
  return false;
};

// 根據看診類型擷取顏色
export const getVisitTypeColor = (visitType) => {
  // 使用 Map 儲存看診類型與顏色的映射關係
  const visitTypeColorMap = new Map([
    ["急診", "#c62828"], // 較柔和的紅色
    ["住診", "#388e3c"], // 較柔和的綠色
    ["門診", "primary.main"] // 預設藍色
  ]);
  
  // 返回對應顏色或預設值
  return visitTypeColorMap.get(visitType) || "primary.main";
};

// 複製藥物的函數
export const handleCopyMedications = (medications, group, settings, setSnackbarMessage, setSnackbarOpen) => {
  if (settings.medicationCopyFormat === "none") {
    return;
  }

  const groupInfo = {
    date: group.date,
    hosp: group.hosp,
    visitType: "", // 移除 visitType 的複製內容
    icd_code: group.icd_code,
    icd_name: group.icd_name,
    showDiagnosis: settings.showDiagnosis,
  };

  const formattedText = medicationProcessor.formatMedicationList(
    medications,
    settings.medicationCopyFormat,
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

// 處理藥物圖片連結點選
export const handleDrugImageClick = (drugcode, setSnackbarMessage, setSnackbarOpen) => {
  if (!drugcode) {
    setSnackbarMessage("無法擷取藥品代碼");
    setSnackbarOpen(true);
    return;
  }

  // 打開藥品圖片頁面
  window.open(`chrome-extension://${chrome.runtime.id}/drug-images.html?code=${drugcode}`, '_blank', 'noopener,noreferrer');

  setSnackbarMessage("已開啟藥品圖片查看器");
  setSnackbarOpen(true);
};