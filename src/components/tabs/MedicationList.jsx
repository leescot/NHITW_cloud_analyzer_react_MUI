import React, { useState, useEffect } from "react";
import { Box, Snackbar } from "@mui/material";
import TypographySizeWrapper from "../utils/TypographySizeWrapper";
import MedicationFilters from "./medication/MedicationFilters";
import MedicationGroup from "./medication/MedicationGroup";
import MedicationTermGroups from "./medication/MedicationTermGroups";
import { medicationProcessor } from "../../utils/medicationProcessor.js";

const MedicationList = ({
  groupedMedications,
  settings,
  medicationCopyFormat,
  generalDisplaySettings,
}) => {
  // 添加 snackbar 狀態
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");

  // 添加訪問類型過濾狀態
  const [selectedVisitType, setSelectedVisitType] = useState("");
  const [availableVisitTypes, setAvailableVisitTypes] = useState([]);
  const [filteredMedications, setFilteredMedications] = useState(groupedMedications);

  // 分類藥物為長期和短期用藥
  const [longTermMeds, setLongTermMeds] = useState([]);
  const [shortTermMeds, setShortTermMeds] = useState([]);

  // 添加搜尋功能狀態
  const [searchText, setSearchText] = useState("");

  // 擷取可用的訪問類型並設置默認選項
  useEffect(() => {
    // 擷取所有不同的訪問類型
    const visitTypes = new Set();
    let hasOutpatient = false;
    let hasEmergency = false;
    let hasInpatient = false;

    groupedMedications.forEach(group => {
      if (group.visitType) {
        visitTypes.add(group.visitType);
        if (group.visitType === "門診") hasOutpatient = true;
        if (group.visitType === "急診") hasEmergency = true;
        if (group.visitType === "住診") hasInpatient = true;
      }
    });

    // 轉換為陣列
    const typesArray = Array.from(visitTypes);
    setAvailableVisitTypes(typesArray);

    // 設置默認選擇
    if (typesArray.length > 1) {
      // 如果同時有門診和急診，默認選擇"門診+急診"
      if (hasOutpatient && hasEmergency) {
        setSelectedVisitType("門診+急診");
      }
      // 否則如果有門診，默認選擇門診
      else if (hasOutpatient) {
        setSelectedVisitType("門診");
      }
      // 否則選擇第一個可用的類型
      else if (typesArray.length > 0) {
        setSelectedVisitType(typesArray[0]);
      }
    } else {
      // 如果只有一種訪問類型或沒有，設置為空字符串（顯示全部）
      setSelectedVisitType("");
    }
  }, [groupedMedications]);

  // 當選擇的訪問類型或搜尋文字變化時過濾藥物
  useEffect(() => {
    // 先用訪問類型過濾
    let visitTypeFiltered = [];

    // 使用 Map 來處理訪問類型過濾邏輯
    const visitTypeFilterMap = new Map([
      ["", () => groupedMedications],
      ["顯示所有項目", () => groupedMedications],
      ["門診+急診", () => groupedMedications.filter(
        group => group.visitType === "門診" || group.visitType === "急診" || group.visitType === "藥局"
      )],
      ["門診", () => groupedMedications.filter(
        group => group.visitType === "門診" || group.visitType === "藥局"
      )],
      // 默認過濾器，處理特定訪問類型的情況
      ["default", (visitType) => groupedMedications.filter(
        group => group.visitType === visitType
      )]
    ]);

    // 擷取對應的過濾函式
    const filterFunc = visitTypeFilterMap.get(selectedVisitType) || 
                      ((visitType) => visitTypeFilterMap.get("default")(visitType));

    // 執行過濾
    visitTypeFiltered = selectedVisitType === "" || selectedVisitType === "顯示所有項目" ? 
                       filterFunc() : 
                       (selectedVisitType === "門診+急診" || selectedVisitType === "門診" ? 
                       filterFunc() : filterFunc(selectedVisitType));

    // 如果有搜尋文字，再進一步過濾藥物
    if (searchText.trim() !== "") {
      const searchLower = searchText.toLowerCase();

      // 針對每個藥物組，只保留符合搜尋條件的藥物
      const searchFiltered = visitTypeFiltered.map(group => {
        // 深複製組資料，但不包含medications
        const newGroup = { ...group };

        // 過濾藥物，只保留符合搜尋條件的
        newGroup.medications = group.medications.filter(med =>
          (med.name && med.name.toLowerCase().includes(searchLower)) ||
          (med.ingredient && med.ingredient.toLowerCase().includes(searchLower))
        );

        return newGroup;
      }).filter(group => group.medications.length > 0); // 只保留有符合藥物的組

      setFilteredMedications(searchFiltered);
    } else {
      // 沒有搜尋文字，只用訪問類型過濾
      setFilteredMedications(visitTypeFiltered);
    }
  }, [selectedVisitType, groupedMedications, searchText]);

  // 當過濾後的藥物變化時，將其分為長期和短期用藥
  useEffect(() => {
    if (settings.separateShortTermMeds) {
      // 定義長期用藥的閾值（14天）
      const LONG_TERM_THRESHOLD = 14;

      // 長期用藥：至少有一種藥物 >= 14天
      const longTerm = filteredMedications.filter(group =>
        group.medications.some(med => parseInt(med.days, 10) >= LONG_TERM_THRESHOLD)
      );

      // 短期用藥：所有藥物 < 14天
      const shortTerm = filteredMedications.filter(group =>
        group.medications.every(med => parseInt(med.days, 10) < LONG_TERM_THRESHOLD)
      );

      setLongTermMeds(longTerm);
      setShortTermMeds(shortTerm);
    }
  }, [filteredMedications, settings.separateShortTermMeds]);

  // 處理訪問類型選擇變化
  const handleVisitTypeChange = (event) => {
    setSelectedVisitType(event.target.value);
  };

  // 處理搜尋文字變化
  const handleSearchChange = (event) => {
    setSearchText(event.target.value);
  };

  // 關閉 snackbar 的函式
  const handleSnackbarClose = () => {
    setSnackbarOpen(false);
  };

  // 複製藥物的函式 - 從 FloatingIcon 移過來
  const handleCopyMedications = (medications, group) => {
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

  // Handle copying all medications function
  const handleCopyAllMedications = () => {
    if (filteredMedications.length === 0 || settings.medicationCopyFormat === "none") {
      setSnackbarMessage("沒有可複製的藥物資料");
      setSnackbarOpen(true);
      return;
    }

    const allFormattedText = filteredMedications.map(group => {
      const groupInfo = {
        date: group.date,
        hosp: group.hosp,
        visitType: group.visitType,
        icd_code: group.icd_code,
        icd_name: group.icd_name,
        showDiagnosis: settings.showDiagnosis,
      };

      return medicationProcessor.formatMedicationList(
        group.medications,
        settings.medicationCopyFormat,
        groupInfo
      );
    }).join("\n\n");

    navigator.clipboard
      .writeText(allFormattedText)
      .then(() => {
        setSnackbarMessage("所有藥物資料已複製到剪貼簿");
        setSnackbarOpen(true);
      })
      .catch((err) => {
        console.error("Failed to copy all medications: ", err);
        setSnackbarMessage("複製失敗，請重試");
        setSnackbarOpen(true);
      });
  };

  // 判斷藥物所屬顏色的函式
  const getMedicationColor = (medication) => {
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

    // 使用 Map 來映射顏色組名到顏色值
    const colorMap = new Map([
      ['red', { name: 'red', color: '#f44336' }],
      ['orange', { name: 'orange', color: '#ed6c02' }],
      ['green', { name: 'green', color: '#2e7d32' }]
    ]);

    // 檢查群組是否在各顏色組中
    if (colorGroups.red && colorGroups.red.includes(groupName)) {
      return colorMap.get('red');
    } else if (colorGroups.orange && colorGroups.orange.includes(groupName)) {
      return colorMap.get('orange');
    } else if (colorGroups.green && colorGroups.green.includes(groupName)) {
      return colorMap.get('green');
    }

    return null;
  };

  // 判斷藥物是否應該以粗體顯示的函式
  const shouldBeBold = (medication) => {
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

  // 根據看診類型擷取顏色
  const getVisitTypeColor = (visitType) => {
    // 使用 Map 取代 switch 結構
    const visitTypeColorMap = new Map([
      ["急診", "#c62828"], // 較柔和的紅色
      ["住診", "#388e3c"], // 較柔和的綠色
      ["門診", "primary.main"], // 預設藍色
      // 其他任何未定義的訪問類型默認為 primary.main
      ["default", "primary.main"]
    ]);

    // 返回相應顏色或默認顏色
    return visitTypeColorMap.get(visitType) || visitTypeColorMap.get("default");
  };

  // Add new function to handle drug image link click
  const handleDrugImageClick = (drugcode) => {
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

  return (
    <>
      {groupedMedications.length === 0 ? (
        <TypographySizeWrapper
          variant="body2"
          textSizeType="content"
          generalDisplaySettings={generalDisplaySettings}
          color="text.secondary"
        >
          沒有找到用藥資料
        </TypographySizeWrapper>
      ) : (
        <>
          {/* 搜尋欄和訪問類型過濾選項 */}
          <MedicationFilters
            searchText={searchText}
            handleSearchChange={handleSearchChange}
            selectedVisitType={selectedVisitType}
            handleVisitTypeChange={handleVisitTypeChange}
            availableVisitTypes={availableVisitTypes}
            generalDisplaySettings={generalDisplaySettings}
            settings={settings}
            onCopyAll={handleCopyAllMedications}
          />

          {filteredMedications.length === 0 ? (
            <TypographySizeWrapper
              variant="body2"
              textSizeType="content"
              generalDisplaySettings={generalDisplaySettings}
              color="text.secondary"
            >
              沒有找到符合條件的用藥資料
            </TypographySizeWrapper>
          ) : (
            settings.separateShortTermMeds && (selectedVisitType === "門診+急診" || selectedVisitType === "門診" || (selectedVisitType === "" && availableVisitTypes.length === 1 && availableVisitTypes.includes("門診"))) ? (
              // 兩欄顯示 - 分為長期和短期用藥
              <MedicationTermGroups
                longTermMeds={longTermMeds}
                shortTermMeds={shortTermMeds}
                settings={settings}
                copyFormat={medicationCopyFormat}
                generalDisplaySettings={generalDisplaySettings}
                setSnackbarMessage={setSnackbarMessage}
                setSnackbarOpen={setSnackbarOpen}
              />
            ) : (
              // 單欄顯示
              filteredMedications.map((group, index) => (
                <MedicationGroup
                  key={index}
                  group={group}
                  settings={settings}
                  copyFormat={medicationCopyFormat}
                  generalDisplaySettings={generalDisplaySettings}
                  isLast={index === filteredMedications.length - 1}
                  setSnackbarMessage={setSnackbarMessage}
                  setSnackbarOpen={setSnackbarOpen}
                />
              ))
            )
          )}
        </>
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

export default MedicationList;