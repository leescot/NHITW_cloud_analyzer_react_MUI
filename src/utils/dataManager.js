// dataManager.js
// 統一管理所有數據處理相關的函數

import { medicationProcessor } from "./medicationProcessor";
import { labProcessor } from "./labProcessor";
import { chineseMedProcessor } from "./chineseMedProcessor";
import { imagingProcessor } from "./imagingProcessor";
import { allergyProcessor } from "./allergyProcessor";
import { surgeryProcessor } from "./surgeryProcessor";
import { dischargeProcessor } from "./dischargeProcessor";
import { medDaysProcessor } from "./medDaysProcessor";
import { dashboardProcessor } from "./dashboardProcessor";
import { patientSummaryProcessor } from "./patientSummaryProcessor";

/**
 * 處理所有資料來源並回傳處理結果
 * @param {Object} dataSources - 所有資料來源的對象
 * @param {Object} settings - 應用設置對象
 * @param {Function} setters - 用於更新狀態的setter函數對象
 * @returns {Promise<Object>} - 處理後的數據對象
 */
export const handleAllData = async (dataSources, settings, setters) => {
  const results = {};

  try {
    // 處理藥物數據
    if (dataSources.medication?.rObject) {
      const processedMedications = await medicationProcessor.processMedicationData(
        dataSources.medication,
        settings.western
      );
      setters.setGroupedMedications(processedMedications);
      results.medications = processedMedications;
    }

    // 處理檢驗數據
    if (dataSources.labData?.rObject) {
      const processedLabs = labProcessor.processLabData(
        dataSources.labData, 
        settings.lab
      );
      setters.setGroupedLabs(processedLabs);
      results.labs = processedLabs;
    }

    // 處理中藥數據
    if (dataSources.chinesemed?.rObject) {
      const processedChineseMeds = chineseMedProcessor.processChineseMedData(
        dataSources.chinesemed
      );
      setters.setGroupedChineseMeds(processedChineseMeds);
      results.chineseMeds = processedChineseMeds;
    }

    // 處理影像數據
    if (dataSources.imaging?.rObject) {
      const processedImaging = imagingProcessor.processImagingData(
        dataSources.imaging
      );
      setters.setImagingData(processedImaging);
      results.imaging = processedImaging;
    }

    // 處理過敏數據
    if (dataSources.allergy?.rObject) {
      const processedAllergy = allergyProcessor.processAllergyData(
        dataSources.allergy
      );
      setters.setAllergyData(processedAllergy);
      results.allergy = processedAllergy;
    }

    // 處理手術數據
    if (dataSources.surgery?.rObject) {
      const processedSurgery = surgeryProcessor.processSurgeryData(
        dataSources.surgery
      );
      setters.setSurgeryData(processedSurgery);
      results.surgery = processedSurgery;
    }

    // 處理出院數據
    if (dataSources.discharge?.rObject) {
      const processedDischarge = dischargeProcessor.processDischargeData(
        dataSources.discharge
      );
      setters.setDischargeData(processedDischarge);
      results.discharge = processedDischarge;
    }

    // 處理餘藥數據
    if (dataSources.medDays?.rObject) {
      const processedMedDays = medDaysProcessor.processMedDaysData(
        dataSources.medDays
      );
      setters.setMedDaysData(processedMedDays);
      results.medDays = processedMedDays;
    }

    // 處理病患概要數據
    if (dataSources.patientsummary?.rObject) {
      const processedPatientSummary = patientSummaryProcessor.processPatientSummaryData(
        dataSources.patientsummary
      );
      setters.setPatientSummaryData(processedPatientSummary);
      results.patientSummary = processedPatientSummary;
    } else if (dataSources.patientSummary?.rObject) {
      // 嘗試使用大寫S作為後備
      const processedPatientSummary = patientSummaryProcessor.processPatientSummaryData(
        dataSources.patientSummary
      );
      setters.setPatientSummaryData(processedPatientSummary);
      results.patientSummary = processedPatientSummary;
    }

    // 處理儀表板數據 (dashboard)
    if (dataSources.medication?.rObject && dataSources.chinesemed?.rObject) {
      const processedDashboard = dashboardProcessor.processDashboardData({
        medicationData: dataSources.medication,
        chineseMedData: dataSources.chinesemed,
      });
      setters.setDashboardData(processedDashboard);
      results.dashboard = processedDashboard;
    }

    return results;
  } catch (error) {
    console.error("Error processing data:", error);
    return results;
  }
};

/**
 * 收集所有數據源
 * @returns {Object} - 包含所有數據源的對象
 */
export const collectDataSources = () => {
  const sources = {
    medication: window.lastInterceptedMedicationData,
    labData: window.lastInterceptedLabData,
    chinesemed: window.lastInterceptedChineseMedData,
    imaging: window.lastInterceptedImagingData,
    allergy: window.lastInterceptedAllergyData,
    surgery: window.lastInterceptedSurgeryData,
    discharge: window.lastInterceptedDischargeData,
    medDays: window.lastInterceptedMedDaysData,
    patientsummary: window.lastInterceptedPatientSummaryData,
    patientSummary: window.lastInterceptedPatientSummaryData || window.lastInterceptedPatientSummaryData
  };
  
  return sources;
};

/**
 * 根據指定的設置重新處理指定類型的數據
 * @param {string} dataType - 要重新處理的數據類型
 * @param {Object} data - 原始數據
 * @param {Object} settings - 處理設置
 * @param {Function} setter - 設置狀態的函數
 */
export const reprocessData = async (dataType, data, settings, setter) => {
  if (!data) return;

  try {
    switch (dataType) {
      case 'medication':
        if (data.rObject) {
          const processed = await medicationProcessor.processMedicationData(data, settings);
          setter(processed);
        }
        break;
      case 'lab':
        if (data.rObject) {
          const processed = labProcessor.processLabData(data, settings);
          setter(processed);
        }
        break;
      case 'chinesemed':
        if (data.rObject) {
          const processed = chineseMedProcessor.processChineseMedData(data);
          setter(processed);
        }
        break;
      // 可以根據需要添加更多的數據類型處理
      default:
        console.log(`No processing method for data type: ${dataType}`);
    }
  } catch (error) {
    console.error(`Error reprocessing ${dataType} data:`, error);
  }
}; 