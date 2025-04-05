import { useState } from 'react';
import { formatLabItemForCopy, formatDate } from '../../utils/lab/LabUtilities';

// Custom hook for handling copy functionality
export const useCopyLabData = () => {
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");

  // 關閉 snackbar 的函數
  const handleSnackbarClose = () => {
    setSnackbarOpen(false);
  };

  // 複製所有檢驗數據的函數
  const handleCopyAllLabData = (group, labSettings) => {
    const { copyLabFormat, showUnit, showReference } = labSettings;

    // 格式化日期，從 YYYY-MM-DD 轉換為 YYYY/MM/DD
    const formattedDate = formatDate(group.date);

    let formattedText = `${formattedDate} - ${group.hosp}\n`;

    // Format based on copyLabFormat setting
    if (copyLabFormat === "vertical") {
      // Vertical format: each lab item on a new line
      group.labs.forEach((lab) => {
        formattedText += `${formatLabItemForCopy(lab, showUnit, showReference)}\n`;
      });
    } else {
      // Horizontal format: lab items on the same line, separated by spaces
      let labItems = group.labs.map((lab) => formatLabItemForCopy(lab, showUnit, showReference));
      formattedText += labItems.join(" ");
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

    // 生成複製文本
    // 格式化日期，從 YYYY-MM-DD 轉換為 YYYY/MM/DD
    const formattedDate = formatDate(group.date);

    let formattedText = `${formattedDate} - ${group.hosp}\n`;

    // 根據複製格式處理
    if (copyLabFormat === "vertical") {
      // 直式格式
      filteredLabs.forEach((lab) => {
        formattedText += `${formatLabItemForCopy(lab, showUnit, showReference)}\n`;
      });
    } else {
      // 橫式格式
      let labItems = filteredLabs.map((lab) => formatLabItemForCopy(lab, showUnit, showReference));
      formattedText += labItems.join(" ");
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
    handleCopyAllLabData,
    handleCopyUserSelectedLabData
  };
};