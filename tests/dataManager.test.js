import { describe, it, assert, beforeEach, afterEach, vi } from 'vitest';

import { dataStore } from '../src/store/dataStore.js';

// 行為鎖定測試需要的 mock：把各 processor 換成可觀測的假實作，
// 這樣測試只驗證 dataManager 的調度邏輯（呼叫哪個 processor、帶什麼參數、
// 呼叫哪個 setter、results 放在哪個 key），不依賴真實 processor 的資料格式。
vi.mock('../src/utils/medicationProcessor.js', () => ({
  medicationProcessor: {
    processMedicationData: vi.fn((medication, chronicMed, formatSettings) => ({
      __mock: 'medications',
      medication,
      chronicMed,
      formatSettings,
    })),
  },
}));
vi.mock('../src/utils/labProcessor.js', () => ({
  labProcessor: {
    processLabData: vi.fn((labData, labSettings) => ({
      __mock: 'labs',
      labData,
      labSettings,
    })),
  },
}));
vi.mock('../src/utils/chineseMedProcessor.js', () => ({
  chineseMedProcessor: { processChineseMedData: vi.fn((d) => ({ __mock: 'chinesemed', d })) },
}));
vi.mock('../src/utils/imagingProcessor.js', () => ({
  imagingProcessor: { processImagingData: vi.fn((d) => ({ __mock: 'imaging', d })) },
}));
vi.mock('../src/utils/allergyProcessor.js', () => ({
  allergyProcessor: { processAllergyData: vi.fn((d) => ({ __mock: 'allergy', d })) },
}));
vi.mock('../src/utils/surgeryProcessor.js', () => ({
  surgeryProcessor: { processSurgeryData: vi.fn((d) => ({ __mock: 'surgery', d })) },
}));
vi.mock('../src/utils/dischargeProcessor.js', () => ({
  dischargeProcessor: { processDischargeData: vi.fn((d) => ({ __mock: 'discharge', d })) },
}));
vi.mock('../src/utils/medDaysProcessor.js', () => ({
  medDaysProcessor: { processMedDaysData: vi.fn((d) => ({ __mock: 'medDays', d })) },
}));
vi.mock('../src/utils/patientSummaryProcessor.js', () => ({
  patientSummaryProcessor: {
    processPatientSummaryData: vi.fn((d) => ({ __mock: 'patientSummary', d })),
  },
}));
vi.mock('../src/utils/cancerScreeningProcessor.js', () => ({
  cancerScreeningProcessor: {
    processCancerScreeningData: vi.fn((d) => ({ __mock: 'cancerScreening', d })),
  },
}));
vi.mock('../src/utils/adultHealthCheckProcessor.js', () => ({
  adultHealthCheckProcessor: {
    processAdultHealthCheckData: vi.fn((d) => ({ __mock: 'adultHealthCheck', d })),
  },
}));
vi.mock('../src/utils/hbcvdataProcessor.js', () => ({
  hbcvdataProcessor: { processHbcvdataData: vi.fn((d) => ({ __mock: 'hbcvdata', d })) },
}));

const { collectDataSources, handleAllData } = await import('../src/utils/dataManager.js');
const { medicationProcessor } = await import('../src/utils/medicationProcessor.js');
const { labProcessor } = await import('../src/utils/labProcessor.js');
const { cancerScreeningProcessor } = await import('../src/utils/cancerScreeningProcessor.js');

describe('utils/dataManager.collectDataSources', function () {
  beforeEach(() => {
    dataStore.clearAll();
  });

  it('從 dataStore 組出 sources 物件(key 對應與舊 window 版一致)', function () {
    const med = { rObject: [1] };
    const lab = { rObject: [2] };
    const ps = { rObject: [3] };
    dataStore.setData('medication', med);
    dataStore.setData('labdata', lab);
    dataStore.setData('patientsummary', ps);

    const sources = collectDataSources();

    assert.strictEqual(sources.medication, med);
    assert.strictEqual(sources.labData, lab);        // labdata → labData
    assert.strictEqual(sources.patientSummary, ps);  // patientsummary → patientSummary
    assert.isNull(sources.imaging);                  // 未載入 → null
  });

  it('chronicMed 亦來自 store(清除後不殘留舊值)', function () {
    dataStore.setData('chronicMed', { rObject: [9] });
    dataStore.clearAll();
    const sources = collectDataSources();
    assert.isNull(sources.chronicMed);
  });
});

describe('utils/dataManager.handleAllData（行為鎖定，重構前後皆須為綠）', function () {
  beforeEach(() => {
    vi.clearAllMocks();
    delete window.cancerScreeningData;
  });
  afterEach(() => {
    delete window.cancerScreeningData;
  });

  const makeSetters = () => ({
    setGroupedMedications: vi.fn(),
    setGroupedLabs: vi.fn(),
    setGroupedChineseMeds: vi.fn(),
    setImagingData: vi.fn(),
    setAllergyData: vi.fn(),
    setSurgeryData: vi.fn(),
    setDischargeData: vi.fn(),
    setMedDaysData: vi.fn(),
    setPatientSummaryData: vi.fn(),
    setAdultHealthCheckData: vi.fn(),
    setHbcvData: vi.fn(),
    // 刻意不提供 setCancerScreeningData，驗證 safeSetter 的 window fallback
  });

  it('medication + chronicMed：processMedicationData 帶第二參數、setter 被呼叫、results.medications 存在', async function () {
    const medication = { rObject: [{ id: 'm1' }] };
    const chronicMed = { rObject: [{ id: 'c1' }] };
    const dataSources = { medication, chronicMed };
    const setters = makeSetters();

    const results = await handleAllData(dataSources, {}, setters);

    assert.strictEqual(medicationProcessor.processMedicationData.mock.calls.length, 1);
    assert.strictEqual(medicationProcessor.processMedicationData.mock.calls[0][0], medication);
    assert.strictEqual(medicationProcessor.processMedicationData.mock.calls[0][1], chronicMed);
    assert.strictEqual(setters.setGroupedMedications.mock.calls.length, 1);
    assert.deepEqual(setters.setGroupedMedications.mock.calls[0][0], {
      __mock: 'medications',
      medication,
      chronicMed,
      formatSettings: undefined,
    });
    assert.exists(results.medications);
  });

  it('medication：processMedicationData 帶第三參數 settings.western（藥物自訂格式設定改經參數傳遞，不再靠 window 側通道）', async function () {
    const medication = { rObject: [{ id: 'm1' }] };
    const western = { medicationCopyFormat: 'custom', drugSeparator: ';' };
    const dataSources = { medication };
    const setters = makeSetters();

    await handleAllData(dataSources, { western }, setters);

    assert.strictEqual(medicationProcessor.processMedicationData.mock.calls.length, 1);
    assert.strictEqual(medicationProcessor.processMedicationData.mock.calls[0][2], western);
  });

  it('labData + settings.lab：processLabData 帶 settings.lab、setGroupedLabs 被呼叫', async function () {
    const labData = { rObject: [{ id: 'l1' }] };
    const labSettings = { showAbnormalOnly: true };
    const dataSources = { labData };
    const setters = makeSetters();

    const results = await handleAllData(dataSources, { lab: labSettings }, setters);

    assert.strictEqual(labProcessor.processLabData.mock.calls.length, 1);
    assert.strictEqual(labProcessor.processLabData.mock.calls[0][0], labData);
    assert.strictEqual(labProcessor.processLabData.mock.calls[0][1], labSettings);
    assert.strictEqual(setters.setGroupedLabs.mock.calls.length, 1);
    assert.exists(results.labs);
  });

  it('cancerScreening 無對應 setter 時：safeSetter 寫入 window.cancerScreeningData', async function () {
    const cancerScreening = { some: 'data' };
    const dataSources = { cancerScreening };
    const setters = makeSetters(); // 無 setCancerScreeningData

    const results = await handleAllData(dataSources, {}, setters);

    assert.strictEqual(cancerScreeningProcessor.processCancerScreeningData.mock.calls.length, 1);
    assert.strictEqual(cancerScreeningProcessor.processCancerScreeningData.mock.calls[0][0], cancerScreening);
    assert.deepEqual(window.cancerScreeningData, { __mock: 'cancerScreening', d: cancerScreening });
    assert.exists(results.cancerScreening);
  });

  it('空 dataSources：任何 setter 都不被呼叫，回傳 {}', async function () {
    const setters = makeSetters();

    const results = await handleAllData({}, {}, setters);

    Object.values(setters).forEach((fn) => assert.strictEqual(fn.mock.calls.length, 0));
    assert.deepEqual(results, {});
  });

  it('patientSummary：讀 dataSources.patientSummary(collectDataSources 的唯一組裝 key)', async function () {
    const { patientSummaryProcessor } = await import('../src/utils/patientSummaryProcessor.js');
    const patientSummary = { rObject: [{ id: 'ps2' }] };
    const dataSources = { patientSummary };
    const setters = makeSetters();

    const results = await handleAllData(dataSources, {}, setters);

    assert.strictEqual(patientSummaryProcessor.processPatientSummaryData.mock.calls.length, 1);
    assert.strictEqual(patientSummaryProcessor.processPatientSummaryData.mock.calls[0][0], patientSummary);
    assert.strictEqual(setters.setPatientSummaryData.mock.calls.length, 1);
    assert.exists(results.patientSummary);
  });

  it('patientSummary：小寫 patientsummary key 不再被讀取(大小寫 fallback 死分支已移除)', async function () {
    const { patientSummaryProcessor } = await import('../src/utils/patientSummaryProcessor.js');
    const dataSources = { patientsummary: { rObject: [{ id: 'ps1' }] } };
    const setters = makeSetters();

    await handleAllData(dataSources, {}, setters);

    assert.strictEqual(patientSummaryProcessor.processPatientSummaryData.mock.calls.length, 0);
    assert.strictEqual(setters.setPatientSummaryData.mock.calls.length, 0);
  });
});
