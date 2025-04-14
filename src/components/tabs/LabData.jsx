import React, { useState, useEffect } from "react";
import { Box, Divider, Snackbar } from "@mui/material";
import TypographySizeWrapper from "../utils/TypographySizeWrapper";

// 引入拆分出的子組件
import { useCopyLabData } from "./lab/LabCopyFeatures";
import LabHeader from "./lab/LabHeader";
import TypeBasedLayout from "./lab/TypeBasedLayout";
import { VerticalLayout, HorizontalLayout, MultiColumnLayout } from "./lab/LayoutComponents";
import LabSearch from "./lab/LabSearch";
import { formatLabItemForCopy, formatDate } from "../utils/lab/LabUtilities";
import { labCopyFormatter } from "../../utils/labCopyFormatter";

const LabData = ({ groupedLabs, settings, labSettings, generalDisplaySettings }) => {
  // Add detailed logging to see what's coming in from props
  console.log("LabData props:", { settings, labSettings, displayLabFormat: labSettings?.displayLabFormat });
  
  // 添加搜尋功能狀態
  const [searchText, setSearchText] = useState("");
  const [filteredGroupedLabs, setFilteredGroupedLabs] = useState(groupedLabs);
  
  // 處理搜尋文字變化
  const handleSearchChange = (event) => {
    setSearchText(event.target.value);
  };
  
  // 當搜尋文字變化時過濾檢驗項目
  useEffect(() => {
    if (searchText.trim() === "") {
      setFilteredGroupedLabs(groupedLabs);
      return;
    }
    
    const searchLower = searchText.toLowerCase();
    
    // 針對每個檢驗組，只保留符合搜尋條件的檢驗項目
    const searchFiltered = groupedLabs.map(group => {
      // 深複製組資料，但不包含labs
      const newGroup = { ...group };
      
      // 過濾檢驗項目，只保留符合搜尋條件的
      newGroup.labs = group.labs.filter(lab =>
        (lab.orderName && lab.orderName.toLowerCase().includes(searchLower)) ||
        (lab.orderCode && lab.orderCode.toLowerCase().includes(searchLower)) ||
        (lab.abbrName && lab.abbrName.toLowerCase().includes(searchLower)) ||
        (lab.itemName && lab.itemName.toLowerCase().includes(searchLower))
      );
      
      return newGroup;
    }).filter(group => group.labs.length > 0); // 只保留有符合檢驗項目的組
    
    setFilteredGroupedLabs(searchFiltered);
  }, [searchText, groupedLabs]);

  // Function to map format names (handles legacy formats and ensures valid values)
  const mapFormatName = (format) => {
    // Log format value for debugging
    console.log("FORMAT VALUE TO MAP:", format);

    // Check if format is undefined or null, return default
    if (format === undefined || format === null) {
      console.log("FORMAT UNDEFINED/NULL, RETURNING DEFAULT");
      return 'byType';
    }

    // Map of supported format names
    const formatMap = {
      'columns': 'twoColumn',    // Legacy format name
      'column': 'twoColumn',     // Handle possible typo
      'twoColumn': 'twoColumn',
      'threeColumn': 'threeColumn',
      'byType': 'byType',
      'vertical': 'vertical',
      'horizontal': 'horizontal'
    };

    // Check if this is a valid format and return mapped value (or default)
    if (formatMap[format]) {
      console.log(`MAPPED FORMAT from ${format} to ${formatMap[format]}`);
      return formatMap[format];
    } else {
      console.log(`INVALID FORMAT: ${format}, DEFAULTING TO byType`);
      return 'byType';
    }
  };

  // Ensure all required properties exist in labSettings with defaults
  const completeLabSettings = {
    showUnit: false,
    showReference: false,
    enableLabAbbrev: true,
    highlightAbnormal: true,
    copyLabFormat: 'horizontal',
    enableLabChooseCopy: false,
    labChooseCopyItems: [],
    enableLabCopyAll: false,
    ...labSettings,
    // Ensure display format is properly mapped
    displayLabFormat: mapFormatName(labSettings?.displayLabFormat)
  };

  // Log to help debug the display format
  console.log("Lab settings after merge:", completeLabSettings);
  console.log("Original format in props:", labSettings?.displayLabFormat);
  console.log("Mapped display format:", completeLabSettings.displayLabFormat);

  // Add an effect to respond to labSettings changes
  useEffect(() => {
    console.log("labSettings prop changed:", labSettings);
    console.log("Current displayLabFormat:", labSettings?.displayLabFormat);
  }, [labSettings]);

  // 使用自定義 Hook 處理複製功能
  const {
    snackbarOpen,
    snackbarMessage,
    handleSnackbarClose,
    handleSectionLabData: copySectionLabData,
    handleCopyUserSelectedLabData: copyUserSelectedLabData
  } = useCopyLabData();

  // 添加檢驗項目選擇狀態
  // 使用 Map 來追蹤每個組別中選中的項目 { groupIndex: { labId: boolean } }
  const [selectedLabItems, setSelectedLabItems] = useState({});

  // 初始化選擇狀態 (基於 labChooseCopyItems)
  // 當 enableLabChooseCopy 為 true 時，預先選中 labChooseCopyItems 中的項目
  useEffect(() => {
    if (completeLabSettings.enableLabChooseCopy && groupedLabs.length > 0) {
      const initialSelections = {};

      // 創建特殊檢驗項目判斷邏輯的 Map
      // # zh-TW: 建立特殊檢驗代碼與其對應條件的對照表
      const specialOrderCodesMap = new Map([
        ['08011C', new Map([
          ['08011C-WBC', lab => 
            lab.itemName?.toLowerCase().includes('wbc') || 
            lab.itemName?.toLowerCase().includes('白血球')],
          ['08011C-Hb', lab => 
            lab.itemName?.toLowerCase().includes('hb') || 
            lab.itemName?.toLowerCase().includes('hgb') || 
            lab.itemName?.toLowerCase().includes('血色素') || 
            lab.itemName?.toLowerCase().includes('hemoglobin')],
          ['08011C-Platelet', lab => 
            lab.itemName?.toLowerCase().includes('plt') || 
            lab.itemName?.toLowerCase().includes('platelet') || 
            lab.itemName?.toLowerCase().includes('血小板')]
        ])],
        ['09015C', new Map([
          ['09015C', () => true]  // 對於09015C代碼，總是選中
        ])],
        ['09040C', new Map([
          ['09040C', lab => 
            lab.abbrName === 'UPCR' || 
            (lab.itemName && (
              lab.itemName.includes('UPCR') || 
              lab.itemName.includes('蛋白/肌酸酐比值') || 
              lab.itemName.includes('protein/Creatinine')
            ))]
        ])],
        ['12111C', new Map([
          ['12111C', lab => 
            lab.abbrName === 'UACR' || 
            (lab.itemName && (
              lab.itemName.toLowerCase().includes('u-acr') || 
              lab.itemName.toLowerCase().includes('albumin/creatinine') || 
              lab.itemName.toLowerCase().includes('/cre')
            ))]
        ])]
      ]);

      groupedLabs.forEach((group, groupIndex) => {
        initialSelections[groupIndex] = {};

        group.labs.forEach((lab, labIndex) => {
          const labId = `${groupIndex}-${labIndex}`;
          let isPreselected = false;

          // 檢查此檢驗項目是否在 labChooseCopyItems 中並且啟用
          if (completeLabSettings.labChooseCopyItems && Array.isArray(completeLabSettings.labChooseCopyItems)) {
            const enabledOrderCodes = completeLabSettings.labChooseCopyItems
              .filter(item => item.enabled)
              .map(item => item.orderCode);

            // 使用 Map 處理特殊代碼邏輯
            // # zh-TW: 檢查是否為特殊處理的檢驗代碼
            if (specialOrderCodesMap.has(lab.orderCode)) {
              const specialConditions = specialOrderCodesMap.get(lab.orderCode);
              // # zh-TW: 遍歷特殊代碼的所有條件
              for (const [code, conditionFn] of specialConditions.entries()) {
                if (enabledOrderCodes.includes(code) && conditionFn(lab)) {
                  isPreselected = true;
                  break;
                }
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
  }, [completeLabSettings.enableLabChooseCopy, completeLabSettings.labChooseCopyItems, groupedLabs]);

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
  const handleSectionLabData = (group) => {
    copySectionLabData(group, completeLabSettings);
  };

  const handleCopyUserSelectedLabData = (group, groupIndex) => {
    copyUserSelectedLabData(group, groupIndex, selectedLabItems, completeLabSettings);
  };

  // 處理複製所有檢驗數據的函數
  const handleCopyAllLabData = () => {
    if (filteredGroupedLabs.length === 0) {
      setSnackbarMessage("沒有可複製的檢驗資料");
      setSnackbarOpen(true);
      return;
    }

    // 根據 copyLabFormat 決定如何格式化
    const { copyLabFormat, showUnit, showReference } = completeLabSettings;
    let allFormattedText = '';

    // 創建格式化函數映射
    const formatFunctions = {
      vertical: () => {
        // 垂直格式: 每個組一個區塊，每個項目一行
        return filteredGroupedLabs.map(group => {
          // 標準垂直格式生成
          const formattedDate = formatDate(group.date);
          let groupText = `${formattedDate} - ${group.hosp}\n`;
          
          // 垂直格式：每個項目一行
          group.labs.forEach((lab) => {
            groupText += `${formatLabItemForCopy(lab, showUnit, showReference)}\n`;
          });
          
          return groupText;
        }).join("\n");
      },
      horizontal: () => {
        // 水平格式: 每個組一個區塊，項目在同一行
        return filteredGroupedLabs.map(group => {
          // 標準水平格式生成
          const formattedDate = formatDate(group.date);
          let groupText = `${formattedDate} - ${group.hosp}\n`;
          
          // 水平格式：項目在同一行，用空格分隔
          let labItems = group.labs.map((lab) => formatLabItemForCopy(lab, showUnit, showReference));
          groupText += labItems.join(" ");
          
          return groupText;
        }).join("\n\n");
      },
      customVertical: () => {
        // 嘗試使用自定義格式，如果失敗則回退到標準垂直格式
        try {
          return filteredGroupedLabs.map(group => {
            return labCopyFormatter.applyCustomFormat(group.labs, group, completeLabSettings);
          }).join("\n\n");
        } catch (error) {
          console.error("應用自定義格式時出錯:", error);
          return formatFunctions.vertical();
        }
      },
      customHorizontal: () => {
        // 嘗試使用自定義格式，如果失敗則回退到標準水平格式
        try {
          return filteredGroupedLabs.map(group => {
            return labCopyFormatter.applyCustomFormat(group.labs, group, completeLabSettings);
          }).join("\n\n");
        } catch (error) {
          console.error("應用自定義格式時出錯:", error);
          return formatFunctions.horizontal();
        }
      },
      default: () => formatFunctions.horizontal() // 默認使用水平格式
    };

    // 選擇格式化函數
    const formatFunction = formatFunctions[copyLabFormat] || formatFunctions.default;
    
    // 執行格式化
    allFormattedText = formatFunction();

    // 複製到剪貼簿
    navigator.clipboard
      .writeText(allFormattedText)
      .then(() => {
        setSnackbarMessage("所有檢驗資料已複製到剪貼簿");
        setSnackbarOpen(true);
      })
      .catch((err) => {
        console.error("Failed to copy all lab data: ", err);
        setSnackbarMessage("複製失敗，請重試");
        setSnackbarOpen(true);
      });
  };

  // 使用 Map 來取代 switch-case 結構
  // # zh-TW: 使用 Map 定義不同顯示格式對應的欄數
  const columnCountMap = new Map([
    ["twoColumn", 2],
    ["threeColumn", 3],
    ["byType", 0],  // 特殊情況，按類型分群
    ["default", 1]  // 'vertical' 或其他情況
  ]);

  // 確定欄數設置
  const getColumnCount = () => {
    return columnCountMap.get(completeLabSettings.displayLabFormat) || columnCountMap.get("default");
  };

  // 使用 Map 來儲存不同的布局組件
  // # zh-TW: 使用 Map 來決定要渲染的布局組件
  const layoutComponentMap = new Map([
    ["byType", (group, index) => (
      <TypeBasedLayout
        labs={group.labs}
        groupIndex={index}
        selectedLabItems={selectedLabItems}
        handleToggleLabItem={handleToggleLabItem}
        generalDisplaySettings={generalDisplaySettings}
        labSettings={completeLabSettings}
      />
    )],
    ["horizontal", (group, index) => (
      <HorizontalLayout
        labs={group.labs}
        groupIndex={index}
        generalDisplaySettings={generalDisplaySettings}
        labSettings={completeLabSettings}
      />
    )],
    ["twoColumn", (group, index) => (
      <MultiColumnLayout
        labs={group.labs}
        columnCount={2}
        groupIndex={index}
        selectedLabItems={selectedLabItems}
        handleToggleLabItem={handleToggleLabItem}
        generalDisplaySettings={generalDisplaySettings}
        labSettings={completeLabSettings}
      />
    )],
    ["threeColumn", (group, index) => (
      <MultiColumnLayout
        labs={group.labs}
        columnCount={3}
        groupIndex={index}
        selectedLabItems={selectedLabItems}
        handleToggleLabItem={handleToggleLabItem}
        generalDisplaySettings={generalDisplaySettings}
        labSettings={completeLabSettings}
      />
    )],
    ["vertical", (group, index) => (
      <VerticalLayout
        labs={group.labs}
        groupIndex={index}
        selectedLabItems={selectedLabItems}
        handleToggleLabItem={handleToggleLabItem}
        generalDisplaySettings={generalDisplaySettings}
        labSettings={completeLabSettings}
      />
    )]
  ]);

  // 決定要使用哪種布局
  // # zh-TW: 根據設定和條件決定要使用的布局類型
  const getLayoutComponent = (group, index) => {
    // 直接使用 Map 來獲取對應的布局組件
    const layoutRenderer = layoutComponentMap.get(completeLabSettings.displayLabFormat);
    if (layoutRenderer) {
      return layoutRenderer(group, index);
    }
    // 默認使用垂直布局
    return layoutComponentMap.get("vertical")(group, index);
  };

  return (
    <>
      {/* 添加搜尋欄 */}
      <LabSearch 
        searchText={searchText}
        handleSearchChange={handleSearchChange}
        generalDisplaySettings={generalDisplaySettings}
        labSettings={completeLabSettings}
        onCopyAll={handleCopyAllLabData}
      />
      
      {filteredGroupedLabs.length === 0 ? (
        <TypographySizeWrapper
          color="text.secondary"
          variant="body2"
          textSizeType="content"
          generalDisplaySettings={generalDisplaySettings}
        >
          {searchText.trim() !== "" ? "沒有找到符合搜尋條件的檢驗資料" : "沒有找到檢驗資料"}
        </TypographySizeWrapper>
      ) : (
        filteredGroupedLabs.map((group, index) => (
          <Box key={index} sx={{ mb: 2 }}>
            {/* 檢驗數據標題區域 - 使用提取出的 LabHeader 組件 */}
            <LabHeader
              group={group}
              index={index}
              settings={settings}
              labSettings={completeLabSettings}
              generalDisplaySettings={generalDisplaySettings}
              handleSectionLabData={handleSectionLabData}
              handleCopyUserSelectedLabData={handleCopyUserSelectedLabData}
              hasSelectedItems={hasSelectedItems}
            />

            {/* 根據設置選擇顯示格式，使用 Map 優化邏輯 */}
            <Box sx={{ ml: 2, mb: 1 }}>
              {getLayoutComponent(group, index)}
            </Box>

            {index < filteredGroupedLabs.length - 1 && <Divider sx={{ my: 1.5 }} />}
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