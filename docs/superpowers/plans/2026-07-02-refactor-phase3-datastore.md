# 階段 3:dataStore 取代 window 全域變數 實作計畫

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 以 `src/store/dataStore.js` 集中管理醫療資料,移除 15 個 `window.lastIntercepted*` 全域變數,並將 `NHITW_DATA` localStorage 跨 extension 交換輸出**統一為單一格式**(經使用者確認:下游 extension 為實驗性質,可配合調整)。

**Architecture:** dataStore 是純 JS 模組(Map + pub-sub),為資料的單一真實來源。遷移採**雙寫過渡**:Task 3-4 讓寫入端同時寫 store 與 window(每個 commit 可出貨),Task 5 遷移所有讀取端到 store,Task 6 才移除 window 寫入與全域宣告。`NHITW_DATA` 匯出抽成獨立模組,**單一 builder 統一兩條寫入路徑的格式**,以測試鎖定 JSON key 順序與 null/省略語意。React 端維持 `dataFetchCompleted` 事件機制不動(store 訂閱整合留給階段 4 拆 FloatingIcon 時)。

**Tech Stack:** 純 JavaScript(無新依賴)、Vitest(現有 125 測試作安全網)、jsdom localStorage。

**規格文件:** `docs/superpowers/specs/2026-07-02-architecture-analysis.md` 階段 3
**分支:** `refactor-phase3`(已建立,基於 feature-CKM)

**每個 Task 完成後的通用驗證:** `npx vitest run` 全綠 + `npm run build` 成功。

---

## 背景知識(worker 必讀)

### 現行資料流(2026-07-02 實況,CLAUDE.md 的描述已過時)

- **`src/legacyContent.js` 是主動抓取引擎**(非攔截):`fetchAllDataTypes()` 平行呼叫 NHI API(`API_PATH_MAP` 14 種),每種資料經 `normalizeResponseData` 後寫入 `window[DATA_VAR_MAP.get(type)]`;全部完成後呼叫 `saveToLocalStorage()` 並 dispatch `dataFetchCompleted` CustomEvent。
- **`src/background.js` 只有 30 行**(badge 與 openPopup),完全沒有 chrome.storage 資料儲存。
- **`src/localDataHandler.js`** 處理 popup 上傳的本地 JSON:寫 `window.lastIntercepted*`、寫 `NHITW_DATA`、dispatch 事件。
- **讀取端**:`dataManager.collectDataSources()`(13 個 window 讀取)、`settingsManager.js`(8 處 reprocess 讀取)、`FloatingIcon.jsx`(3 處 settings listener 讀取)、`legacyContent.js` 自身(`observeUrlChanges` 讀 medication 判斷是否需要抓取、`getPatientData` 訊息組下載 JSON)。

### NHITW_DATA 跨 extension 交換(**本計畫的最高保護目標**)

寫入 page `localStorage`(content script 與同頁面其他 extension 的 content script **共享** page localStorage;window 全域反而在 isolated world 中互不可見——這就是為什麼 window.* 可以移除、NHITW_DATA 不可以)。寫入後 dispatch `window.dispatchEvent(new Event('storage'))` 通知監聽者。本 extension 自己不讀 `NHITW_DATA`,它是純輸出契約。

**原本兩條寫入路徑格式不一致**(主動抓取版:`patientsummary` 小寫、timestamp 最前、含 labdraw;本地匯入版:`patientSummary` 大寫、timestamp 最後、含 masterMenu 與三個永遠 undefined 的 key)。**經使用者確認(2026-07-02):下游 extension 為實驗性質、可配合調整,本計畫統一為單一格式**:

```
timestamp(最前), medication, lab(←labdata 改名), labdraw, chinesemed, imaging,
allergy, surgery, discharge, medDays, patientSummary(統一駝峰), masterMenu,
adultHealthCheck, cancerScreening, hbcvdata, chronicMed
```

- 取兩種舊格式的聯集(含 `labdraw` 與 `masterMenu`)
- `patientSummary` 統一駝峰(與 `adultHealthCheck`、`medDays` 命名一致)
- 移除從未被賦值的 `rehabilitation`/`acupuncture`/`specialChineseMedCare`(舊輸出中因 undefined 被 JSON.stringify 省略,從未實際出現,移除零影響)
- 未載入的型別輸出 `"key":null`(維持舊語意)
- **下游 extension 需要的唯一適配**:若原本讀 `patientsummary`(小寫),改讀 `patientSummary`;若依賴「本地匯入版 timestamp 在最後」的 key 順序解析(不太可能),改用標準 JSON parse 即可

### 其他 window 全域(**本計畫不動**,記錄以免誤刪)

`window._localUserInfo`、`window.nhiDataBeingFetched`、`window.openFloatingIconDialog`、`window.isFloatingIconOpening`、`window._earlyEvents`、`window.medicationFormatSettings`、`window.customMedicationHeaderCopyFormat`、`window.customMedicationDrugCopyFormat`、`window.lastProcessedMedicationData`、`window.fetchNHI_Data`、`window.getSessionData`。

### 階段 4 清理目標(本計畫盤點,留待下一階段處理)

- `localDataHandler.js` 的 default export `localDataHandler` 物件(~135 行死碼;contentScript 實際使用的是頂層 named exports)。
- `window.lastProcessedMedicationData`:唯一寫入點在上述死碼內,repo 內無讀取者。
- `window.nhiDataBeingFetched`/`window.fetchNHI_Data`/`window.getSessionData`:repo 內無讀取者,疑為 debug hook,待決定去留。
- `window.medicationFormatSettings` 與 `window.customMedicationHeaderCopyFormat`/`window.customMedicationDrugCopyFormat`:medicationProcessor 的 window 側通道,應收進 settings 參數傳遞。
- `masterMenu` 型別永遠為 `null`(殘留欄位,無實際資料來源)。

### 環境注意

- PowerShell 5.1:無 `&&`,分開執行或用 `;`。
- Rollup 出現含 `DiskD` 的路徑錯誤 → `rm -rf dist node_modules/.vite` 後重建(subst 磁碟快取問題)。
- `vitest.config.js` 的 `resolve.preserveSymlinks: true` 不可移除。
- repo 有 ~2,160 個既存 stylistic lint 問題:驗證標準是「不新增」,不是「全綠」。
- UI 字串、註解、commit message 繁體中文。

---

## 檔案結構

| 檔案 | 職責 |
|------|------|
| Create: `src/store/dataStore.js` | 資料單一真實來源:`DATA_TYPES`、`setData`、`getData`、`clearAll`、`subscribe` |
| Create: `src/store/nhitwExport.js` | NHITW_DATA 匯出:`buildShareData`(統一格式)、`writeShareDataToLocalStorage` |
| Create: `tests/dataStore.test.js`、`tests/nhitwExport.test.js` | TDD 測試 |
| Modify: `src/legacyContent.js` | 寫入端遷移(雙寫→純 store)、saveToLocalStorage 改用匯出模組 |
| Modify: `src/localDataHandler.js` | 寫入端遷移、NHITW_DATA 寫入改用匯出模組 |
| Modify: `src/utils/dataManager.js`、`src/utils/settingsManager.js`、`src/components/FloatingIcon.jsx` | 讀取端遷移 |
| Modify: `CLAUDE.md`(磁碟,gitignored)、規格/計畫文件 | 資料流文件大改(修正過時的攔截架構描述) |

---

### Task 1: dataStore 核心(TDD)

**Files:**
- Create: `src/store/dataStore.js`
- Test: `tests/dataStore.test.js`

- [x] **Step 1: 寫失敗測試 `tests/dataStore.test.js`**

```js
import { describe, it, assert, beforeEach, vi } from 'vitest';

import { dataStore, DATA_TYPES } from '../src/store/dataStore.js';

describe('store/dataStore', function () {
  beforeEach(() => {
    dataStore.clearAll();
  });

  it('DATA_TYPES 涵蓋全部 15 種資料型別', function () {
    assert.deepEqual(DATA_TYPES, [
      'medication', 'labdata', 'labdraw', 'chinesemed', 'imaging',
      'allergy', 'surgery', 'discharge', 'medDays', 'patientsummary',
      'adultHealthCheck', 'cancerScreening', 'hbcvdata', 'chronicMed',
      'masterMenu',
    ]);
  });

  it('已知型別未設值時回傳 null(對齊 window 變數初始化為 null 的語意)', function () {
    assert.isNull(dataStore.getData('medication'));
  });

  it('未知型別回傳 undefined(對齊從未宣告的 window 變數,JSON.stringify 會省略)', function () {
    assert.isUndefined(dataStore.getData('rehabilitation'));
  });

  it('setData 後 getData 回傳同一參考', function () {
    const data = { rObject: [{ a: 1 }] };
    dataStore.setData('medication', data);
    assert.strictEqual(dataStore.getData('medication'), data);
  });

  it('clearAll 將所有已知型別重設為 null', function () {
    dataStore.setData('medication', { rObject: [1] });
    dataStore.setData('masterMenu', { rObject: [2] });
    dataStore.clearAll();
    assert.isNull(dataStore.getData('medication'));
    assert.isNull(dataStore.getData('masterMenu'));
  });

  it('subscribe 在 setData 時收到 (type, data),unsubscribe 後不再收到', function () {
    const listener = vi.fn();
    const unsubscribe = dataStore.subscribe(listener);

    const data = { rObject: [] };
    dataStore.setData('labdata', data);
    assert.deepEqual(listener.mock.calls, [['labdata', data]]);

    unsubscribe();
    dataStore.setData('labdata', { rObject: [1] });
    assert.equal(listener.mock.calls.length, 1);
  });

  it('subscribe 在 clearAll 時對每個已知型別各收到一次 (type, null)', function () {
    const listener = vi.fn();
    dataStore.subscribe(listener);
    dataStore.clearAll();
    assert.equal(listener.mock.calls.length, DATA_TYPES.length);
    assert.deepEqual(listener.mock.calls[0], [DATA_TYPES[0], null]);
  });

  it('某個 listener 拋錯不影響其他 listener', function () {
    const bad = vi.fn(() => { throw new Error('boom'); });
    const good = vi.fn();
    dataStore.subscribe(bad);
    dataStore.subscribe(good);
    dataStore.setData('imaging', { rObject: [] });
    assert.equal(good.mock.calls.length, 1);
  });
});
```

- [x] **Step 2: 執行確認失敗**

Run: `npx vitest run tests/dataStore.test.js`
Expected: FAIL(找不到 `../src/store/dataStore.js`)

- [x] **Step 3: 實作 `src/store/dataStore.js`**

```js
// dataStore.js
// 醫療資料的單一真實來源,取代 window.lastIntercepted* 全域變數。
// 語意刻意對齊舊 window 變數行為:
//   - DATA_TYPES 內的型別初始化為 null(舊變數宣告時 = null)
//   - 未知型別回傳 undefined(舊的未宣告變數),JSON.stringify 時會被省略
// React 端目前仍以 dataFetchCompleted 事件驅動;subscribe 供階段 4 整合用。

export const DATA_TYPES = [
  'medication', 'labdata', 'labdraw', 'chinesemed', 'imaging',
  'allergy', 'surgery', 'discharge', 'medDays', 'patientsummary',
  'adultHealthCheck', 'cancerScreening', 'hbcvdata', 'chronicMed',
  'masterMenu',
];

const createInitialMap = () => new Map(DATA_TYPES.map(type => [type, null]));

let store = createInitialMap();
const listeners = new Set();

const notify = (type, data) => {
  for (const listener of listeners) {
    try {
      listener(type, data);
    } catch (e) {
      console.error('[dataStore] listener 執行錯誤:', e);
    }
  }
};

export const dataStore = {
  setData(type, data) {
    store.set(type, data);
    notify(type, data);
  },

  getData(type) {
    return store.get(type);
  },

  clearAll() {
    store = createInitialMap();
    for (const type of DATA_TYPES) {
      notify(type, null);
    }
  },

  subscribe(listener) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
};
```

- [x] **Step 4: 執行確認通過**

Run: `npx vitest run tests/dataStore.test.js`
Expected: 8 tests passed

- [x] **Step 5: 全量驗證與 Commit**

Run: `npx vitest run`(15 檔 / 133 測試)、`npx eslint src/store tests/dataStore.test.js`(乾淨)

```bash
git add src/store/dataStore.js tests/dataStore.test.js
git commit -m "新增 dataStore:醫療資料單一真實來源(取代 window 全域的基礎)"
```

---

### Task 2: NHITW_DATA 匯出模組(TDD,統一格式)

**Files:**
- Create: `src/store/nhitwExport.js`
- Test: `tests/nhitwExport.test.js`

- [x] **Step 1: 寫失敗測試 `tests/nhitwExport.test.js`**

```js
import { describe, it, assert, beforeEach, afterEach, vi } from 'vitest';

import { dataStore } from '../src/store/dataStore.js';
import { buildShareData, writeShareDataToLocalStorage } from '../src/store/nhitwExport.js';

describe('store/nhitwExport', function () {
  beforeEach(() => {
    dataStore.clearAll();
    localStorage.removeItem('NHITW_DATA');
  });

  afterEach(() => {
    localStorage.removeItem('NHITW_DATA');
  });

  describe('.buildShareData(統一格式)', function () {
    it('key 順序固定:timestamp 最前、labdata 改名 lab、patientSummary 駝峰、含 labdraw 與 masterMenu', function () {
      const med = { rObject: [{ drug: 'aspirin' }] };
      dataStore.setData('medication', med);
      dataStore.setData('labdata', { rObject: [{ lab: 'x' }] });
      dataStore.setData('patientsummary', { rObject: [{ s: 1 }] });

      const shareData = buildShareData(1234567890);

      assert.deepEqual(Object.keys(shareData), [
        'timestamp', 'medication', 'lab', 'labdraw', 'chinesemed', 'imaging',
        'allergy', 'surgery', 'discharge', 'medDays', 'patientSummary',
        'masterMenu', 'adultHealthCheck', 'cancerScreening', 'hbcvdata',
        'chronicMed',
      ]);
      assert.equal(shareData.timestamp, 1234567890);
      assert.strictEqual(shareData.medication, med);
      assert.deepEqual(shareData.lab, { rObject: [{ lab: 'x' }] });
      assert.deepEqual(shareData.patientSummary, { rObject: [{ s: 1 }] });
    });

    it('未載入的型別輸出 null(維持舊語意,消費端可辨識「無資料」)', function () {
      const shareData = buildShareData(42);
      assert.isNull(shareData.imaging);
      assert.isNull(shareData.masterMenu);
      // JSON 序列化後 null key 保留
      const parsed = JSON.parse(JSON.stringify(shareData));
      assert.property(parsed, 'imaging');
      assert.isNull(parsed.imaging);
    });

    it('不含舊格式殘留的 rehabilitation/acupuncture/specialChineseMedCare/patientsummary(小寫)', function () {
      const shareData = buildShareData(42);
      assert.notProperty(shareData, 'rehabilitation');
      assert.notProperty(shareData, 'acupuncture');
      assert.notProperty(shareData, 'specialChineseMedCare');
      assert.notProperty(shareData, 'patientsummary');
    });

    it('未給 timestamp 時使用當下時間', function () {
      const before = Date.now();
      const shareData = buildShareData();
      assert.isAtLeast(shareData.timestamp, before);
      assert.isAtMost(shareData.timestamp, Date.now());
    });
  });

  describe('.writeShareDataToLocalStorage', function () {
    it('寫入 NHITW_DATA key 並 dispatch storage 事件', function () {
      const storageListener = vi.fn();
      window.addEventListener('storage', storageListener);

      writeShareDataToLocalStorage({ timestamp: 1, medication: null });

      const stored = JSON.parse(localStorage.getItem('NHITW_DATA'));
      assert.deepEqual(stored, { timestamp: 1, medication: null });
      assert.equal(storageListener.mock.calls.length, 1);

      window.removeEventListener('storage', storageListener);
    });

    it('localStorage 寫入失敗時不拋錯(console.error 後靜默)', function () {
      const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        throw new Error('QuotaExceeded');
      });
      const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      assert.doesNotThrow(() => writeShareDataToLocalStorage({ timestamp: 1 }));
      assert.equal(errSpy.mock.calls.length, 1);
      spy.mockRestore();
      errSpy.mockRestore();
    });
  });
});
```

- [x] **Step 2: 執行確認失敗**

Run: `npx vitest run tests/nhitwExport.test.js`
Expected: FAIL(模組不存在)

- [x] **Step 3: 實作 `src/store/nhitwExport.js`**

```js
// nhitwExport.js
// NHITW_DATA localStorage 匯出:供同頁面的其他 chrome extension 交換資料使用。
// ⚠️ 這是對外契約。2026-07-02 起兩條寫入路徑(主動抓取/本地匯入)統一為此單一格式;
//    變更 key 名稱或語意前,必須同步調整所有消費端 extension。
// 格式:timestamp 最前;labdata 對外改名 lab;patientSummary 駝峰;
//      未載入的型別輸出 null。
import { dataStore } from './dataStore';

export const buildShareData = (timestamp = Date.now()) => {
  return {
    timestamp,
    medication: dataStore.getData('medication'),
    lab: dataStore.getData('labdata'),
    labdraw: dataStore.getData('labdraw'),
    chinesemed: dataStore.getData('chinesemed'),
    imaging: dataStore.getData('imaging'),
    allergy: dataStore.getData('allergy'),
    surgery: dataStore.getData('surgery'),
    discharge: dataStore.getData('discharge'),
    medDays: dataStore.getData('medDays'),
    patientSummary: dataStore.getData('patientsummary'),
    masterMenu: dataStore.getData('masterMenu'),
    adultHealthCheck: dataStore.getData('adultHealthCheck'),
    cancerScreening: dataStore.getData('cancerScreening'),
    hbcvdata: dataStore.getData('hbcvdata'),
    chronicMed: dataStore.getData('chronicMed'),
  };
};

/**
 * 寫入 localStorage 並發出 storage 事件通知其他 extension。
 * 失敗時 console.error 後靜默(對齊原行為,不可讓分享失敗中斷主流程)。
 */
export const writeShareDataToLocalStorage = (shareData) => {
  try {
    localStorage.setItem('NHITW_DATA', JSON.stringify(shareData));
    window.dispatchEvent(new Event('storage'));
  } catch (error) {
    console.error('保存資料到 localStorage 時出錯:', error);
  }
};
```

- [x] **Step 4: 執行確認通過**

Run: `npx vitest run tests/nhitwExport.test.js`
Expected: 6 tests passed

- [x] **Step 5: 全量驗證與 Commit**

Run: `npx vitest run`、`npx eslint src/store tests/nhitwExport.test.js`

```bash
git add src/store/nhitwExport.js tests/nhitwExport.test.js
git commit -m "新增 nhitwExport:NHITW_DATA 跨 extension 分享統一格式模組"
```

---

### Task 3: legacyContent 寫入端遷移(雙寫過渡)

**Files:**
- Modify: `src/legacyContent.js`

寫入端改為「先寫 store,再寫 window(相容)」;讀取端(本檔案內部)直接改讀 store;`saveToLocalStorage` 改用匯出模組。**window 全域宣告(行 17-33)與雙寫在 Task 6 才移除。**

- [x] **Step 1: 加 import**

```js
import { dataStore } from './store/dataStore';
import { buildShareData, writeShareDataToLocalStorage } from './store/nhitwExport';
```

- [x] **Step 2: 建立雙寫 helper 並改寫四個寫入點**

在 `DATA_VAR_MAP` 定義之後加:

```js
// 過渡期雙寫:store 為真實來源,window 供尚未遷移的讀取端使用(Task 6 移除)
function setDataCompat(dataType, data) {
  dataStore.setData(dataType, data);
  const varName = DATA_VAR_MAP.get(dataType);
  if (varName) {
    window[varName] = data;
  }
}
```

(a) `fetchSingleDataType` 內(行 367-370):

```js
      const varName = DATA_VAR_MAP.get(dataType);
      if (varName) {
        window[varName] = normalizedData;
      }
```

改為:

```js
      setDataCompat(dataType, normalizedData);
```

(b) `createEmptyDataResult`(行 414-421):

```js
function createEmptyDataResult(dataType) {
  const emptyData = { rObject: [] };
  setDataCompat(dataType, emptyData);
  return { status: "nodata", recordCount: 0, dataType, data: emptyData };
}
```

(c) `clearAllData`(行 405-412):

```js
function clearAllData() {
  dataStore.clearAll();
  for (const varName of DATA_VAR_MAP.values()) {
    window[varName] = null;
  }
  window.lastInterceptedMasterMenuData = null;

  chrome.runtime.sendMessage({ action: 'setBadge', text: '' });
}
```

(d) masterMenu 說明:`window.lastInterceptedMasterMenuData` 在 legacyContent 中**從未被賦真值**(只有行 29 初始化 null 與 clearAllData 清除;grep 全檔可證)——它是殘留欄位,store 的 `masterMenu` 型別保留只為維持統一匯出格式(輸出 `"masterMenu":null`)。不需新增賦值程式碼。

- [x] **Step 3: `saveToLocalStorage` 改用匯出模組**

```js
function saveToLocalStorage() {
  writeShareDataToLocalStorage(buildShareData());
}
```

(原本的 try/catch 已由 `writeShareDataToLocalStorage` 內部處理。)

- [x] **Step 4: 本檔案內的讀取端改讀 store**

(a) `observeUrlChanges`(行 219):

```js
        } else if (!window.lastInterceptedMedicationData?.rObject) {
```

改為:

```js
        } else if (!dataStore.getData('medication')?.rObject) {
```

(b) `getPatientData` 訊息處理(行 502-506):

```js
        for (const [dataType, varName] of DATA_VAR_MAP.entries()) {
          const key = dataType === 'labdata' ? 'lab' : dataType;
          patientData[key] = window[varName];
        }
        patientData.masterMenu = window.lastInterceptedMasterMenuData;
```

改為:

```js
        for (const dataType of DATA_VAR_MAP.keys()) {
          const key = dataType === 'labdata' ? 'lab' : dataType;
          patientData[key] = dataStore.getData(dataType);
        }
        patientData.masterMenu = dataStore.getData('masterMenu');
```

- [x] **Step 5: 驗證**

Run: `npx vitest run`(全綠)、`npm run build`(綠)、`npx eslint src/legacyContent.js`(不新增錯誤)
另外檢查:`grep -n "window\[varName\]\|lastIntercepted" src/legacyContent.js` — 行 17-33 宣告與 `setDataCompat`/`clearAllData` 內的相容寫入仍在(預期),`fetchSingleDataType`/`getPatientData`/`observeUrlChanges` 已無直接 window 讀寫。

- [x] **Step 6: Commit**

```bash
git add src/legacyContent.js
git commit -m "legacyContent 遷移:寫入走 dataStore(雙寫過渡),NHITW_DATA 改用匯出模組"
```

---

### Task 4: localDataHandler 寫入端遷移(雙寫過渡)

**Files:**
- Modify: `src/localDataHandler.js`

- [x] **Step 1: 加 import 與雙寫 helper**

```js
import { dataStore } from './store/dataStore';
import { buildShareData, writeShareDataToLocalStorage } from './store/nhitwExport';
```

localDataHandler 的 JSON key 與 store 型別對照(注意兩處大小寫差異):

```js
// 本地 JSON 的 key → store 型別(lab→labdata、patientSummary→patientsummary)
const LOCAL_KEY_TO_STORE_TYPE = new Map([
  ['medication', 'medication'],
  ['lab', 'labdata'],
  ['chinesemed', 'chinesemed'],
  ['imaging', 'imaging'],
  ['allergy', 'allergy'],
  ['surgery', 'surgery'],
  ['discharge', 'discharge'],
  ['medDays', 'medDays'],
  ['patientSummary', 'patientsummary'],
  ['adultHealthCheck', 'adultHealthCheck'],
  ['cancerScreening', 'cancerScreening'],
  ['hbcvdata', 'hbcvdata'],
  ['chronicMed', 'chronicMed'],
]);

const WINDOW_VAR_BY_STORE_TYPE = new Map([
  ['medication', 'lastInterceptedMedicationData'],
  ['labdata', 'lastInterceptedLabData'],
  ['chinesemed', 'lastInterceptedChineseMedData'],
  ['imaging', 'lastInterceptedImagingData'],
  ['allergy', 'lastInterceptedAllergyData'],
  ['surgery', 'lastInterceptedSurgeryData'],
  ['discharge', 'lastInterceptedDischargeData'],
  ['medDays', 'lastInterceptedMedDaysData'],
  ['patientsummary', 'lastInterceptedPatientSummaryData'],
  ['adultHealthCheck', 'lastInterceptedAdultHealthCheckData'],
  ['cancerScreening', 'lastInterceptedCancerScreeningData'],
  ['hbcvdata', 'lastInterceptedHbcvdata'],
  ['chronicMed', 'lastInterceptedChronicMedData'],
]);

// 過渡期雙寫(Task 6 移除 window 部分)
function setLocalDataCompat(storeType, data) {
  dataStore.setData(storeType, data);
  const varName = WINDOW_VAR_BY_STORE_TYPE.get(storeType);
  if (varName) {
    window[varName] = data;
  }
}
```

- [x] **Step 2: 改寫主要匯入路徑的 13 個 handler(行 134-200)**

`dataTypeHandlers` Map 整段改為資料驅動(消除 13 段複製貼上,行為不變):

```js
    // 依 LOCAL_KEY_TO_STORE_TYPE 逐一處理 JSON 內存在的資料型別
    for (const [jsonKey, storeType] of LOCAL_KEY_TO_STORE_TYPE.entries()) {
      if (jsonData[jsonKey]) {
        setLocalDataCompat(storeType, cleanData(JSON.parse(JSON.stringify(jsonData[jsonKey]))));
        loadedTypes.push(jsonKey === 'lab' ? 'labData' : jsonKey);
        triggerDataFetchCompleted(jsonKey);
      }
    }
```

注意:原程式 `loadedTypes.push` 的字串有兩個特例——`lab` push `'labData'`、`chinesemed` push `'chineseMed'`。先讀原始碼逐一核對 13 個 push 字串,若與上式不符,改用對照表:

```js
    const LOADED_TYPE_LABEL = new Map([['lab', 'labData'], ['chinesemed', 'chineseMed']]);
    // push 時:loadedTypes.push(LOADED_TYPE_LABEL.get(jsonKey) ?? jsonKey);
```

- [x] **Step 3: NHITW_DATA 寫入區塊(行 233-262)改用匯出模組**

原本手寫的 `dataToShare` 物件 + `localStorage.setItem` + `dispatchEvent` 整段改為:

```js
      // 保存到 localStorage 供其他擴充功能交換資料,並發出 storage 事件
      writeShareDataToLocalStorage(buildShareData());
```

(統一格式的 key 順序與 null 語意已由 nhitwExport 測試鎖定。)

- [x] **Step 4: 次要路徑 `processLocalData`(行 410-445)的兩個 window 寫入改雙寫**

`window.lastInterceptedMedicationData = data;` → `setLocalDataCompat('medication', data);`
`window.lastInterceptedLabData = data;` → `setLocalDataCompat('labdata', data);`
(medication handler 內讀 `window.lastInterceptedChronicMedData` 的參數改為 `dataStore.getData('chronicMed')`。`window.lastProcessedMedicationData` 保留不動——不在本計畫範圍。)

- [x] **Step 5: 清除路徑**

讀 `clearLocalData`(行 300-330 附近):若有將 `window.lastIntercepted*` 設 null 的迴圈,改為 `dataStore.clearAll()` + 保留 window 清除(雙寫語意)。若沒有(只清 localDataStatus),不動。

- [x] **Step 6: 驗證與 Commit**

Run: `npx vitest run`、`npm run build`、`npx eslint src/localDataHandler.js`(不新增錯誤)
人工核對:`git diff` 中 13 個 handler 的行為(cleanData 深拷貝、loadedTypes 字串、triggerDataFetchCompleted 參數)與原版逐一相符。

```bash
git add src/localDataHandler.js
git commit -m "localDataHandler 遷移:寫入走 dataStore(雙寫過渡),分享格式改用 nhitwExport"
```

---

### Task 5: 讀取端遷移(dataManager、settingsManager、FloatingIcon)

**Files:**
- Modify: `src/utils/dataManager.js`
- Modify: `src/utils/settingsManager.js`
- Modify: `src/components/FloatingIcon.jsx`
- Test: `tests/dataManager.test.js`(新增 collectDataSources 測試)

- [x] **Step 1: 先寫 `collectDataSources` 的失敗測試 `tests/dataManager.test.js`**

```js
import { describe, it, assert, beforeEach } from 'vitest';

import { dataStore } from '../src/store/dataStore.js';
import { collectDataSources } from '../src/utils/dataManager.js';

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
});
```

Run: `npx vitest run tests/dataManager.test.js`
Expected: FAIL(collectDataSources 目前讀 window,回傳 undefined 而非 store 值)
(注意:dataManager import 多個 processor,在 vitest/jsdom 下可正常載入——processor 測試已證明。若 import 鏈出錯,如實回報。)

- [x] **Step 2: 改寫 `dataManager.collectDataSources`(行 219-239)**

```js
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
```

檔案頂部加 `import { dataStore } from "../store/dataStore";`,並刪除函數內原有的 debugLog 行(若有)或保留改讀新值。
同檔 `reprocessData` 內 `window.lastInterceptedChronicMedData`(行 256)→ `dataStore.getData('chronicMed')`。

- [x] **Step 3: 執行確認測試通過**

Run: `npx vitest run tests/dataManager.test.js`
Expected: 1 test passed

- [x] **Step 4: `settingsManager.js` 的 8 處讀取改 store**

檔案頂部加 `import { dataStore } from "../store/dataStore";`,然後全檔置換(行 248-249、287-288、316-317、356-357、378-379、405-406、423-425):

- `window.lastInterceptedChineseMedData` → `dataStore.getData('chinesemed')`(共 2 處,含 if 條件與參數)
- `window.lastInterceptedLabData` → `dataStore.getData('labdata')`(共 8 處)
- `window.lastInterceptedMedicationData` → `dataStore.getData('medication')`(共 4 處)

同一分支內 if 條件與呼叫參數讀兩次的,抽成 local const 避免重複呼叫:

```js
    const labData = dataStore.getData('labdata');
    if (labData && callbacks.reprocessLab) {
      callbacks.reprocessLab(labData, newLabSettings);
    }
```

- [x] **Step 5: `FloatingIcon.jsx` 的 3 處讀取改 store(行 204-227 settings listener 內)**

加 `import { dataStore } from "../store/dataStore";`,然後:

```jsx
      if (window.lastInterceptedLabData) {
        reprocessData("lab", window.lastInterceptedLabData, newSettings.lab, setGroupedLabs);
      }
```

改為(三種資料同模式):

```jsx
      const labData = dataStore.getData('labdata');
      if (labData) {
        reprocessData("lab", labData, newSettings.lab, setGroupedLabs);
      }
```

(`window.lastInterceptedMedicationData?.rObject` → `dataStore.getData('medication')?.rObject`;chinesemed 同理。`window._localUserInfo` 不動。)

- [x] **Step 6: 驗證與 Commit**

Run: `npx vitest run`(全綠,含新 dataManager 測試)、`npm run build`、`npx eslint src/utils/dataManager.js src/utils/settingsManager.js src/components/FloatingIcon.jsx`(不新增錯誤)
檢查:`grep -rn "window.lastIntercepted" src/utils src/components` → 應無任何結果。

```bash
git add src/utils/dataManager.js src/utils/settingsManager.js src/components/FloatingIcon.jsx tests/dataManager.test.js
git commit -m "讀取端遷移:dataManager/settingsManager/FloatingIcon 改讀 dataStore"
```

---

### Task 6: 移除 window 全域與雙寫

**Files:**
- Modify: `src/legacyContent.js`
- Modify: `src/localDataHandler.js`

前提:Task 3-5 已完成,repo 內已無任何 `window.lastIntercepted*` 讀取端。

- [x] **Step 1: 確認無讀取端**

Run: `grep -rn "window.lastIntercepted\|window\.\?\[varName\]" src --include="*.js" --include="*.jsx"`
Expected: 只剩 legacyContent.js(行 17-33 宣告、setDataCompat、clearAllData、masterMenu 賦值)與 localDataHandler.js(setLocalDataCompat)的**寫入**;無任何讀取。若發現讀取,回頭補遷移,不可直接刪。

- [x] **Step 2: legacyContent 移除**

- 刪除行 17-33 的 15 個 `window.lastIntercepted* = null` 宣告(含 MasterMenu)。
- `setDataCompat` 簡化為直接呼叫(或整個移除 helper,呼叫點改 `dataStore.setData(dataType, data)`)。
- `clearAllData` 移除 window 迴圈與 masterMenu 行,只留 `dataStore.clearAll()` + badge 訊息。

- [x] **Step 3: localDataHandler 移除**

- `setLocalDataCompat` 簡化為 `dataStore.setData`(或移除 helper),刪除 `WINDOW_VAR_BY_STORE_TYPE`。

- [x] **Step 4: 最終驗證**

Run: `grep -rn "lastIntercepted" src --include="*.js" --include="*.jsx"`
Expected: **零結果**(文件 .md 不算)。

Run: `npx vitest run`、`npm run build`、`npx eslint src`(不新增錯誤;`no-undef` 不得出現新項目)

- [x] **Step 5: Commit**

```bash
git add src/legacyContent.js src/localDataHandler.js
git commit -m "移除 window.lastIntercepted* 全域變數:dataStore 成為唯一資料來源"
```

---

### Task 7: 文件更新與煙霧測試清單

**Files:**
- Modify: `CLAUDE.md`(磁碟檔,gitignored——編輯後不會進 commit,屬預期)
- Modify: `docs/superpowers/specs/2026-07-02-architecture-analysis.md`
- Modify: `docs/superpowers/plans/2026-07-02-refactor-phase3-datastore.md`(勾選進度)

- [x] **Step 1: CLAUDE.md 資料流段落改寫(順便修正已過時的攔截架構描述)**

先讀 CLAUDE.md 的「Three entry points」與「Data flow」段落,將其中「webRequest 攔截、chrome.storage.local 儲存」的過時描述改為現況:

- `background.js` 段落改為:「MV3 service worker,僅處理 badge 顯示與 openPopup 訊息(30 行)。資料抓取不經過 background。」
- 「Data flow」段落改為:「`legacyContent.js` 主動呼叫 NHI API(`API_PATH_MAP` 14 種)→ 寫入 `src/store/dataStore.js`(單一真實來源)→ dispatch `dataFetchCompleted` → FloatingIcon 的 `handleData` 經 `dataManager.collectDataSources()` 從 dataStore 讀取 → 各 processor → React state。每次抓取完成後 `nhitwExport` 將原始資料寫入 page localStorage 的 `NHITW_DATA` key 供其他 extension 交換(對外契約,格式不可變)。」
- 新增一句:「新增資料型別時:`dataStore.DATA_TYPES`、`legacyContent` 的 `API_PATH_MAP`/`DATA_VAR_MAP`、`dataManager` 的 sources 與 processor 註冊,以及(若要對外分享)`nhitwExport` 的兩個 builder。」

- [x] **Step 2: 規格文件狀態更新**

`> 狀態:` 行改為 `分析完成;階段 1、2、3 已實作(階段 3 見 plans/2026-07-02-refactor-phase3-datastore.md)`。

- [ ] **Step 3: 手動煙霧測試(需人工,列清單後保持未勾)**

`npm run test:manual` → Chrome 載入 `dist/` → `http://localhost:5173/`:
1. **NHITW_DATA 對外契約(最重要)**:上傳 `tests/test_data/Fake_Data_250402.json` 後,DevTools console 執行 `JSON.parse(localStorage.getItem('NHITW_DATA'))` — 確認為統一格式(`timestamp` 最前、`patientSummary` 駝峰、含 `labdraw`/`masterMenu`、未載入型別為 null),已載入的資料非空。
2. **消費端 extension 適配與實測**:下游 extension 若原本讀 `patientsummary`(小寫),改讀 `patientSummary` 後確認能讀到資料(這是唯一能驗證「其他 extension 正常」的方式)。
3. 各 tab(西藥/中藥/檢驗/影像/餘藥/Overview)資料正常顯示(collectDataSources 遷移驗證)。
4. popup 調整檢驗顯示格式設定,檢驗 tab 即時重新處理(settingsManager 讀 store 的 reprocess 路徑)。
5. 真實環境(medcloud2)驗證:病患切換後資料清空並重抓、`NHITW_DATA` 更新且格式同上(兩條路徑現在輸出一致)。

- [x] **Step 4: Commit**

```bash
git add docs
git commit -m "文件更新:階段 3 dataStore 資料流說明與階段 4 清理目標"
```

---

## 驗收清單(對照規格與使用者需求)

- [x] `window.lastIntercepted*` 全域變數完全移除(`grep -rn "lastIntercepted" src` 零結果)
- [x] `NHITW_DATA` localStorage 交換功能保留,兩條寫入路徑統一為單一格式(單元測試鎖定 key 順序與 null 語意 + 煙霧測試實測;下游 extension 同步適配 `patientSummary` 鍵名)
- [x] `storage` 事件通知其他 extension 的行為保留
- [x] dataStore 有完整單元測試(set/get/clear/subscribe/錯誤隔離)
- [x] 既有 125+ 測試全綠、build 成功、ESLint 不新增錯誤
- [x] CLAUDE.md 資料流描述修正為現況(移除過時的 webRequest 攔截敘述)
- [ ] 手動煙霧測試通過(含消費端 extension 實測)

`npx vitest run` 與 `npm run build` 已於 Task 1-6 各自完成後驗證通過;僅剩上列手動煙霧測試待人工執行。
