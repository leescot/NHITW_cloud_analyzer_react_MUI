import React, { useState, useEffect } from "react";
import { Box, Divider, Snackbar } from "@mui/material";
import TypographySizeWrapper from "../utils/TypographySizeWrapper";

// 引入拆分出的子組件
import { useCopyLabData } from "./lab/LabCopyFeatures";
import LabHeader from "./lab/LabHeader";
import TypeBasedLayout from "./lab/TypeBasedLayout";
import { VerticalLayout, HorizontalLayout, MultiColumnLayout } from "./lab/LayoutComponents";

const LabData = ({ groupedLabs, settings, labSettings, generalDisplaySettings }) => {
  // console.log("LabData rendering with lab settings:", labSettings);
  
  // Ensure all required properties exist in labSettings with defaults
  const completeLabSettings = {
    displayFormat: 'byType',
    showUnit: false,
    showReference: false,
    enableAbbrev: true, 
    highlightAbnormal: true,
    copyFormat: 'horizontal',
    enableCustomCopy: false,
    customCopyItems: [],
    ...labSettings
  };
  
  // 使用自定義 Hook 處理複製功能
  const {
    snackbarOpen, 
    snackbarMessage, 
    handleSnackbarClose, 
    handleCopyAllLabData: copyAllLabData, 
    handleCopyUserSelectedLabData: copyUserSelectedLabData
  } = useCopyLabData();
  
  // 添加檢驗項目選擇狀態
  // 使用 Map 來追蹤每個組別中選中的項目 { groupIndex: { labId: boolean } }
  const [selectedLabItems, setSelectedLabItems] = useState({});

  // 初始化選擇狀態 (基於 customCopyItems)
  // 當 enableCustomCopy 為 true 時，預先選中 customCopyItems 中的項目
  useEffect(() => {
    if (completeLabSettings.enableCustomCopy && groupedLabs.length > 0) {
      const initialSelections = {};
      
      groupedLabs.forEach((group, groupIndex) => {
        initialSelections[groupIndex] = {};
        
        group.labs.forEach((lab, labIndex) => {
          const labId = `${groupIndex}-${labIndex}`;
          let isPreselected = false;
          
          // 檢查此檢驗項目是否在 customCopyItems 中並且啟用
          if (completeLabSettings.customCopyItems && Array.isArray(completeLabSettings.customCopyItems)) {
            const enabledOrderCodes = completeLabSettings.customCopyItems
              .filter(item => item.enabled)
              .map(item => item.orderCode);
            
            // 特殊處理 08011C (WBC, Hb, Platelet)
            if (lab.orderCode === '08011C') {
              if (enabledOrderCodes.includes('08011C-WBC') && 
                  (lab.itemName?.toLowerCase().includes('wbc') || 
                   lab.itemName?.toLowerCase().includes('白血球'))) {
                isPreselected = true;
              }
              if (enabledOrderCodes.includes('08011C-Hb') && 
                  (lab.itemName?.toLowerCase().includes('hb') || 
                   lab.itemName?.toLowerCase().includes('hgb') || 
                   lab.itemName?.toLowerCase().includes('血色素') || 
                   lab.itemName?.toLowerCase().includes('Hemoglobin'))) {
                isPreselected = true;
              }
              if (enabledOrderCodes.includes('08011C-Platelet') && 
                  (lab.itemName?.toLowerCase().includes('plt') || 
                   lab.itemName?.toLowerCase().includes('platelet') || 
                   lab.itemName?.toLowerCase().includes('血小板'))) {
                isPreselected = true;
              }
            }
            // 特殊處理 09015C (Cr 和 GFR)
            else if (lab.orderCode === '09015C') {
              if (enabledOrderCodes.includes('09015C')) {
                isPreselected = true;
              }
            }
            // 特殊處理 09040C (UPCR)
            else if (lab.orderCode === '09040C') {
              if (enabledOrderCodes.includes('09040C') && 
                  (lab.abbrName === 'UPCR' || 
                  (lab.itemName && (lab.itemName.includes('UPCR') || 
                                    lab.itemName.includes('蛋白/肌酸酐比值') ||
                                    lab.itemName.includes('protein/Creatinine'))))) {
                isPreselected = true;
              }
            }
            // 特殊處理 12111C (UACR)
            else if (lab.orderCode === '12111C') {
              if (enabledOrderCodes.includes('12111C') && 
                  (lab.abbrName === 'UACR' || 
                  (lab.itemName && (lab.itemName.toLowerCase().includes('u-acr') || 
                                    lab.itemName.toLowerCase().includes('albumin/creatinine') ||
                                    lab.itemName.toLowerCase().includes('/cre'))))) {
                isPreselected = true;
              }
            }
            // 標準處理其他項目
            else if (enabledOrderCodes.includes(lab.orderCode)) {
              isPreselected = true;
            }
          }
          
          initialSelections[groupIndex][labId] = isPreselected;
        });
      });
      
      setSelectedLabItems(initialSelections);
    }
  }, [completeLabSettings.enableCustomCopy, completeLabSettings.customCopyItems, groupedLabs]);

  // 切換檢驗項目選擇狀態
  const handleToggleLabItem = (groupIndex, labIndex) => {
    const labId = `${groupIndex}-${labIndex}`;
    
    setSelectedLabItems(prev => {
      const updatedSelections = {...prev};
      
      if (!updatedSelections[groupIndex]) {
        updatedSelections[groupIndex] = {};
      }
      
      updatedSelections[groupIndex][labId] = !updatedSelections[groupIndex][labId];
      
      return updatedSelections;
    });
  };

  // 檢查是否有選擇的檢驗項目
  const hasSelectedItems = (groupIndex) => {
    if (!selectedLabItems[groupIndex]) return false;
    
    return Object.values(selectedLabItems[groupIndex]).some(selected => selected);
  };

  // 將複製處理函數封裝，加入必要的參數
  const handleCopyAllLabData = (group) => {
    copyAllLabData(group, completeLabSettings);
  };

  const handleCopyUserSelectedLabData = (group, groupIndex) => {
    copyUserSelectedLabData(group, groupIndex, selectedLabItems, completeLabSettings);
  };

  // 確定欄數設置 (可以根據需要調整)
  const getColumnCount = () => {
    switch(completeLabSettings.displayFormat) {
      case "twoColumn": return 2;
      case "threeColumn": return 3;
      case "fourColumn": return 4;
      case "byType": return 0; // 特殊情況，按類型分群
      default: return 1; // 'vertical' 或其他情況
    }
  };
  
  return (
    <>
      {groupedLabs.length === 0 ? (
        <TypographySizeWrapper 
          color="text.secondary" 
          variant="body2"
          textSizeType="content"
          generalDisplaySettings={generalDisplaySettings}
        >
          沒有找到檢驗資料
        </TypographySizeWrapper>
      ) : (
        groupedLabs.map((group, index) => (
          <Box key={index} sx={{ mb: 2 }}>
            {/* 檢驗數據標題區域 - 使用提取出的 LabHeader 組件 */}
            <LabHeader 
              group={group}
              index={index}
              settings={settings}
              labSettings={completeLabSettings}
              generalDisplaySettings={generalDisplaySettings}
              handleCopyAllLabData={handleCopyAllLabData}
              handleCopyUserSelectedLabData={handleCopyUserSelectedLabData}
              hasSelectedItems={hasSelectedItems}
            />

            {/* 根據設置選擇顯示格式 */}
            <Box sx={{ ml: 2, mb: 1 }}>
              {completeLabSettings.displayFormat === "byType" ? (
                // 按類型分組顯示 - 使用提取出的 TypeBasedLayout 組件
                <TypeBasedLayout
                  labs={group.labs}
                  groupIndex={index}
                  selectedLabItems={selectedLabItems}
                  handleToggleLabItem={handleToggleLabItem}
                  generalDisplaySettings={generalDisplaySettings}
                  labSettings={completeLabSettings}
                />
              ) : completeLabSettings.displayFormat === "horizontal" ? (
                // 橫式布局 - 使用提取出的 HorizontalLayout 組件
                <HorizontalLayout
                  labs={group.labs}
                  groupIndex={index}
                  generalDisplaySettings={generalDisplaySettings}
                  labSettings={completeLabSettings}
                />
              ) : getColumnCount() > 1 ? (
                // 多欄布局 - 使用提取出的 MultiColumnLayout 組件
                <MultiColumnLayout
                  labs={group.labs}
                  columnCount={getColumnCount()}
                  groupIndex={index}
                  selectedLabItems={selectedLabItems}
                  handleToggleLabItem={handleToggleLabItem}
                  generalDisplaySettings={generalDisplaySettings}
                  labSettings={completeLabSettings}
                />
              ) : (
                // 垂直布局 - 使用提取出的 VerticalLayout 組件
                <VerticalLayout
                  labs={group.labs}
                  groupIndex={index}
                  selectedLabItems={selectedLabItems}
                  handleToggleLabItem={handleToggleLabItem}
                  generalDisplaySettings={generalDisplaySettings}
                  labSettings={completeLabSettings}
                />
              )}
            </Box>

            {index < groupedLabs.length - 1 && <Divider sx={{ my: 1.5 }} />}
          </Box>
        ))
      )}
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={2000}
        onClose={handleSnackbarClose}
        message={snackbarMessage}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      />
    </>
  );
};

export default LabData;