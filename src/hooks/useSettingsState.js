// useSettingsState.js
// 設定狀態與三種監聽器（chrome.storage 設定變更、runtime 訊息、dataFetchCompleted）。
// openRef/appSettingsRef 供掛載一次的 listener 讀取最新值（stale closure 修復模式，勿改）。
//
// nhiDataRef 循環依賴解法：useNhiDataState 需要本 hook 的 appSettingsRef，本 hook（掛載一次
// 的 listener）需要呼叫 useNhiDataState 回傳的 handleData / setGroupedXxx。FloatingIcon 建立一個
// 空的 nhiDataRef 傳入本 hook，待 useNhiDataState 執行後才把回傳值指派給 nhiDataRef.current；
// 本 hook 內部的 listener 一律透過 nhiDataRef.current.xxx 存取，因為 listener 只在非同步事件
// （storage 變更、runtime 訊息、資料抓取完成）觸發時才讀取，此時 nhiDataRef.current 必定已由
// FloatingIcon render 賦值完成——與既有的 openRef/appSettingsRef pattern 相同的時序保證。
import { useState, useEffect, useRef } from "react";

import { reprocessData } from "../utils/dataManager";
import {
  loadAllSettings,
  listenForSettingsChanges,
  listenForMessages,
  listenForDataFetchCompletion,
  handleDataFetchCompletedSettingsChange,
} from "../utils/settingsManager";
import { dataStore } from "../store/dataStore";
import { DEFAULT_SETTINGS } from "../config/defaultSettings";

export function useSettingsState({ open, setOpen, setTabValue, advancedTabIndex, nhiDataRef }) {
  const [generalDisplaySettings, setGeneralDisplaySettings] = useState(
    DEFAULT_SETTINGS.general
  );

  // Use the cached default value as the initial state
  const [appSettings, setAppSettings] = useState({
    western: DEFAULT_SETTINGS.western,
    atc5: DEFAULT_SETTINGS.atc5,
    chinese: DEFAULT_SETTINGS.chinese,
    lab: DEFAULT_SETTINGS.lab,
    overview: DEFAULT_SETTINGS.overview,
    display: DEFAULT_SETTINGS.display,
  });

  // 以 ref 保存最新值,供掛載時註冊的 listener 讀取(修復 stale closure)
  const openRef = useRef(open);
  const appSettingsRef = useRef(appSettings);
  useEffect(() => {
    openRef.current = open;
    appSettingsRef.current = appSettings;
  });

  // 統一初始化設置和監聽器
  useEffect(() => {
    // 初始化所有設置
    const initializeSettings = async () => {
      const allSettings = await loadAllSettings();
      setAppSettings({
        western: allSettings.western,
        atc5: allSettings.atc5,
        chinese: allSettings.chinese,
        lab: allSettings.lab,
        overview: allSettings.overview,
        display: allSettings.display,
        cloud: allSettings.cloud,
      });
      setGeneralDisplaySettings(allSettings.general);
    };

    initializeSettings();

    // 設置變更監聽處理函數
    const removeSettingsListener = listenForSettingsChanges((newSettings) => {
      // 更新所有設置狀態
      setAppSettings({
        western: newSettings.western,
        atc5: newSettings.atc5,
        chinese: newSettings.chinese,
        lab: newSettings.lab,
        overview: newSettings.overview,
        display: newSettings.display,
        cloud: newSettings.cloud,
      });
      setGeneralDisplaySettings(newSettings.general);

      // 根據需要重新處理各種數據
      const labData = dataStore.getData('labdata');
      if (labData) {
        reprocessData(
          "lab",
          labData,
          newSettings.lab,
          nhiDataRef.current.setGroupedLabs
        );
      }
      const medicationData = dataStore.getData('medication');
      if (medicationData?.rObject) {
        reprocessData(
          "medication",
          medicationData,
          newSettings.western,
          nhiDataRef.current.setGroupedMedications
        );
      }
      const chineseMedData = dataStore.getData('chinesemed');
      if (chineseMedData) {
        reprocessData(
          "chinesemed",
          chineseMedData,
          newSettings.chinese,
          nhiDataRef.current.setGroupedChineseMeds
        );
      }
    });

    // 消息監聽處理函數
    const removeMessageListener = listenForMessages((message) => {
      if (message.action === "settingChanged" && message.allSettings) {
        // 觸發設置重新加載
        initializeSettings();
      }

      // 處理切換到自訂設定標籤的消息
      if (message.action === "switchToCustomFormatTab") {
        // 如果對話框未打開，先打開它
        if (!openRef.current) {
          setOpen(true);
        }
        // 只有當自訂設定已啟用時才切換到指定的標籤
        if (typeof message.tabIndex === 'number' && appSettingsRef.current.western.enableMedicationCustomCopyFormat) {
          setTabValue(message.tabIndex);
        }
      }

      // 處理切換到檢驗自訂格式編輯器的消息
      if (message.action === "switchToLabCustomFormatTab") {
        // 如果對話框未打開，先打開它
        if (!openRef.current) {
          setOpen(true);
        }
        // 只有當自訂設定已啟用時才切換到指定的標籤
        if (typeof message.tabIndex === 'number' && appSettingsRef.current.lab.enableLabCustomCopyFormat) {
          setTabValue(message.tabIndex);
        }
      }

      // 處理打開自訂格式編輯器的消息
      if (message.action === "openCustomFormatEditor") {
        if (!openRef.current) {
          setOpen(true);
        }
        if (appSettingsRef.current.western.enableMedicationCustomCopyFormat) {
          setTabValue(advancedTabIndex);
        }
      }

      // 處理打開檢驗自訂格式編輯器的消息
      if (message.action === "openLabCustomFormatEditor") {
        if (!openRef.current) {
          setOpen(true);
        }
        if (appSettingsRef.current.lab.enableLabCustomCopyFormat) {
          setTabValue(advancedTabIndex);
        }
      }
    });

    // 數據加載完成事件監聽處理函數
    const removeDataFetchCompletionListener = listenForDataFetchCompletion(
      (event) => {
        // 處理設置變更
        if (event.detail?.settingsChanged) {
          // 準備回調函數
          const callbacks = {
            reprocessMedication: (data, settings) =>
              reprocessData(
                "medication",
                data,
                settings,
                nhiDataRef.current.setGroupedMedications
              ),
            reprocessLab: (data, settings) =>
              reprocessData("lab", data, settings, nhiDataRef.current.setGroupedLabs),
            reprocessChineseMed: (data, settings) =>
              reprocessData(
                "chinesemed",
                data,
                settings,
                nhiDataRef.current.setGroupedChineseMeds
              ),
          };

          // 使用設置管理器處理設置變更
          handleDataFetchCompletedSettingsChange(
            event,
            appSettingsRef.current,
            setAppSettings,
            callbacks
          );
        } else {
          // 非設置相關事件，重新處理所有數據
          nhiDataRef.current.handleData();
        }
      }
    );

    // 清理函數
    return () => {
      removeSettingsListener();
      removeMessageListener();
      removeDataFetchCompletionListener();
    };
  }, []);

  return { appSettings, setAppSettings, generalDisplaySettings, appSettingsRef };
}
