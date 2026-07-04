import { useState, useEffect } from "react";
import { Snackbar } from "@mui/material";
import TypographySizeWrapper from "../utils/TypographySizeWrapper";
import MedicationFilters from "./medication/MedicationFilters";
import MedicationGroup from "./medication/MedicationGroup";
import MedicationTermGroups from "./medication/MedicationTermGroups";
import { medicationProcessor } from "../../utils/medicationProcessor.js";

const MedicationList = ({
  groupedMedications,
  settings,
  medicationCopyFormat,
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

  // 獲取可用的訪問類型並設置默認選項
  useEffect(() => {
    // 獲取所有不同的訪問類型
    const visitTypes = new Set();
    let hasOutpatient = false;
    let hasEmergency = false;

    groupedMedications.forEach(group => {
      if (group.visitType) {
        visitTypes.add(group.visitType);
        if (group.visitType === "門診") hasOutpatient = true;
        if (group.visitType === "急診") hasEmergency = true;
      }
    });

    // 轉換為數組
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

    // 獲取對應的過濾函數
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

  // 關閉 snackbar 的函數
  const handleSnackbarClose = () => {
    setSnackbarOpen(false);
  };

  // Handle copying all medications function
  const handleCopyAllMedications = () => {
    if (filteredMedications.length === 0 || settings.medicationCopyFormat === "none") {
      setSnackbarMessage("沒有可複製的藥物資料");
      setSnackbarOpen(true);
      return;
    }

    const medsToProcess = settings.medicationCopyAllOrder === 'oldToNew'
      ? [...filteredMedications].reverse()
      : filteredMedications;

    const allFormattedText = medsToProcess.map(group => {
      const groupInfo = {
        date: group.date,
        hosp: group.hosp,
        visitType: group.visitType,
        icd_code: group.icd_code,
        icd_name: group.icd_name,
        showDiagnosis: settings.showDiagnosis,
        customMedicationHeaderCopyFormat: settings.customMedicationHeaderCopyFormat,
        customMedicationDrugCopyFormat: settings.customMedicationDrugCopyFormat,
        drugSeparator: settings.drugSeparator,
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

  return (
    <>
      {groupedMedications.length === 0 ? (
        <TypographySizeWrapper
          variant="body2"
          textSizeType="content"
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
            settings={settings}
            onCopyAll={handleCopyAllMedications}
          />

          {filteredMedications.length === 0 ? (
            <TypographySizeWrapper
              variant="body2"
              textSizeType="content"
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