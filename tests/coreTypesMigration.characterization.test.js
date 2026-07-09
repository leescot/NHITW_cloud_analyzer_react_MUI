// tests/coreTypesMigration.characterization.test.js
import { describe, it, assert, beforeEach } from 'vitest';

import { API_PATH_MAP } from '../src/apiInterceptor/apiPathMap.js';
import { NODE_TO_DATA_TYPE } from '../src/apiInterceptor/permissionMap.js';
import { normalizeResponseData } from '../src/apiInterceptor/responseNormalizer.js';
import { DATA_TYPES, dataStore } from '../src/store/dataStore.js';
import { processLocalData } from '../src/localDataHandler.js';

// 特徵(characterization)測試:鎖定 registry(src/dataTypes/coreTypes.js + devTypes.js)
// 衍生的全部登記面最終狀態 —— API_PATH_MAP / NODE_TO_DATA_TYPE / 正規化形狀 / DATA_TYPES / 本地匯入對照。
// 任何讓本檔變紅的改動 = 登記行為改變;先確認是否為刻意變更,再同步更新斷言與相關文件(DOC/02、DOC/06)。
// buildShareData 的 key 順序已由 tests/nhitwExport.test.js 鎖定,不在此重複。

describe('coreTypes 遷移特徵測試', function () {
  it('API_PATH_MAP 條目與順序不變(14 舊型別在前、11 dev 型別在後)', function () {
    assert.deepEqual([...API_PATH_MAP.entries()], [
      ['medication', 'imue0008/imue0008s02/get-data'],
      ['labdata', 'imue0060/imue0060s02/get-data'],
      ['labdraw', 'imue0060/imue0060s03/get-data'],
      ['chinesemed', 'imue0090/imue0090s02/get-data'],
      ['imaging', 'imue0130/imue0130s02/get-data'],
      ['allergy', 'imue0040/imue0040s02/get-data'],
      ['surgery', 'imue0020/imue0020s02/get-data'],
      ['discharge', 'imue0070/imue0070s02/get-data'],
      ['medDays', 'imue0120/imue0120s01/pres-med-day'],
      ['patientsummary', 'imue2000/imue2000s01/get-summary'],
      ['adultHealthCheck', 'imue0140/imue0140s01/hpa-data'],
      ['cancerScreening', 'imue0150/imue0150s01/hpa-data'],
      ['hbcvdata', 'imue0180/imue0180s01/hbcv-data'],
      ['chronicMed', 'imue0008/imue0008s05/get-data'],
      ['specialPayment', 'imue0190/imue0190s01/lftp-data'],
      ['controlledMed', 'imue0009/imue0009s02/get-data'],
      ['controlledMedSummary', 'imue0009/imue0009s03/get-data'],
      ['acupuncture', 'imue0160/imue0160s02/get-data'],
      ['chineseMedCare', 'imue0170/imue0170s02/get-data'],
      ['chineseMedCareSummary', 'imue0170/imue0170s03/get-data'],
      ['dental', 'imue0030/imue0030s02/get-data'],
      ['labRecord', 'imue0010/imue0010s02/get-data'],
      ['rehabilitation', 'imue0080/imue0080s02/get-data'],
      ['rehabilitationSummary', 'imue0080/imue0080s03/get-data'],
      ['specialMaterial', 'imue0200/imue0200s02/get-data'],
    ]);
  });

  it('NODE_TO_DATA_TYPE 內容不變(13 舊節點 + 8 dev 節點)', function () {
    assert.deepEqual(NODE_TO_DATA_TYPE, {
      '1.1': ['patientsummary'],
      '1.2': ['hbcvdata'],
      '2.1': ['medication'],
      '2.3': ['chronicMed'],
      '2.4': ['medDays'],
      '3.1': ['chinesemed'],
      '5.1': ['allergy'],
      '6.1': ['labdata', 'labdraw'],
      '6.2': ['imaging'],
      '6.3': ['adultHealthCheck'],
      '6.4': ['cancerScreening'],
      '7.1': ['surgery'],
      '8.1': ['discharge'],
      '1.3': ['specialPayment'],
      '2.2': ['controlledMed', 'controlledMedSummary'],
      '3.2': ['acupuncture'],
      '3.3': ['chineseMedCare', 'chineseMedCareSummary'],
      '4.1': ['dental'],
      '6.5': ['labRecord'],
      '9.1': ['rehabilitation', 'rehabilitationSummary'],
      '10.1': ['specialMaterial'],
    });
  });

  // 三探針形狀指紋:五種 shape 對三種輸入的輸出組合互不相同,
  // 能唯一判定每個型別走哪個 normalizer,不需 export TYPE_SHAPE 內部結構。
  const PROBE_A = { rObject: [1, 2] };   // rObject 為陣列
  const PROBE_B = { rObject: { a: 1 } }; // rObject 為單一物件
  const PROBE_C = [1, 2];                // 回應本體就是陣列(無 rObject)
  const SHAPE_EXPECTED = {
    rows: [[1, 2], [], []],
    rowsOrSingle: [[1, 2], [{ a: 1 }], []],
    dataAsRows: [[PROBE_A], [PROBE_B], [1, 2]],
    dataAsSingle: [[PROBE_A], [PROBE_B], [[1, 2]]],
    recordAsSingle: [[[1, 2]], [{ a: 1 }], []],
  };
  const TYPE_TO_SHAPE = {
    medication: 'rows', labdata: 'rows', labdraw: 'dataAsRows',
    chinesemed: 'rows', imaging: 'rows', allergy: 'rows',
    surgery: 'rows', discharge: 'rows', medDays: 'dataAsRows',
    patientsummary: 'rowsOrSingle', adultHealthCheck: 'recordAsSingle',
    cancerScreening: 'recordAsSingle', hbcvdata: 'recordAsSingle',
    chronicMed: 'dataAsSingle',
  };

  it('14 型別的正規化形狀不變(三探針指紋)', function () {
    for (const [type, shape] of Object.entries(TYPE_TO_SHAPE)) {
      const [ea, eb, ec] = SHAPE_EXPECTED[shape];
      assert.deepEqual(normalizeResponseData(PROBE_A, type).rObject, ea, `${type} probe A`);
      assert.deepEqual(normalizeResponseData(PROBE_B, type).rObject, eb, `${type} probe B`);
      assert.deepEqual(normalizeResponseData(PROBE_C, type).rObject, ec, `${type} probe C`);
    }
  });

  it('DATA_TYPES 內容與順序不變(14 舊 + masterMenu + permission + 11 dev)', function () {
    assert.deepEqual(DATA_TYPES, [
      'medication', 'labdata', 'labdraw', 'chinesemed', 'imaging',
      'allergy', 'surgery', 'discharge', 'medDays', 'patientsummary',
      'adultHealthCheck', 'cancerScreening', 'hbcvdata', 'chronicMed',
      'masterMenu', 'permission',
      'specialPayment', 'controlledMed', 'controlledMedSummary',
      'acupuncture', 'chineseMedCare', 'chineseMedCareSummary',
      'dental', 'labRecord', 'rehabilitation', 'rehabilitationSummary',
      'specialMaterial',
    ]);
  });

  describe('本地匯入 key 對照(現況,合成假資料)', function () {
    beforeEach(() => {
      dataStore.clearAll();
      delete window._localUserInfo;
    });

    it('14 舊型別經別名匯入;小寫 patientsummary 與 masterMenu 修復後可匯入(round-trip 完整)', async function () {
      const p = (tag) => ({ rObject: [{ tag }] });
      const result = await processLocalData({
        UserID: 'X1',
        medication: p('med'), lab: p('lab'), labdraw: p('labdraw'),
        chinesemed: p('cm'), imaging: p('img'), allergy: p('alg'),
        surgery: p('sur'), discharge: p('dis'), medDays: p('md'),
        patientSummary: p('ps'), adultHealthCheck: p('ahc'),
        cancerScreening: p('cs'), hbcvdata: p('hbcv'), chronicMed: p('chr'),
        // ↓ 下載 JSON(修復前版本)實際輸出的是小寫 patientsummary 與 masterMenu;
        //   Task 17 修復後兩者皆可匯入(round-trip 完整)。
        patientsummary: p('ps-lower'),
        masterMenu: p('mm'),
      }, 'x.json');

      assert.isTrue(result.success);
      assert.deepEqual(dataStore.getData('medication'), p('med'));
      assert.deepEqual(dataStore.getData('labdata'), p('lab'));
      assert.deepEqual(dataStore.getData('labdraw'), p('labdraw'));
      assert.deepEqual(dataStore.getData('chinesemed'), p('cm'));
      assert.deepEqual(dataStore.getData('imaging'), p('img'));
      assert.deepEqual(dataStore.getData('allergy'), p('alg'));
      assert.deepEqual(dataStore.getData('surgery'), p('sur'));
      assert.deepEqual(dataStore.getData('discharge'), p('dis'));
      assert.deepEqual(dataStore.getData('medDays'), p('md'));
      assert.deepEqual(dataStore.getData('patientsummary'), p('ps-lower')); // 修復後:小寫 key 也匯入(舊下載檔相容);兩 key 併存時後迭代者覆蓋
      assert.deepEqual(dataStore.getData('adultHealthCheck'), p('ahc'));
      assert.deepEqual(dataStore.getData('cancerScreening'), p('cs'));
      assert.deepEqual(dataStore.getData('hbcvdata'), p('hbcv'));
      assert.deepEqual(dataStore.getData('chronicMed'), p('chr'));
      assert.deepEqual(dataStore.getData('masterMenu'), p('mm')); // 修復後:masterMenu 匯入
    });
  });
});
