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
import { cancerScreeningProcessor } from "./cancerScreeningProcessor";
import { adultHealthCheckProcessor } from "./adultHealthCheckProcessor";
import { hbcvdataProcessor } from "./hbcvdataProcessor";
import { dataStore } from "../store/dataStore";

/**
 * 安全調用setter，如果setter不存在則寫入window全局變量
 * @param {Object} setters - 所有setter函數的對象
 * @param {string} setterName - 要調用的setter名稱
 * @param {any} data - 要設置的數據
 * @param {string} dataName - 數據的名稱（用於設置window全局變量）
 */
const safeSetter = (setters, setterName, data, dataName) => {
  const setterFn = setters[setterName];

  if (typeof setterFn === 'function') {
    setterFn(data);
  } else {
    // 將數據存儲在window全局變量中
    window[`${dataName}Data`] = data;
  }
};

/**
 * 資料處理註冊表：每個項目描述「用什麼資料、跑哪個 processor、
 * 結果寫到哪個 setter / results key」，handleAllData 用單一迴圈依序執行。
 * 新增資料型別時，只需在此陣列加一筆設定，不須修改迴圈本體。
 *
 * - guard: 決定是否執行該項目。
 *   - 'rObject'：dataSources[sourceKey]?.rObject 存在才執行（多數型別）。
 *   - 'truthy'：dataSources[sourceKey] 存在即執行（cancerScreening / adultHealthCheck / hbcvdata）。
 *   - function(dataSources)：自訂判斷（目前無使用者;保留給形狀特殊的新型別）。
 * - getInput(dataSources)：取得要傳給 process() 的主要資料（預設為 dataSources[sourceKey]）。
 * - run(input, dataSources, settings)：實際呼叫 processor，可回傳值或 Promise。
 * - setterName / resultKey：setter 名稱與 results 物件要寫入的 key。
 * - useSafeSetter：true 時透過 safeSetter（setter 不存在則寫入 window[safeSetterDataName + 'Data']）。
 */
const PROCESSOR_REGISTRY = [
  {
    sourceKey: 'medication',
    guard: 'rObject',
    run: (input, dataSources, settings) =>
      medicationProcessor.processMedicationData(input, dataSources.chronicMed, settings.western),
    setterName: 'setGroupedMedications',
    resultKey: 'medications',
  },
  {
    sourceKey: 'labData',
    guard: 'rObject',
    run: (input, dataSources, settings) => labProcessor.processLabData(input, settings.lab),
    setterName: 'setGroupedLabs',
    resultKey: 'labs',
  },
  {
    sourceKey: 'chinesemed',
    guard: 'rObject',
    run: (input) => chineseMedProcessor.processChineseMedData(input),
    setterName: 'setGroupedChineseMeds',
    resultKey: 'chineseMeds',
  },
  {
    sourceKey: 'imaging',
    guard: 'rObject',
    run: (input) => imagingProcessor.processImagingData(input),
    setterName: 'setImagingData',
    resultKey: 'imaging',
  },
  {
    sourceKey: 'allergy',
    guard: 'rObject',
    run: (input) => allergyProcessor.processAllergyData(input),
    setterName: 'setAllergyData',
    resultKey: 'allergy',
  },
  {
    sourceKey: 'surgery',
    guard: 'rObject',
    run: (input) => surgeryProcessor.processSurgeryData(input),
    setterName: 'setSurgeryData',
    resultKey: 'surgery',
  },
  {
    sourceKey: 'discharge',
    guard: 'rObject',
    run: (input) => dischargeProcessor.processDischargeData(input),
    setterName: 'setDischargeData',
    resultKey: 'discharge',
  },
  {
    sourceKey: 'medDays',
    guard: 'rObject',
    run: (input) => medDaysProcessor.processMedDaysData(input),
    setterName: 'setMedDaysData',
    resultKey: 'medDays',
  },
  {
    // 唯一組裝路徑 collectDataSources() 只產生大寫 S 的 patientSummary;
    // 舊的小寫 patientsummary fallback 為死分支,已移除(2026-07-05,DOC/07 地雷 #1)。
    sourceKey: 'patientSummary',
    guard: 'rObject',
    run: (input) => patientSummaryProcessor.processPatientSummaryData(input),
    setterName: 'setPatientSummaryData',
    resultKey: 'patientSummary',
  },
  {
    sourceKey: 'cancerScreening',
    guard: 'truthy',
    run: (input) => cancerScreeningProcessor.processCancerScreeningData(input),
    setterName: 'setCancerScreeningData',
    resultKey: 'cancerScreening',
    useSafeSetter: true,
    safeSetterDataName: 'cancerScreening',
  },
  {
    sourceKey: 'adultHealthCheck',
    guard: 'truthy',
    run: (input) => adultHealthCheckProcessor.processAdultHealthCheckData(input),
    setterName: 'setAdultHealthCheckData',
    resultKey: 'adultHealthCheck',
    useSafeSetter: true,
    safeSetterDataName: 'adultHealthCheck',
  },
  {
    sourceKey: 'hbcvdata',
    guard: 'truthy',
    run: (input) => hbcvdataProcessor.processHbcvdataData(input),
    setterName: 'setHbcvData',
    resultKey: 'hbcvdata',
    useSafeSetter: true,
    safeSetterDataName: 'hbcv',
  },
];

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
    for (const entry of PROCESSOR_REGISTRY) {
      const {
        sourceKey,
        guard,
        getInput,
        run,
        setterName,
        resultKey,
        useSafeSetter,
        safeSetterDataName,
      } = entry;

      const shouldRun =
        typeof guard === 'function'
          ? guard(dataSources)
          : guard === 'truthy'
            ? Boolean(dataSources[sourceKey])
            : Boolean(dataSources[sourceKey]?.rObject);

      if (!shouldRun) {
        continue;
      }

      const input = getInput ? getInput(dataSources) : dataSources[sourceKey];
      const processed = await run(input, dataSources, settings);

      if (useSafeSetter) {
        safeSetter(setters, setterName, processed, safeSetterDataName);
      } else {
        setters[setterName](processed);
      }
      results[resultKey] = processed;
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
  return {
    medication: dataStore.getData('medication'),
    labData: dataStore.getData('labdata'),
    chinesemed: dataStore.getData('chinesemed'),
    imaging: dataStore.getData('imaging'),
    allergy: dataStore.getData('allergy'),
    surgery: dataStore.getData('surgery'),
    discharge: dataStore.getData('discharge'),
    medDays: dataStore.getData('medDays'),
    patientSummary: dataStore.getData('patientsummary'),
    cancerScreening: dataStore.getData('cancerScreening'),
    adultHealthCheck: dataStore.getData('adultHealthCheck'),
    hbcvdata: dataStore.getData('hbcvdata'),
    chronicMed: dataStore.getData('chronicMed'),
  };
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
        return await medicationProcessor.processMedicationData(
          data,
          dataStore.getData('chronicMed'),
          settings
        );
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
    }
  } catch (error) {
    console.error(`Error reprocessing ${dataType} data:`, error);
  }
};