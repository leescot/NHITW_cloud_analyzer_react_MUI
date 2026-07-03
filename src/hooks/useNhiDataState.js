// useNhiDataState.js
// NHI 醫療資料的 React 狀態：14 個資料 state + handleData 載入管線。
// 觸發機制維持 dataFetchCompleted 事件（由 FloatingIcon 的 useSettingsState 監聽後呼叫
// 本 hook 回傳的 handleData）——不用 dataStore.subscribe，因 store 為逐型別通知，
// 一次批次抓取會觸發 14 次重處理；事件為批次後單發，語意正確。
import { useState, useEffect } from "react";

import { collectDataSources, handleAllData } from "../utils/dataManager";
import { ckmProcessor } from "../utils/ckmProcessor";
import { buildUserInfoFromLocal } from "../utils/ageUtils";

export function useNhiDataState({ appSettingsRef, labSettings, userInfo, setUserInfo }) {
  const [groupedMedications, setGroupedMedications] = useState([]);
  const [groupedLabs, setGroupedLabs] = useState([]);
  const [groupedChineseMeds, setGroupedChineseMeds] = useState([]);
  const [imagingData, setImagingData] = useState({
    withReport: [],
    withoutReport: [],
  });
  const [allergyData, setAllergyData] = useState([]);
  const [surgeryData, setSurgeryData] = useState([]);
  const [dischargeData, setDischargeData] = useState([]);
  const [medDaysData, setMedDaysData] = useState([]);
  const [dashboardData, setDashboardData] = useState({
    visitCount: 0,
    diagnoses: [],
    recentMedications: { western: [], chinese: [] },
    labSummary: {},
  });
  const [adultHealthCheckData, setAdultHealthCheckData] = useState(null);
  const [cancerScreeningData, setCancerScreeningData] = useState(null);
  const [hbcvData, setHbcvData] = useState(null);
  const [ckmData, setCkmData] = useState(null);
  const [patientSummaryData, setPatientSummaryData] = useState([]);

  // 在組件載入時處理資料
  const handleData = async () => {
    // 使用dataManager收集資料來源
    const dataSources = collectDataSources();

    // 創建所有setter函數的對象
    const setters = {
      setGroupedMedications,
      setGroupedLabs,
      setGroupedChineseMeds,
      setImagingData,
      setAllergyData,
      setSurgeryData,
      setDischargeData,
      setMedDaysData,
      setPatientSummaryData,
      setDashboardData,
      setAdultHealthCheckData,
      setCancerScreeningData,
      setHbcvData,
    };

    // 使用dataManager處理所有資料
    const results = await handleAllData(dataSources, appSettingsRef.current, setters);

    // CKM 資料處理（跨資料源篩選，不受設定開關影響，UI 層條件渲染）
    try {
      const ckm = ckmProcessor.processCKMData({
        groupedMedications: results?.medications || [],
        rawLabData: dataSources.labData,
        imagingData: results?.imaging || { withReport: [], withoutReport: [] },
        dischargeData: results?.discharge || [],
      });
      setCkmData(ckm);
    } catch (e) {
      console.error('[CKM] processCKMData error', e);
    }

    // 本地 JSON 匯入時重新取得使用者資訊(換人時必須更新顯示;同人不重複觸發 render)
    if (window._localUserInfo) {
      const localInfo = buildUserInfoFromLocal(window._localUserInfo);
      if (!userInfo || userInfo.userId !== localInfo.userId || userInfo.name !== localInfo.name) {
        setUserInfo(localInfo);
      }
    }
  };

  // 初始數據加載
  useEffect(() => {
    // 初次執行
    handleData();
  }, [labSettings]); // 保留對 lab 設置的依賴，以便在 lab 設置變更時重新處理數據

  return {
    groupedMedications,
    groupedLabs,
    groupedChineseMeds,
    imagingData,
    allergyData,
    surgeryData,
    dischargeData,
    medDaysData,
    dashboardData,
    adultHealthCheckData,
    cancerScreeningData,
    hbcvData,
    ckmData,
    patientSummaryData,
    handleData,
    setGroupedMedications,
    setGroupedLabs,
    setGroupedChineseMeds,
  };
}
