# 舊 14 型別遷入 dataTypes registry 實作規畫

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把 14 個舊資料型別的分散登記(apiPathMap / permissionMap / responseNormalizer / dataStore / localDataHandler / nhitwExport / index.js 抓取分流 / authorization 設定鍵)收斂為 `src/dataTypes/coreTypes.js` 單一描述檔,由 `registry.js` 衍生所有接點;key 一律照舊(選項 A,2026-07-07 決策,見 handoff §3.3)。

**Architecture:** 先寫 characterization(特徵)測試鎖定所有登記面的現況,再逐型別把描述行搬進 `coreTypes.js` 並刪除對應手寫登記(一型別一 commit,特徵測試全程守住零行為變更),最後把 6 個衍生消費端(index.js、authorization、nhitwExport、localDataHandler、messageHandlers)改為讀 registry,並以獨立任務修復既有的 round-trip 斷點(下載 JSON 的小寫 `patientsummary` 與 `masterMenu` 匯入時被丟棄)。

**Tech Stack:** Vanilla JS(ES modules)、Vitest、chrome extension(MV3)。無新依賴。

## Global Constraints

- **key 一律照舊(選項 A)**:不改任何 store key;`labdata`/`patientsummary` 等歷史小寫保留,別名以描述檔 `exportKey` 欄位承載(僅 2 個)。
- **零行為變更**:Task 1–16 為純重構,任何一步讓特徵測試變紅 = 遷移錯誤,修遷移不改測試。唯一例外是 Task 17(round-trip 修復)——刻意的行為變更,獨立 commit、可獨立否決。
- **一型別一 commit**(handoff §3.3 紀律);唯 `labdata`+`labdraw` 共用節點 6.1,必須同 commit(避免 NODE_TO_DATA_TYPE spread 靜默覆蓋)。
- **遷移順序固定**,嚴格依現行 `API_PATH_MAP` 順序:medication → labdata+labdraw → chinesemed → imaging → allergy → surgery → discharge → medDays → patientsummary → adultHealthCheck → cancerScreening → hbcvdata → chronicMed。配合「CORE 衍生值 spread 在手寫條目**前面**」的寫法,Map/陣列順序全程不變(下載 JSON key 順序、`DATA_TYPES` 順序都是特徵測試鎖定的)。
- **`.test_data/json/` 為真實個資**(147 個下載檔,已 gitignore):只供本機手動驗證與唯讀檢視,**絕不 commit、絕不衍生 fixture**;要入版控的測試資料一律合成假資料。
- 每個 commit 前:`npm test` 全綠。收尾:`npm run type-check`、`npm run build`、改動檔 `npx eslint` 0 error(全域 lint 有 79 個既有環境 error,非驗收範圍)。
- commit 訊息格式依 repo 慣例:`測試:…`/`重構:…`/`修復:…`/`文件:…`。
- `masterMenu` 與 `permission` **不進 registry**(無 apiPath/授權節點的偽型別),維持手寫;`chronicMed` 的強制授權(`getAuthorizedDataTypes` 內 `authorized.add('chronicMed')`)是業務規則,留在 `authorization.js` 不動;`patientsummary` 的特殊 query 參數(`index.js#fetchSingleDataType` 的 if 分支)不 registry 化(全系統唯一特例,YAGNI)。

---

## 檔案結構

| 檔案 | 動作 | 職責 |
|---|---|---|
| `src/dataTypes/coreTypes.js` | 新增 | 14 舊型別的單一描述來源(key/node/apiPath/shape/exportKey/fetchGroup/cloudSettingKey) |
| `src/dataTypes/registry.js` | 修改 | 衍生 CORE_*(共用 DEV 已有的衍生邏輯,抽成小工具函數) |
| `src/apiInterceptor/apiPathMap.js` | 修改→掏空 | 手寫 14 條目逐一刪除,最終只剩 spread |
| `src/apiInterceptor/permissionMap.js` | 修改→掏空 | 同上(13 個節點) |
| `src/apiInterceptor/responseNormalizer.js` | 修改 | TYPE_SHAPE 手寫 7 條目逐一刪除;SHAPE_NORMALIZERS 不動 |
| `src/store/dataStore.js` | 修改 | DATA_TYPES 手寫 14 key 逐一刪除;`masterMenu`/`permission` 保留手寫 |
| `src/apiInterceptor/index.js` | 修改 | regularTypes/specialTypes 改由 registry 衍生 |
| `src/apiInterceptor/authorization.js` | 修改 | SPECIAL_DATA_TYPE_SETTING_KEYS 改由 registry 衍生 |
| `src/store/nhitwExport.js` | 修改 | buildShareData 改為迭代 CORE_DATA_TYPES(exportKey) |
| `src/localDataHandler.js` | 修改 | LOCAL_KEY_TO_STORE_TYPE 改衍生 + round-trip 修復 |
| `src/apiInterceptor/messageHandlers.js` | 修改 | 下載 JSON key 改用 CORE_EXPORT_KEY(round-trip 修復) |
| `tests/coreTypesMigration.characterization.test.js` | 新增 | 特徵測試:鎖定全部登記面現況 |
| `tests/coreTypesRegistry.test.js` | 新增 | 描述檔欄位合法性 + CORE/DEV 不衝突的不變量 |

### 描述檔欄位定義(全計畫的型別契約)

```js
// 每個描述物件的欄位:
// key             string  必填。store key,全系統唯一,照舊不改名。
// node            string  必填。NHI masterMenu prsnAuth 授權節點。
// apiPath         string  必填。API 路徑(不含 domain 與 query)。
// shape           string  選填。responseNormalizer 形狀;省略 = 'rows'。
//                         合法值:'rows'|'rowsOrSingle'|'dataAsRows'|'dataAsSingle'|'recordAsSingle'
// exportKey       string  選填。NHITW_DATA / 下載 JSON / 本地匯入的對外 key;省略 = 與 key 相同。
//                         僅 labdata→'lab'、patientsummary→'patientSummary' 兩例,不再新增。
// fetchGroup      string  選填。'special' = 走 index.js 的 specialPromises 分流
//                         (經 shouldFetchSpecialData 閘門);省略 = regular 批次。
// cloudSettingKey string  選填。特殊型別對應的 chrome.storage.sync 開關 key
//                         (shouldFetchSpecialData 用);省略 = 恆抓(如 labdraw)。
```

### 14 型別的完整目標描述(遷移終點;各 Task 逐行搬入,順序即本表)

```js
export const CORE_DATA_TYPES = [
  { key: 'medication', node: '2.1', apiPath: 'imue0008/imue0008s02/get-data' },
  { key: 'labdata', node: '6.1', apiPath: 'imue0060/imue0060s02/get-data', exportKey: 'lab' },
  { key: 'labdraw', node: '6.1', apiPath: 'imue0060/imue0060s03/get-data', shape: 'dataAsRows', fetchGroup: 'special' },
  { key: 'chinesemed', node: '3.1', apiPath: 'imue0090/imue0090s02/get-data' },
  { key: 'imaging', node: '6.2', apiPath: 'imue0130/imue0130s02/get-data' },
  { key: 'allergy', node: '5.1', apiPath: 'imue0040/imue0040s02/get-data' },
  { key: 'surgery', node: '7.1', apiPath: 'imue0020/imue0020s02/get-data' },
  { key: 'discharge', node: '8.1', apiPath: 'imue0070/imue0070s02/get-data' },
  { key: 'medDays', node: '2.4', apiPath: 'imue0120/imue0120s01/pres-med-day', shape: 'dataAsRows' },
  { key: 'patientsummary', node: '1.1', apiPath: 'imue2000/imue2000s01/get-summary', shape: 'rowsOrSingle', exportKey: 'patientSummary' },
  { key: 'adultHealthCheck', node: '6.3', apiPath: 'imue0140/imue0140s01/hpa-data', shape: 'recordAsSingle', fetchGroup: 'special', cloudSettingKey: 'fetchAdultHealthCheck' },
  { key: 'cancerScreening', node: '6.4', apiPath: 'imue0150/imue0150s01/hpa-data', shape: 'recordAsSingle', fetchGroup: 'special', cloudSettingKey: 'fetchCancerScreening' },
  { key: 'hbcvdata', node: '1.2', apiPath: 'imue0180/imue0180s01/hbcv-data', shape: 'recordAsSingle', fetchGroup: 'special', cloudSettingKey: 'fetchHbcvdata' },
  { key: 'chronicMed', node: '2.3', apiPath: 'imue0008/imue0008s05/get-data', shape: 'dataAsSingle' },
];
```

**不變量:CORE_DATA_TYPES 的陣列順序 = NHITW_DATA 的 key 順序(masterMenu 插在 patientsummary 之後)= 下載 JSON 的 key 順序 = DATA_TYPES 順序**。改動順序會被 `tests/nhitwExport.test.js` 與特徵測試抓到。

---

### Task 1: 特徵測試 — 鎖定所有登記面現況

**Files:**
- Create: `tests/coreTypesMigration.characterization.test.js`

**Interfaces:**
- Consumes: `API_PATH_MAP`(apiPathMap.js)、`NODE_TO_DATA_TYPE`(permissionMap.js)、`normalizeResponseData`(responseNormalizer.js)、`DATA_TYPES`/`dataStore`(dataStore.js)、`processLocalData`(localDataHandler.js)——全部是既有 export,不需改動任何 src。
- Produces: 後續每個 Task 的安全網。此檔在 Task 17 前**一字不改**。

- [ ] **Step 1: 寫特徵測試(現況為準,含現況的 bug)**

```js
// tests/coreTypesMigration.characterization.test.js
import { describe, it, assert, beforeEach } from 'vitest';

import { API_PATH_MAP } from '../src/apiInterceptor/apiPathMap.js';
import { NODE_TO_DATA_TYPE } from '../src/apiInterceptor/permissionMap.js';
import { normalizeResponseData } from '../src/apiInterceptor/responseNormalizer.js';
import { DATA_TYPES, dataStore } from '../src/store/dataStore.js';
import { processLocalData } from '../src/localDataHandler.js';

// 特徵(characterization)測試:鎖定舊 14 型別「遷入 registry 前」所有登記面的現況。
// 遷移期間(Task 2–16)任何一步讓本檔變紅 = 行為改變,必須修遷移、不可改本檔。
// Task 17(round-trip 修復)是唯一允許更新本檔斷言的任務(刻意的行為變更)。
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
    rows:           [[1, 2],    [],         []],
    rowsOrSingle:   [[1, 2],    [{ a: 1 }], []],
    dataAsRows:     [[PROBE_A], [PROBE_B],  [1, 2]],
    dataAsSingle:   [[PROBE_A], [PROBE_B],  [[1, 2]]],
    recordAsSingle: [[[1, 2]],  [{ a: 1 }], []],
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

    it('14 舊型別經 lab/patientSummary 別名匯入;小寫 patientsummary 與 masterMenu 現況「不」匯入', async function () {
      const p = (tag) => ({ rObject: [{ tag }] });
      const result = await processLocalData({
        UserID: 'X1',
        medication: p('med'), lab: p('lab'), labdraw: p('labdraw'),
        chinesemed: p('cm'), imaging: p('img'), allergy: p('alg'),
        surgery: p('sur'), discharge: p('dis'), medDays: p('md'),
        patientSummary: p('ps'), adultHealthCheck: p('ahc'),
        cancerScreening: p('cs'), hbcvdata: p('hbcv'), chronicMed: p('chr'),
        // ↓ 下載 JSON 實際輸出的是小寫 patientsummary 與 masterMenu;
        //   現況兩者匯入時被丟棄(round-trip 斷點)。Task 17 修復時更新本測項。
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
      assert.deepEqual(dataStore.getData('patientsummary'), p('ps')); // 駝峰 key 進來
      assert.deepEqual(dataStore.getData('adultHealthCheck'), p('ahc'));
      assert.deepEqual(dataStore.getData('cancerScreening'), p('cs'));
      assert.deepEqual(dataStore.getData('hbcvdata'), p('hbcv'));
      assert.deepEqual(dataStore.getData('chronicMed'), p('chr'));
      assert.isNull(dataStore.getData('masterMenu')); // 現況特徵:被丟棄
    });
  });
});
```

- [ ] **Step 2: 跑新測試檔,全部通過(特徵測試對現況必綠)**

Run: `npx vitest run tests/coreTypesMigration.characterization.test.js`
Expected: PASS(5 個測項全綠)。若有紅的,代表對現況的認知有誤——修測試中的期望值使其如實反映現況,不動 src。

- [ ] **Step 3: 全套測試確認無干擾**

Run: `npm test`
Expected: 285 passed(280 既有 + 5 新增)。

- [ ] **Step 4: Commit**

```bash
git add tests/coreTypesMigration.characterization.test.js
git commit -m "測試:coreTypes 遷移特徵測試(鎖定 14 舊型別全部登記面現況)"
```

---

### Task 2: coreTypes.js + registry 衍生擴充 + 首型別 medication 遷入

**Files:**
- Create: `src/dataTypes/coreTypes.js`
- Create: `tests/coreTypesRegistry.test.js`
- Modify: `src/dataTypes/registry.js`
- Modify: `src/apiInterceptor/apiPathMap.js`
- Modify: `src/apiInterceptor/permissionMap.js`
- Modify: `src/apiInterceptor/responseNormalizer.js`
- Modify: `src/store/dataStore.js`

**Interfaces:**
- Consumes: `DEV_DATA_TYPES`(devTypes.js,不動)。
- Produces: `CORE_DATA_TYPES`(coreTypes.js);registry.js 新增 export `CORE_KEYS: string[]`、`CORE_API_ENTRIES: [string,string][]`、`CORE_SHAPE_ENTRIES: [string,string][]`、`CORE_NODE_TO_TYPES: Record<string,string[]>`。既有 `DEV_*` export 名稱與內容完全不變。

- [ ] **Step 1: 建立 `src/dataTypes/coreTypes.js`(先只含 medication)**

```js
// src/dataTypes/coreTypes.js
// 14 個舊(核心)資料型別的單一描述來源(DOC/07 方向一)。
// 由 registry.js 衍生各接點需要的片段(API_PATH_MAP / NODE_TO_DATA_TYPE /
// TYPE_SHAPE / DATA_TYPES / 抓取分流 / NHITW_DATA / 本地匯入)。
// 遷移中:尚未搬入的型別仍在各檔手寫登記(見 plans/2026-07-07-core-types-registry-migration.md)。
//
// 欄位:
//   key             store key,全系統唯一,照舊不改名(2026-07-07 選項 A 決策)
//   node            NHI masterMenu prsnAuth 授權節點
//   apiPath         API 路徑
//   shape           responseNormalizer 形狀;省略 = 'rows'
//   exportKey       NHITW_DATA/下載 JSON/本地匯入的對外 key;省略 = 與 key 相同。
//                   僅 labdata→'lab'、patientsummary→'patientSummary',不再新增別名。
//   fetchGroup      'special' = 走 specialPromises 分流;省略 = regular 批次
//   cloudSettingKey 特殊型別的 chrome.storage.sync 開關 key;省略 = 恆抓
//
// ⚠️ 陣列順序 = NHITW_DATA key 順序(masterMenu 插在 patientsummary 後)
//    = 下載 JSON key 順序 = DATA_TYPES 順序。不可任意重排。
// masterMenu / permission 為無 apiPath 的偽型別,不在此登記(維持手寫)。

export const CORE_DATA_TYPES = [
  { key: 'medication', node: '2.1', apiPath: 'imue0008/imue0008s02/get-data' },
];
```

- [ ] **Step 2: 擴充 `src/dataTypes/registry.js`(衍生邏輯抽成工具函數,DEV/CORE 共用)**

整檔改為:

```js
// src/dataTypes/registry.js
// 由 coreTypes.js(14 舊型別,遷移中)與 devTypes.js(開發者補抓型別)的描述檔
// 衍生出各既有接點需要的片段。遷移期間,尚未搬入 coreTypes 的舊型別仍在各檔
// 手寫登記,衍生值以「CORE 在前、手寫在後、DEV 最後」的順序併入,維持順序不變。

import { CORE_DATA_TYPES } from './coreTypes';
import { DEV_DATA_TYPES } from './devTypes';

const toKeys = (types) => types.map(t => t.key);
const toApiEntries = (types) => types.map(t => [t.key, t.apiPath]);
// TYPE_SHAPE 併入用:只登記非預設 shape(預設 'rows' 省略)
const toShapeEntries = (types) => types.filter(t => t.shape).map(t => [t.key, t.shape]);
// NODE_TO_DATA_TYPE 併入用:值是「型別陣列」,同節點多型別時 group by node
const toNodeToTypes = (types) => types.reduce((acc, t) => {
  (acc[t.node] ??= []).push(t.key);
  return acc;
}, {});

export const CORE_KEYS = toKeys(CORE_DATA_TYPES);
export const CORE_API_ENTRIES = toApiEntries(CORE_DATA_TYPES);
export const CORE_SHAPE_ENTRIES = toShapeEntries(CORE_DATA_TYPES);
export const CORE_NODE_TO_TYPES = toNodeToTypes(CORE_DATA_TYPES);

export const DEV_KEYS = toKeys(DEV_DATA_TYPES);
export const DEV_API_ENTRIES = toApiEntries(DEV_DATA_TYPES);
export const DEV_SHAPE_ENTRIES = toShapeEntries(DEV_DATA_TYPES);
export const DEV_NODE_TO_TYPES = toNodeToTypes(DEV_DATA_TYPES);
```

- [ ] **Step 3: 寫 registry 不變量測試**

```js
// tests/coreTypesRegistry.test.js
import { describe, it, assert } from 'vitest';

import { CORE_DATA_TYPES } from '../src/dataTypes/coreTypes.js';
import { DEV_DATA_TYPES } from '../src/dataTypes/devTypes.js';
import {
  CORE_KEYS, CORE_API_ENTRIES, CORE_SHAPE_ENTRIES, CORE_NODE_TO_TYPES,
  DEV_NODE_TO_TYPES,
} from '../src/dataTypes/registry.js';

// 內容正確性由 tests/coreTypesMigration.characterization.test.js 鎖定
// (API_PATH_MAP 等最終值),本檔只驗描述檔欄位合法性與 CORE/DEV 不衝突。

describe('dataTypes/coreTypes + registry 不變量', function () {
  const KNOWN_SHAPES = new Set(['rows', 'rowsOrSingle', 'dataAsRows', 'dataAsSingle', 'recordAsSingle']);
  const ALLOWED_EXPORT_ALIAS = new Set(['labdata', 'patientsummary']); // 僅有的 2 個歷史別名,封存不擴充

  it('每個型別都有 key/node/apiPath;選填欄位值合法', function () {
    for (const t of CORE_DATA_TYPES) {
      assert.isString(t.key, `${t.key} key`);
      assert.isString(t.node, `${t.key} node`);
      assert.isString(t.apiPath, `${t.key} apiPath`);
      if (t.shape) assert.isTrue(KNOWN_SHAPES.has(t.shape), `${t.key} shape=${t.shape}`);
      if (t.fetchGroup) assert.strictEqual(t.fetchGroup, 'special', `${t.key} fetchGroup`);
      if (t.cloudSettingKey) assert.match(t.cloudSettingKey, /^fetch[A-Z]/, `${t.key} cloudSettingKey`);
      if (t.exportKey) assert.isTrue(ALLOWED_EXPORT_ALIAS.has(t.key), `${t.key} 不得新增 exportKey 別名`);
      if (t.cloudSettingKey) assert.strictEqual(t.fetchGroup, 'special', `${t.key} 有開關必為 special`);
    }
  });

  it('CORE + DEV 的 key 全域唯一', function () {
    const keys = [...CORE_DATA_TYPES, ...DEV_DATA_TYPES].map(t => t.key);
    assert.strictEqual(new Set(keys).size, keys.length);
  });

  it('CORE 與 DEV 的授權節點不重疊(spread 併入不可靜默覆蓋)', function () {
    for (const node of Object.keys(CORE_NODE_TO_TYPES)) {
      assert.isUndefined(DEV_NODE_TO_TYPES[node], `節點 ${node} 同時出現在 CORE 與 DEV`);
    }
  });

  it('衍生片段對齊描述檔', function () {
    assert.deepEqual(CORE_KEYS, CORE_DATA_TYPES.map(t => t.key));
    assert.deepEqual(CORE_API_ENTRIES, CORE_DATA_TYPES.map(t => [t.key, t.apiPath]));
    assert.deepEqual(CORE_SHAPE_ENTRIES, CORE_DATA_TYPES.filter(t => t.shape).map(t => [t.key, t.shape]));
  });
});
```

Run: `npx vitest run tests/coreTypesRegistry.test.js` → Expected: PASS。

- [ ] **Step 4: 四個接點掛上 CORE spread(在手寫條目「前面」),並刪除 medication 手寫登記**

`src/apiInterceptor/apiPathMap.js` — import 行加 `CORE_API_ENTRIES`,Map 開頭插入 spread,刪除 medication 行:

```js
import { CORE_API_ENTRIES, DEV_API_ENTRIES } from '../dataTypes/registry.js';

export const API_PATH_MAP = new Map([
  // 已遷入 src/dataTypes/coreTypes.js 的核心型別(遷移中,依序搬入)
  ...CORE_API_ENTRIES,
  ["labdata", "imue0060/imue0060s02/get-data"],
  ["labdraw", "imue0060/imue0060s03/get-data"],
  ["chinesemed", "imue0090/imue0090s02/get-data"],
  ["imaging", "imue0130/imue0130s02/get-data"],
  ["allergy", "imue0040/imue0040s02/get-data"],
  ["surgery", "imue0020/imue0020s02/get-data"],
  ["discharge", "imue0070/imue0070s02/get-data"],
  ["medDays", "imue0120/imue0120s01/pres-med-day"],
  ["patientsummary", "imue2000/imue2000s01/get-summary"],
  ["adultHealthCheck", "imue0140/imue0140s01/hpa-data"],
  ["cancerScreening", "imue0150/imue0150s01/hpa-data"],
  ["hbcvdata", "imue0180/imue0180s01/hbcv-data"],
  ["chronicMed", "imue0008/imue0008s05/get-data"],
  // 開發者補抓型別(devFetchAll 才抓);由 src/dataTypes/ 描述檔衍生。
  ...DEV_API_ENTRIES,
]);
```

`src/apiInterceptor/permissionMap.js` — 同法,物件開頭 `...CORE_NODE_TO_TYPES`,刪除 `'2.1': ['medication'],`:

```js
import { CORE_NODE_TO_TYPES, DEV_NODE_TO_TYPES } from '../dataTypes/registry.js';

export const NODE_TO_DATA_TYPE = {
  // 已遷入 src/dataTypes/coreTypes.js 的核心型別(遷移中,依序搬入)
  ...CORE_NODE_TO_TYPES,
  '1.1': ['patientsummary'],
  '1.2': ['hbcvdata'],
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
  // 開發者補抓型別的授權節點;由 src/dataTypes/ 描述檔衍生。與上方節點不重疊。
  ...DEV_NODE_TO_TYPES,
};
```

`src/apiInterceptor/responseNormalizer.js` — TYPE_SHAPE 開頭加 `...CORE_SHAPE_ENTRIES`(medication 無 shape,無行可刪):

```js
import { CORE_SHAPE_ENTRIES, DEV_SHAPE_ENTRIES } from '../dataTypes/registry.js';
// …
const TYPE_SHAPE = new Map([
  // 已遷入 src/dataTypes/coreTypes.js 的核心型別非預設形狀(遷移中,依序搬入)
  ...CORE_SHAPE_ENTRIES,
  ['medDays', 'dataAsRows'],
  ['labdraw', 'dataAsRows'],
  ['patientsummary', 'rowsOrSingle'],
  ['chronicMed', 'dataAsSingle'],
  ['adultHealthCheck', 'recordAsSingle'],
  ['cancerScreening', 'recordAsSingle'],
  ['hbcvdata', 'recordAsSingle'],
  // 開發者補抓型別的非預設形狀;由 src/dataTypes/ 描述檔衍生。
  ...DEV_SHAPE_ENTRIES,
]);
```

`src/store/dataStore.js` — DATA_TYPES 開頭加 `...CORE_KEYS`,刪除 `'medication', `:

```js
import { CORE_KEYS, DEV_KEYS } from '../dataTypes/registry.js';

export const DATA_TYPES = [
  // 已遷入 src/dataTypes/coreTypes.js 的核心型別(遷移中,依序搬入)
  ...CORE_KEYS,
  'labdata', 'labdraw', 'chinesemed', 'imaging',
  'allergy', 'surgery', 'discharge', 'medDays', 'patientsummary',
  'adultHealthCheck', 'cancerScreening', 'hbcvdata', 'chronicMed',
  'masterMenu',
  // JWT 授權清單(非 apiPath 型別,由 fetchAllDataTypes 寫入;值 { nodes, dataTypes })
  'permission',
  // 開發者補抓型別(devFetchAll 才抓);由 src/dataTypes/ 描述檔衍生。
  ...DEV_KEYS,
];
```

- [ ] **Step 5: 全套測試 + 型別檢查**

Run: `npm test` → Expected: 全綠(特徵測試證明順序與內容一字未變)。
Run: `npm run type-check` → Expected: exit 0。

- [ ] **Step 6: Commit**

```bash
git add src/dataTypes/ src/apiInterceptor/apiPathMap.js src/apiInterceptor/permissionMap.js src/apiInterceptor/responseNormalizer.js src/store/dataStore.js tests/coreTypesRegistry.test.js
git commit -m "重構:coreTypes registry 骨架 + medication 遷入(方向一,選項 A)"
```

---

### Task 3: labdata + labdraw 遷入(共用節點 6.1,同 commit)

**Files:**
- Modify: `src/dataTypes/coreTypes.js`
- Modify: `src/apiInterceptor/apiPathMap.js`
- Modify: `src/apiInterceptor/permissionMap.js`
- Modify: `src/apiInterceptor/responseNormalizer.js`
- Modify: `src/store/dataStore.js`

**Interfaces:**
- Consumes: Task 2 的 CORE_* 衍生管線。
- Produces: `CORE_DATA_TYPES` 含 labdata(`exportKey: 'lab'`)與 labdraw(`shape: 'dataAsRows'`、`fetchGroup: 'special'`)。`exportKey`/`fetchGroup` 此階段只是被描述、尚無消費端(Task 15/16/17 才接上);NODE_TO_DATA_TYPE 的 `'6.1'` 改由 group-by-node 衍生。

- [ ] **Step 1: coreTypes.js 在 medication 之後加入兩行**

```js
  { key: 'labdata', node: '6.1', apiPath: 'imue0060/imue0060s02/get-data', exportKey: 'lab' },
  { key: 'labdraw', node: '6.1', apiPath: 'imue0060/imue0060s03/get-data', shape: 'dataAsRows', fetchGroup: 'special' },
```

- [ ] **Step 2: 刪除四檔的手寫登記**

- `apiPathMap.js`:刪 `["labdata", "imue0060/imue0060s02/get-data"],` 與 `["labdraw", "imue0060/imue0060s03/get-data"],`
- `permissionMap.js`:刪 `'6.1': ['labdata', 'labdraw'],`(兩型別同 commit 遷入,節點整顆移走,無 spread 覆蓋窗口)
- `responseNormalizer.js`:刪 `['labdraw', 'dataAsRows'],`
- `dataStore.js`:刪 `'labdata', 'labdraw', `

- [ ] **Step 3: 驗證(特徵測試斷言 '6.1' 衍生後仍是 `['labdata','labdraw']`,順序不變)**

Run: `npm test` → Expected: 全綠。

- [ ] **Step 4: Commit**

```bash
git add src/dataTypes/coreTypes.js src/apiInterceptor/apiPathMap.js src/apiInterceptor/permissionMap.js src/apiInterceptor/responseNormalizer.js src/store/dataStore.js
git commit -m "重構:labdata+labdraw 遷入 coreTypes(共用節點 6.1 同批搬移)"
```

---

### Task 4–8: 五個單純 rows/regular 型別逐一遷入(每型別一 commit)

**Files(每型別相同):**
- Modify: `src/dataTypes/coreTypes.js`
- Modify: `src/apiInterceptor/apiPathMap.js`
- Modify: `src/apiInterceptor/permissionMap.js`
- Modify: `src/store/dataStore.js`
(這五型別皆為預設 rows shape,`responseNormalizer.js` 無行可刪)

**Interfaces:**
- Consumes: Task 2 的 CORE_* 衍生管線。
- Produces: 描述檔逐步長大;各接點手寫條目對應縮短。

每型別依同一節奏:coreTypes.js 加一行 → 刪三檔手寫行 → `npm test` 全綠 → commit。**必須依下列順序**(維持 Map/陣列順序不變):

- [ ] **Task 4: chinesemed**
  - coreTypes.js 加:`{ key: 'chinesemed', node: '3.1', apiPath: 'imue0090/imue0090s02/get-data' },`
  - 刪:apiPathMap `["chinesemed", "imue0090/imue0090s02/get-data"],`;permissionMap `'3.1': ['chinesemed'],`;dataStore `'chinesemed', `
  - Run `npm test` → 全綠。Commit:`git commit -m "重構:chinesemed 遷入 coreTypes"`

- [ ] **Task 5: imaging**
  - coreTypes.js 加:`{ key: 'imaging', node: '6.2', apiPath: 'imue0130/imue0130s02/get-data' },`
  - 刪:apiPathMap `["imaging", "imue0130/imue0130s02/get-data"],`;permissionMap `'6.2': ['imaging'],`;dataStore `'imaging',`
  - Run `npm test` → 全綠。Commit:`git commit -m "重構:imaging 遷入 coreTypes"`

- [ ] **Task 6: allergy**
  - coreTypes.js 加:`{ key: 'allergy', node: '5.1', apiPath: 'imue0040/imue0040s02/get-data' },`
  - 刪:apiPathMap `["allergy", "imue0040/imue0040s02/get-data"],`;permissionMap `'5.1': ['allergy'],`;dataStore `'allergy', `
  - Run `npm test` → 全綠。Commit:`git commit -m "重構:allergy 遷入 coreTypes"`

- [ ] **Task 7: surgery**
  - coreTypes.js 加:`{ key: 'surgery', node: '7.1', apiPath: 'imue0020/imue0020s02/get-data' },`
  - 刪:apiPathMap `["surgery", "imue0020/imue0020s02/get-data"],`;permissionMap `'7.1': ['surgery'],`;dataStore `'surgery', `
  - Run `npm test` → 全綠。Commit:`git commit -m "重構:surgery 遷入 coreTypes"`

- [ ] **Task 8: discharge**
  - coreTypes.js 加:`{ key: 'discharge', node: '8.1', apiPath: 'imue0070/imue0070s02/get-data' },`
  - 刪:apiPathMap `["discharge", "imue0070/imue0070s02/get-data"],`;permissionMap `'8.1': ['discharge'],`;dataStore `'discharge', `
  - Run `npm test` → 全綠。Commit:`git commit -m "重構:discharge 遷入 coreTypes"`

---

### Task 9–10: medDays、patientsummary 遷入(非預設 shape;每型別一 commit)

**Files(每型別相同):** 同 Task 3 的五檔(含 `responseNormalizer.js`)。

**Interfaces:**
- Produces: patientsummary 帶 `exportKey: 'patientSummary'`(Task 16/17 的消費端會用到)。

- [ ] **Task 9: medDays**
  - coreTypes.js 加:`{ key: 'medDays', node: '2.4', apiPath: 'imue0120/imue0120s01/pres-med-day', shape: 'dataAsRows' },`
  - 刪:apiPathMap `["medDays", "imue0120/imue0120s01/pres-med-day"],`;permissionMap `'2.4': ['medDays'],`;responseNormalizer `['medDays', 'dataAsRows'],`;dataStore `'medDays', `
  - Run `npm test` → 全綠。Commit:`git commit -m "重構:medDays 遷入 coreTypes"`

- [ ] **Task 10: patientsummary**
  - coreTypes.js 加:`{ key: 'patientsummary', node: '1.1', apiPath: 'imue2000/imue2000s01/get-summary', shape: 'rowsOrSingle', exportKey: 'patientSummary' },`
  - 刪:apiPathMap `["patientsummary", "imue2000/imue2000s01/get-summary"],`;permissionMap `'1.1': ['patientsummary'],`;responseNormalizer `['patientsummary', 'rowsOrSingle'],`;dataStore `'patientsummary',`
  - 注意:`index.js#fetchSingleDataType` 對 patientsummary 的特殊 query 參數 if 分支**不動**(非登記,是行為特例)。
  - Run `npm test` → 全綠。Commit:`git commit -m "重構:patientsummary 遷入 coreTypes(exportKey 駝峰別名)"`

---

### Task 11–13: 三個 special 型別遷入(cloudSettingKey;每型別一 commit)

**Files(每型別相同):** 同 Task 3 的五檔。

**Interfaces:**
- Produces: 三型別帶 `fetchGroup: 'special'` + `cloudSettingKey`。此階段 `authorization.js` 的 SPECIAL_DATA_TYPE_SETTING_KEYS 與 `index.js` 的 specialTypes 仍是手寫(Task 15 才切換),描述欄位先就位。

- [ ] **Task 11: adultHealthCheck**
  - coreTypes.js 加:`{ key: 'adultHealthCheck', node: '6.3', apiPath: 'imue0140/imue0140s01/hpa-data', shape: 'recordAsSingle', fetchGroup: 'special', cloudSettingKey: 'fetchAdultHealthCheck' },`
  - 刪:apiPathMap `["adultHealthCheck", "imue0140/imue0140s01/hpa-data"],`;permissionMap `'6.3': ['adultHealthCheck'],`;responseNormalizer `['adultHealthCheck', 'recordAsSingle'],`;dataStore `'adultHealthCheck', `
  - Run `npm test` → 全綠。Commit:`git commit -m "重構:adultHealthCheck 遷入 coreTypes"`

- [ ] **Task 12: cancerScreening**
  - coreTypes.js 加:`{ key: 'cancerScreening', node: '6.4', apiPath: 'imue0150/imue0150s01/hpa-data', shape: 'recordAsSingle', fetchGroup: 'special', cloudSettingKey: 'fetchCancerScreening' },`
  - 刪:apiPathMap `["cancerScreening", "imue0150/imue0150s01/hpa-data"],`;permissionMap `'6.4': ['cancerScreening'],`;responseNormalizer `['cancerScreening', 'recordAsSingle'],`;dataStore `'cancerScreening', `
  - Run `npm test` → 全綠。Commit:`git commit -m "重構:cancerScreening 遷入 coreTypes"`

- [ ] **Task 13: hbcvdata**
  - coreTypes.js 加:`{ key: 'hbcvdata', node: '1.2', apiPath: 'imue0180/imue0180s01/hbcv-data', shape: 'recordAsSingle', fetchGroup: 'special', cloudSettingKey: 'fetchHbcvdata' },`
  - 刪:apiPathMap `["hbcvdata", "imue0180/imue0180s01/hbcv-data"],`;permissionMap `'1.2': ['hbcvdata'],`;responseNormalizer `['hbcvdata', 'recordAsSingle'],`;dataStore `'hbcvdata', `
  - Run `npm test` → 全綠。Commit:`git commit -m "重構:hbcvdata 遷入 coreTypes"`

---

### Task 14: chronicMed 遷入(最後一型別;四個手寫登記面掏空)

**Files:** 同 Task 3 的五檔。

**Interfaces:**
- Produces: `CORE_DATA_TYPES` 完整 14 型別;apiPathMap/permissionMap/responseNormalizer/dataStore 的手寫舊型別條目歸零(只剩 spread 與 masterMenu/permission)。

- [ ] **Step 1: coreTypes.js 加最後一行**

```js
  { key: 'chronicMed', node: '2.3', apiPath: 'imue0008/imue0008s05/get-data', shape: 'dataAsSingle' },
```

- [ ] **Step 2: 刪除最後的手寫登記,並清掉「遷移中」過渡註解**

- `apiPathMap.js`:刪 `["chronicMed", "imue0008/imue0008s05/get-data"],`。此時 Map 應為 `new Map([...CORE_API_ENTRIES, ...DEV_API_ENTRIES])`;註解改為「核心型別與開發者補抓型別皆由 src/dataTypes/ 描述檔衍生」。
- `permissionMap.js`:刪 `'2.3': ['chronicMed'],`。物件應為 `{ ...CORE_NODE_TO_TYPES, ...DEV_NODE_TO_TYPES }`;同步更新註解。
- `responseNormalizer.js`:刪 `['chronicMed', 'dataAsSingle'],`。TYPE_SHAPE 應為 `new Map([...CORE_SHAPE_ENTRIES, ...DEV_SHAPE_ENTRIES])`;同步更新註解。
- `dataStore.js`:刪 `'chronicMed',`。DATA_TYPES 應為 `[...CORE_KEYS, 'masterMenu', 'permission', ...DEV_KEYS]`;同步更新註解。
- `coreTypes.js` 檔頭:刪「遷移中:尚未搬入的型別…」一段。

- [ ] **Step 3: 驗證**

Run: `npm test` → Expected: 全綠(特徵測試證明 25 條 API、21 節點、14 shape、27 個 DATA_TYPES 與遷移前一字不差)。
Run: `npm run type-check` → Expected: exit 0。

- [ ] **Step 4: Commit**

```bash
git add src/dataTypes/coreTypes.js src/apiInterceptor/apiPathMap.js src/apiInterceptor/permissionMap.js src/apiInterceptor/responseNormalizer.js src/store/dataStore.js
git commit -m "重構:chronicMed 遷入 coreTypes,四個登記面手寫條目歸零"
```

---

### Task 15: 抓取分流由 registry 衍生(index.js + authorization.js)

**Files:**
- Modify: `src/dataTypes/registry.js`
- Modify: `src/apiInterceptor/index.js:244-260`(regularTypes/specialTypes 手寫陣列)
- Modify: `src/apiInterceptor/authorization.js:5-9`(SPECIAL_DATA_TYPE_SETTING_KEYS)

**Interfaces:**
- Consumes: `CORE_DATA_TYPES` 的 `fetchGroup`/`cloudSettingKey` 欄位(Task 3/11–13 已就位)。
- Produces: registry 新增 export `CORE_REGULAR_KEYS: string[]`、`CORE_SPECIAL_KEYS: string[]`、`CORE_SETTING_KEYS: Record<string,string>`。`SPECIAL_DATA_TYPE_SETTING_KEYS` 對外名稱與內容不變(`tests/test_authorization.js` 有內容斷言守著)。

- [ ] **Step 1: registry.js 加三個衍生 export**

```js
// index.js 抓取分流用:regular 批次 / special 批次(經 shouldFetchSpecialData 閘門)
export const CORE_REGULAR_KEYS = CORE_DATA_TYPES.filter(t => t.fetchGroup !== 'special').map(t => t.key);
export const CORE_SPECIAL_KEYS = CORE_DATA_TYPES.filter(t => t.fetchGroup === 'special').map(t => t.key);
// authorization.js 用:特殊型別 → chrome.storage.sync 開關 key
export const CORE_SETTING_KEYS = Object.fromEntries(
  CORE_DATA_TYPES.filter(t => t.cloudSettingKey).map(t => [t.key, t.cloudSettingKey])
);
```

- [ ] **Step 2: coreTypesRegistry.test.js 加分流內容斷言**

檔頭的 registry import 擴充為:

```js
import {
  CORE_KEYS, CORE_API_ENTRIES, CORE_SHAPE_ENTRIES, CORE_NODE_TO_TYPES,
  CORE_REGULAR_KEYS, CORE_SPECIAL_KEYS, CORE_SETTING_KEYS,
  DEV_NODE_TO_TYPES,
} from '../src/dataTypes/registry.js';
```

describe 區塊內新增:

```js
  it('抓取分流衍生對齊現行 index.js 的手寫清單', function () {
    assert.deepEqual(CORE_REGULAR_KEYS, [
      'medication', 'labdata', 'chinesemed', 'imaging',
      'allergy', 'surgery', 'discharge', 'medDays',
      'patientsummary', 'chronicMed',
    ]);
    // 衍生序為描述檔序(labdraw 在前);與舊手寫序的差異見 Step 3 說明
    assert.deepEqual(CORE_SPECIAL_KEYS, ['labdraw', 'adultHealthCheck', 'cancerScreening', 'hbcvdata']);
    assert.deepEqual(CORE_SETTING_KEYS, {
      adultHealthCheck: 'fetchAdultHealthCheck',
      cancerScreening: 'fetchCancerScreening',
      hbcvdata: 'fetchHbcvdata',
    });
  });
```

- [ ] **Step 3: index.js 手寫陣列改衍生**

import 行:`import { CORE_REGULAR_KEYS, CORE_SPECIAL_KEYS, DEV_KEYS } from '../dataTypes/registry.js';`

```js
  // 由 coreTypes 描述檔衍生:regular = 一般批次;special = 經 shouldFetchSpecialData 閘門
  const regularTypes = CORE_REGULAR_KEYS;
```

```js
  const specialTypes = CORE_SPECIAL_KEYS;
```

刪除原本兩個手寫陣列。**已知差異**:specialTypes 順序由 `[adultHealthCheck, cancerScreening, hbcvdata, labdraw]` 變為描述檔序 `[labdraw, adultHealthCheck, cancerScreening, hbcvdata]`,只影響 `dataFetchCompleted` 事件 detail(results 陣列)內部排序;已 grep 確認唯一 listener 鏈(settingsManager → useSettingsState)整包轉發、全量重處理、不索引 results 位置。實作時重新 grep `dataFetchCompleted` 確認仍然如此。

- [ ] **Step 4: authorization.js 改衍生**

```js
import { NODE_TO_DATA_TYPE } from './permissionMap.js';
import { CORE_SETTING_KEYS } from '../dataTypes/registry.js';

// 特殊資料型別(健檢/癌篩/hbcv)對應的 chrome.storage.sync 設定 key;
// 由 coreTypes 描述檔的 cloudSettingKey 衍生。
export const SPECIAL_DATA_TYPE_SETTING_KEYS = CORE_SETTING_KEYS;
```

- [ ] **Step 5: 驗證**

Run: `npm test` → Expected: 全綠(test_authorization.js 的 SPECIAL_DATA_TYPE_SETTING_KEYS 內容斷言不變)。

- [ ] **Step 6: Commit**

```bash
git add src/dataTypes/registry.js src/apiInterceptor/index.js src/apiInterceptor/authorization.js tests/coreTypesRegistry.test.js
git commit -m "重構:抓取分流與特殊型別開關 key 由 coreTypes 衍生"
```

---

### Task 16: NHITW_DATA 匯出由 registry 衍生(nhitwExport.js)

**Files:**
- Modify: `src/store/nhitwExport.js:18-40`(buildShareData)

**Interfaces:**
- Consumes: `CORE_DATA_TYPES`(直接 import 描述檔;用 `exportKey ?? key`)。
- Produces: `buildShareData` 簽名與輸出格式完全不變(`tests/nhitwExport.test.js` 的 17-key 順序斷言守著,含 masterMenu 位置)。

- [ ] **Step 1: buildShareData 改為迭代描述檔**

```js
import { dataStore } from './dataStore';
import { CORE_DATA_TYPES } from '../dataTypes/coreTypes';
import { debugLog } from '../utils/logger';
```

```js
export const buildShareData = (timestamp = Date.now()) => {
  const shareData = { timestamp };
  for (const t of CORE_DATA_TYPES) {
    shareData[t.exportKey ?? t.key] = dataStore.getData(t.key);
    // masterMenu 為無 apiPath 的偽型別,不在描述檔;
    // 對外契約既定順序:固定插在 patientSummary 之後(見 DOC/02 表格)。
    if (t.key === 'patientsummary') {
      shareData.masterMenu = dataStore.getData('masterMenu');
    }
  }
  // 對外契約欄位(2026-07-05):快照是否因大小限制被截斷。
  // 截斷策略未實作,目前恆為 false;實作後由截斷邏輯設 true。
  shareData.truncated = false;
  return shareData;
};
```

刪除原本 17 行手寫物件字面值。檔頭註解的「格式:timestamp 最前…」段落維持。

- [ ] **Step 2: 驗證(key 順序斷言是本任務的驗收核心)**

Run: `npx vitest run tests/nhitwExport.test.js` → Expected: PASS(17 個 key 順序一字不差)。
Run: `npm test` → Expected: 全綠。

- [ ] **Step 3: Commit**

```bash
git add src/store/nhitwExport.js
git commit -m "重構:buildShareData 由 coreTypes 描述檔衍生(exportKey)"
```

---

### Task 17: 本地匯入/下載 key 衍生 + round-trip 修復(唯一的行為變更,兩個 commit)

**Files:**
- Modify: `src/dataTypes/registry.js`(加 `CORE_EXPORT_KEY`)
- Modify: `src/localDataHandler.js:14-31`(LOCAL_KEY_TO_STORE_TYPE)
- Modify: `src/apiInterceptor/messageHandlers.js:93-96`(下載 JSON key)
- Modify: `tests/coreTypesMigration.characterization.test.js`(僅修復 commit 允許更新)
- Modify: `tests/localDataImportClear.test.js`(補 round-trip 測項)

**Interfaces:**
- Consumes: `CORE_DATA_TYPES` 的 `exportKey`。
- Produces: registry 新增 export `CORE_EXPORT_KEY: Map<string,string>`(store key → 對外 key,只含有別名的型別)。

**背景(實測 `.test_data/json/` 下載檔確認)**:下載 JSON 頂層 key 為小寫 `patientsummary`(`messageHandlers.js` 只別名 labdata→lab)與 `masterMenu`,但 `LOCAL_KEY_TO_STORE_TYPE` 只認駝峰 `patientSummary`、且無 masterMenu 條目——**兩者匯入時被靜默丟棄**(現有 147 個下載檔皆如此)。本任務先做零行為的衍生化,再以獨立 commit 修復。

- [ ] **Step 1(commit A,零行為變更): LOCAL_KEY_TO_STORE_TYPE 改衍生**

```js
import { CORE_DATA_TYPES } from './dataTypes/coreTypes';
import { DEV_KEYS } from './dataTypes/registry';

// 本地 JSON 的 key → store 型別。核心型別由描述檔衍生(exportKey 別名:
// lab→labdata、patientSummary→patientsummary);permission 為偽型別手寫;
// 開發者補抓型別名字已統一,一律 [key, key]。
const LOCAL_KEY_TO_STORE_TYPE = new Map([
  ...CORE_DATA_TYPES.map(t => [t.exportKey ?? t.key, t.key]),
  ['permission', 'permission'],
  ...DEV_KEYS.map(key => [key, key]),
]);
```

刪除原本 15 行手寫條目。Run: `npm test` → 全綠(衍生結果與手寫一模一樣)。

```bash
git add src/localDataHandler.js
git commit -m "重構:本地匯入 key 對照由 coreTypes 衍生"
```

- [ ] **Step 2(commit B,行為變更): 修復 round-trip 三斷點**

(1) registry.js 加:

```js
// messageHandlers 下載 JSON 用:store key → 對外 key(只含有別名的型別)
export const CORE_EXPORT_KEY = new Map(
  CORE_DATA_TYPES.filter(t => t.exportKey).map(t => [t.key, t.exportKey])
);
```

(2) `messageHandlers.js` — 下載 JSON 的 key 改用完整別名表(修復:patientsummary 下載後改輸出駝峰 `patientSummary`,與 NHITW_DATA/匯入對照一致):

```js
import { CORE_EXPORT_KEY } from '../dataTypes/registry.js';
```

把 `const key = dataType === 'labdata' ? 'lab' : dataType;` 改為:

```js
          const key = CORE_EXPORT_KEY.get(dataType) ?? dataType;
```

(3) `localDataHandler.js` — LOCAL_KEY_TO_STORE_TYPE 補兩條相容條目:

```js
const LOCAL_KEY_TO_STORE_TYPE = new Map([
  ...CORE_DATA_TYPES.map(t => [t.exportKey ?? t.key, t.key]),
  // 舊版下載 JSON 相容:2026-07 前的下載檔 patientsummary 為小寫(修復前的
  // messageHandlers 只別名 labdata→lab),既有 .test_data 個案檔皆此格式。
  ['patientsummary', 'patientsummary'],
  // masterMenu 在下載 JSON 內但原對照表漏登記,匯入時被丟棄;補上使 round-trip 完整。
  ['masterMenu', 'masterMenu'],
  ['permission', 'permission'],
  ...DEV_KEYS.map(key => [key, key]),
]);
```

(4) 更新特徵測試(這是全計畫唯一允許改此檔的地方)——`tests/coreTypesMigration.characterization.test.js` 最後一個測項的兩行斷言反轉:

```js
      assert.deepEqual(dataStore.getData('patientsummary'), p('ps')); // 駝峰仍優先(Map 迭代序:patientSummary 先寫入,patientsummary 後寫入覆蓋)
```

改為(注意:小寫條目在 Map 中排在駝峰之後,兩 key 併存時後者覆蓋——同一 store 型別,取最後寫入值):

```js
      assert.deepEqual(dataStore.getData('patientsummary'), p('ps-lower')); // 修復後:小寫 key 也匯入(舊下載檔相容);兩 key 併存時後迭代者覆蓋
      // …
      assert.deepEqual(dataStore.getData('masterMenu'), p('mm')); // 修復後:masterMenu 匯入
```

並把測項名稱改為 `'14 舊型別經別名匯入;小寫 patientsummary 與 masterMenu 修復後可匯入(round-trip 完整)'`,測項內註解同步更新。

(5) `tests/localDataImportClear.test.js` 加一個下載檔格式的 round-trip 測項(合成假資料,key 集合仿真實下載檔):

```js
  it('舊版下載 JSON(小寫 patientsummary + masterMenu)可完整匯入(round-trip 修復)', async function () {
    const result = await processLocalData({
      UserName: '丁', UserID: 'D4',
      lab: { rObject: [{ lab: 'D檢' }] },
      patientsummary: { rObject: [{ s: 'D摘' }] },
      masterMenu: { rObject: [{ m: 'D單' }] },
    }, 'd-legacy.json');
    assert.isTrue(result.success);
    assert.deepEqual(dataStore.getData('labdata'), { rObject: [{ lab: 'D檢' }] });
    assert.deepEqual(dataStore.getData('patientsummary'), { rObject: [{ s: 'D摘' }] });
    assert.deepEqual(dataStore.getData('masterMenu'), { rObject: [{ m: 'D單' }] });
  });
```

- [ ] **Step 3: 驗證**

Run: `npm test` → Expected: 全綠(含更新後的特徵測試與新 round-trip 測項)。

- [ ] **Step 4: Commit**

```bash
git add src/dataTypes/registry.js src/apiInterceptor/messageHandlers.js src/localDataHandler.js tests/coreTypesMigration.characterization.test.js tests/localDataImportClear.test.js
git commit -m "修復:下載 JSON round-trip 三斷點(patientSummary 下載鍵、小寫相容匯入、masterMenu 匯入)"
```

---

### Task 18: 文件同步 + 最終驗證(含 .test_data 實機驗證)

**Files:**
- Modify: `DOC/02_NHITW_DATA_對外契約.md`(「已知落差」若提及 masterMenu 匯入,更新)
- Modify: `DOC/03_開發與維護指南.md`(「新增資料型別」清單改為「在 coreTypes.js/devTypes.js 加一行描述」)
- Modify: `DOC/06_API資料對照與擷取流程.md`(下載 JSON 欄位:patientsummary → patientSummary)
- Modify: `DOC/07_擴充藍圖.md`(方向一狀態:pilot → 舊 14 型別已完成遷入;方向四前置條件達成註記)
- Modify: `docs/superpowers/specs/2026-07-07-developer-mode-full-fetch-handoff.md`(§3.3 標記完成)
- Modify: `src/dataTypes/devTypes.js`(檔頭「14 個舊型別維持原分散登記並存」註解過時,更新)

- [ ] **Step 1: 自動化最終驗證**

Run: `npm test` → 全綠;`npm run type-check` → exit 0;`npm run build` → exit 0;
`npx eslint src/dataTypes/ src/apiInterceptor/ src/store/ src/localDataHandler.js` → 0 error。

- [ ] **Step 2: 本機實機驗證(用 `.test_data/json/` 真實個案檔;絕不入版控)**

1. `npm run build` → Chrome「載入未封裝項目」指向 `dist/`。
2. 開 popup →「匯入本地 JSON」→ 選 `.test_data/json/` 任一舊下載檔(如 `20260623_1501_U200137477.json`)。
3. 驗證:各 tab 顯示正常;**病摘(patientsummary)與 masterMenu 有資料**(修復前這兩項匯入即丟失——這是與遷移前行為的可見差異點)。
4. (可選,需 NHI 登入 session)實抓一輪 → 下載 JSON → 確認頂層 key 為 `patientSummary`(駝峰)→ 再匯入該檔確認 round-trip。
5. 檢查 `NHITW_DATA`(DevTools console:`JSON.parse(localStorage.getItem('NHITW_DATA'))`):17 個 key 順序與 DOC/02 表格一致。
6. 個案檔與其任何衍生物**不 commit**;要留紀錄一律改寫成合成假資料。

- [ ] **Step 3: 文件逐項更新**

- DOC/03「新增資料型別」清單:原本的多檔登記步驟改為「`coreTypes.js`(核心)或 `devTypes.js`(開發者補抓)加一行描述 + 補 processor/UI(方向二範圍)」。
- DOC/06:下載 JSON 欄位對照中 `patientsummary` 改 `patientSummary`,註記 2026-07 起駝峰、舊小寫檔可匯入。
- DOC/07 方向一:狀態註記「2026-07-07 舊 14 型別完成遷入,分散登記已刪除;方向四前置條件(registry 就位)達成」。
- DOC/02:若「已知落差」段落提及匯入限制,同步 round-trip 修復;`truncated`/順序描述不變。
- handoff §3.3:標記完成,指向本 plan 檔。
- devTypes.js 檔頭:刪「14 個舊型別維持原分散登記並存」句,改指 coreTypes.js。

- [ ] **Step 4: Commit**

```bash
git add DOC/ docs/superpowers/specs/2026-07-07-developer-mode-full-fetch-handoff.md src/dataTypes/devTypes.js
git commit -m "文件:方向一舊 14 型別遷入完成,DOC/02/03/06/07 與 handoff 同步"
```

版號 bump 與 push 依專案慣例由維護者於收尾時處理(參照 `fb1f786` 的作法),不在本計畫內。

---

## 風險與回退

- 每個 commit 獨立可回退(`git revert` 單型別);特徵測試在 HEAD 任何位置都應綠。
- 若實機驗證(Task 18 Step 2)發現形狀/欄位與描述檔不符:修 `coreTypes.js` 對應欄位 + 補特徵測試,不動 normalizer 既有五形狀,除非真的出現第六種形狀(依 handoff §3.1 的既有規則處理)。
- Task 17 commit B 若被否決:revert 該 commit 即回到「衍生化但行為照舊」狀態,遷移本體不受影響。
