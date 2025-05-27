import { useState } from 'react';
import { formatLabItemForCopy, formatDate } from '../../utils/lab/LabUtilities';
import { labCopyFormatter } from '../../../utils/labCopyFormatter';

// Custom hook for handling copy functionality
export const useCopyLabData = () => {
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");

  // 關閉 snackbar 的函數
  const handleSnackbarClose = () => {
    setSnackbarOpen(false);
  };

  // 複製所有檢驗數據的函數
  const handleSectionLabData = (group, labSettings) => {
    const { copyLabFormat, showUnit, showReference } = labSettings;
    let formattedText = '';

    // 確保自訂格式的設定是完整的
    const customSettingsInfo = {
      format: copyLabFormat,
      hasHeaderFormat: Array.isArray(labSettings.customLabHeaderCopyFormat) && labSettings.customLabHeaderCopyFormat.length > 0,
      hasItemFormat: Array.isArray(labSettings.customLabItemCopyFormat) && labSettings.customLabItemCopyFormat.length > 0,
    };
    console.log("LabCopyFeatures: 處理格式設定:", customSettingsInfo);

    // 檢查是否為自訂格式
    if (copyLabFormat === "customVertical" || copyLabFormat === "customHorizontal") {
      // 使用自訂格式處理器來生成格式化文本
      try {
        // 確保 itemSeparator 值被使用
        console.log("使用的項目分隔字元:", labSettings.itemSeparator || ', ');
        formattedText = labCopyFormatter.applyCustomFormat(group.labs, group, labSettings);
      } catch (error) {
        console.error("應用自訂格式時出錯:", error);
        // 出錯時回退到標準格式
        if (copyLabFormat === "customVertical") {
          formattedText = applyStandardVerticalFormat(group, showUnit, showReference);
        } else {
          formattedText = applyStandardHorizontalFormat(group, showUnit, showReference);
        }
      }
    } else if (copyLabFormat === "vertical") {
      // 標準垂直格式
      formattedText = applyStandardVerticalFormat(group, showUnit, showReference);
    } else {
      // 標準水平格式 (默認)
      formattedText = applyStandardHorizontalFormat(group, showUnit, showReference);
    }

    navigator.clipboard
      .writeText(formattedText)
      .then(() => {
        setSnackbarMessage("所有檢驗資料已複製到剪貼簿");
        setSnackbarOpen(true);
      })
      .catch((err) => {
        console.error("Failed to copy lab data: ", err);
        setSnackbarMessage("複製失敗，請重試");
        setSnackbarOpen(true);
      });
  };

  // 標準垂直格式處理函數
  const applyStandardVerticalFormat = (group, showUnit, showReference) => {
    // 格式化日期，從 YYYY-MM-DD 轉換為 YYYY/MM/DD
    const formattedDate = formatDate(group.date);
    
    let formattedText = `${formattedDate} - ${group.hosp}\n`;
    
    // 垂直格式：每個項目一行
    group.labs.forEach((lab) => {
      formattedText += `${formatLabItemForCopy(lab, showUnit, showReference)}\n`;
    });
    
    return formattedText;
  };

  // 標準水平格式處理函數
  const applyStandardHorizontalFormat = (group, showUnit, showReference) => {
    // 格式化日期，從 YYYY-MM-DD 轉換為 YYYY/MM/DD
    const formattedDate = formatDate(group.date);
    
    let formattedText = `${formattedDate} - ${group.hosp}\n`;
    
    // 水平格式：項目在同一行，用空格分隔
    let labItems = group.labs.map((lab) => formatLabItemForCopy(lab, showUnit, showReference));
    formattedText += labItems.join(" ");
    
    return formattedText;
  };

  // 複製使用者選擇的檢驗數據的函數
  const handleCopyUserSelectedLabData = (group, groupIndex, selectedLabItems, labSettings) => {
    const { copyLabFormat, showUnit, showReference } = labSettings;

    if (!selectedLabItems[groupIndex]) {
      setSnackbarMessage("未選擇任何項目進行複製");
      setSnackbarOpen(true);
      return;
    }

    // 篩選出被使用者選中的檢驗項目
    const filteredLabs = group.labs.filter((lab, labIndex) => {
      const labId = `${groupIndex}-${labIndex}`;
      return selectedLabItems[groupIndex][labId];
    });

    if (filteredLabs.length === 0) {
      setSnackbarMessage("未選擇任何項目進行複製");
      setSnackbarOpen(true);
      return;
    }

    // 創建一個包含已篩選實驗室項目的新組對象
    const filteredGroup = {
      ...group,
      labs: filteredLabs
    };

    let formattedText = '';

    // 確保自訂格式的設定是完整的
    const customSettingsInfo = {
      format: copyLabFormat,
      hasHeaderFormat: Array.isArray(labSettings.customLabHeaderCopyFormat) && labSettings.customLabHeaderCopyFormat.length > 0,
      hasItemFormat: Array.isArray(labSettings.customLabItemCopyFormat) && labSettings.customLabItemCopyFormat.length > 0,
    };
    console.log("LabCopyFeatures (selected): 處理格式設定:", customSettingsInfo);

    // 檢查是否為自訂格式
    if (copyLabFormat === "customVertical" || copyLabFormat === "customHorizontal") {
      // 使用自訂格式處理器來生成格式化文本
      try {
        // 確保 itemSeparator 值被使用
        console.log("使用的項目分隔字元 (選擇複製):", labSettings.itemSeparator || ', ');
        formattedText = labCopyFormatter.applyCustomFormat(filteredLabs, group, labSettings);
      } catch (error) {
        console.error("應用自訂格式時出錯:", error);
        // 出錯時回退到標準格式
        if (copyLabFormat === "customVertical") {
          formattedText = applyStandardVerticalFormat(filteredGroup, showUnit, showReference);
        } else {
          formattedText = applyStandardHorizontalFormat(filteredGroup, showUnit, showReference);
        }
      }
    } else if (copyLabFormat === "vertical") {
      // 標準垂直格式
      formattedText = applyStandardVerticalFormat(filteredGroup, showUnit, showReference);
    } else {
      // 標準水平格式 (默認)
      formattedText = applyStandardHorizontalFormat(filteredGroup, showUnit, showReference);
    }

    navigator.clipboard
      .writeText(formattedText)
      .then(() => {
        setSnackbarMessage("已選擇的檢驗項目已複製到剪貼簿");
        setSnackbarOpen(true);
      })
      .catch((err) => {
        console.error("Failed to copy selected lab data: ", err);
        setSnackbarMessage("複製失敗，請重試");
        setSnackbarOpen(true);
      });
  };

  return {
    snackbarOpen,
    snackbarMessage,
    handleSnackbarClose,
    handleSectionLabData,
    handleCopyUserSelectedLabData
  };
};