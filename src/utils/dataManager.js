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
    // 建立資料處理映射
    const dataProcessors = new Map([
      ['medication', {
        process: async () => {
          if (dataSources.medication?.rObject) {
            const processedMedications = await medicationProcessor.processMedicationData(
              dataSources.medication,
              settings.western
            );
            setters.setGroupedMedications(processedMedications);
            results.medications = processedMedications;
          }
        }
      }],
      ['labData', {
        process: () => {
          if (dataSources.labData?.rObject) {
            const processedLabs = labProcessor.processLabData(
              dataSources.labData,
              settings.lab
            );
            setters.setGroupedLabs(processedLabs);
            results.labs = processedLabs;
          }
        }
      }],
      ['chinesemed', {
        process: () => {
          if (dataSources.chinesemed?.rObject) {
            const processedChineseMeds = chineseMedProcessor.processChineseMedData(
              dataSources.chinesemed
            );
            setters.setGroupedChineseMeds(processedChineseMeds);
            results.chineseMeds = processedChineseMeds;
          }
        }
      }],
      ['imaging', {
        process: () => {
          if (dataSources.imaging?.rObject) {
            const processedImaging = imagingProcessor.processImagingData(
              dataSources.imaging
            );
            setters.setImagingData(processedImaging);
            results.imaging = processedImaging;
          }
        }
      }],
      ['allergy', {
        process: () => {
          if (dataSources.allergy?.rObject) {
            const processedAllergy = allergyProcessor.processAllergyData(
              dataSources.allergy
            );
            setters.setAllergyData(processedAllergy);
            results.allergy = processedAllergy;
          }
        }
      }],
      ['surgery', {
        process: () => {
          if (dataSources.surgery?.rObject) {
            const processedSurgery = surgeryProcessor.processSurgeryData(
              dataSources.surgery
            );
            setters.setSurgeryData(processedSurgery);
            results.surgery = processedSurgery;
          }
        }
      }],
      ['discharge', {
        process: () => {
          if (dataSources.discharge?.rObject) {
            const processedDischarge = dischargeProcessor.processDischargeData(
              dataSources.discharge
            );
            setters.setDischargeData(processedDischarge);
            results.discharge = processedDischarge;
          }
        }
      }],
      ['medDays', {
        process: () => {
          if (dataSources.medDays?.rObject) {
            const processedMedDays = medDaysProcessor.processMedDaysData(
              dataSources.medDays
            );
            setters.setMedDaysData(processedMedDays);
            results.medDays = processedMedDays;
          }
        }
      }],
      ['patientSummary', {
        process: () => {
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
        }
      }]
    ]);

    // 處理每個資料類型
    for (const [, { process }] of dataProcessors) {
      await process();
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
    patientSummary: window.lastInterceptedPatientSummaryData
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
  if (!data || !data.rObject) return;

  try {
    const processors = new Map([
      ['medication', async (data, settings) => {
        return await medicationProcessor.processMedicationData(data, settings);
      }],
      ['lab', (data, settings) => {
        return labProcessor.processLabData(data, settings);
      }],
      ['chinesemed', (data) => {
        return chineseMedProcessor.processChineseMedData(data);
      }]
      // 可以根據需要添加更多的數據類型處理
    ]);

    const processor = processors.get(dataType);
    if (processor) {
      const processed = await processor(data, settings);
      setter(processed);
    } else {
      console.log(`No processing method for data type: ${dataType}`);
    }
  } catch (error) {
    console.error(`Error reprocessing ${dataType} data:`, error);
  }
};