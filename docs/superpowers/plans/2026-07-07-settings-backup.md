# 設定備份(匯出/匯入)Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 讓使用者把 settingsSchema 的 52 個 `chrome.storage.sync` 設定匯出成 JSON 檔,並以「全量還原」語意從檔案匯入。

**Architecture:** 純函數層 `src/utils/settingsBackup.js`(信封組裝 + schema 白名單驗證,vitest 可測)+ UI 區塊 `src/components/settings/SettingsBackup.jsx`(掛在 popup 設定 tab 尾端)。零改既有設定邏輯;匯入寫回用一次 `chrome.storage.sync.set` 全量覆蓋。

**Tech Stack:** Vanilla JS(ES modules)、React + MUI(popup)、Vitest。無新依賴。

**Spec:** `docs/superpowers/specs/2026-07-07-settings-backup-design.md`(格式契約、相容策略、決策依據)

## Global Constraints

- 匯出檔信封:`{ format: 'nhitw-settings', version: 1, exportedAt, settings }`;`settings` 為 **SETTINGS_SCHEMA 的扁平 storageKey**(含 `enableATC5Colors` 等歷史改名鍵原樣)。
- **向後相容契約:加鍵不 bump version**。未知鍵忽略 + warning;缺鍵回預設;`version > 1` 才拒絕(提示更新擴充功能)。
- **全量還原語意**:匯入結果 = `buildStorageDefaults()` 疊上檔內通過驗證的鍵,恆為完整 52 鍵,與當下 storage 狀態無關。
- `developerMode` / `devFetchAll`(`chrome.storage.local`)一律不進匯出檔、匯入不觸碰 `storage.local`。
- 信封錯誤(JSON 壞檔 / format 不符 / version 過新)→ **一個鍵都不寫入**。
- UI 對齊既有慣例:設定區塊 = MUI `Accordion`(icon + 標題),繁體中文文案。
- 檔名:`NHITW_settings_YYYYMMDD_HHMM.json`。
- 每個 commit 前 `npm test` 全綠(現有基準 291);commit 訊息用 repo 慣例前綴(`功能:`/`測試:`/`文件:`)。
- 已知修正:popup 各設定區塊只在 mount 時讀 storage、無 `onChanged` 監聽——匯入成功訊息須提示「重新開啟本視窗」;頁面端由 `settingsManager` 的既有 `storage.onChanged` 自動刷新,不加新機制。

---

## 檔案結構

| 檔案 | 動作 | 職責 |
|---|---|---|
| `src/utils/settingsBackup.js` | 新增 | 純函數:`buildSettingsExport` / `parseSettingsImport` + 格式常數 |
| `tests/settingsBackup.test.js` | 新增 | 純函數層完整測試(信封、round-trip、相容、型別驗證) |
| `src/components/settings/SettingsBackup.jsx` | 新增 | 「設定備份」Accordion:匯出鈕、匯入鈕、確認 dialog、狀態 Alert |
| `src/components/PopupSettings.jsx` | 修改(~L92) | 設定 tab 尾端掛 `<SettingsBackup />` |
| `DOC/Settings.md` | 修改 | 新增「設定備份(匯出/匯入)」章節 |
| `docs/superpowers/specs/2026-07-07-settings-backup-design.md` | 修改 | 資料流段落修正(popup 不自動刷新) |

---

### Task 1: 純函數層 `settingsBackup.js`(TDD)

**Files:**
- Test: `tests/settingsBackup.test.js`
- Create: `src/utils/settingsBackup.js`

**Interfaces:**
- Consumes: `SETTINGS_SCHEMA`、`buildStorageDefaults`(`src/config/settingsSchema.js`,既有);`EXPECTED_STORAGE_KEYS`(`tests/fixtures/storageKeys.js`,既有,已 `.sort()`)。
- Produces(Task 2 依賴,名稱與簽名固定):
  - `SETTINGS_EXPORT_FORMAT: 'nhitw-settings'`、`SETTINGS_EXPORT_VERSION: 1`
  - `buildSettingsExport(flatSettings: object, exportedAt: string) => { format, version, exportedAt, settings }`
  - `parseSettingsImport(json: unknown) => { ok: true, settings: object, warnings: string[] } | { ok: false, error: string }`

- [ ] **Step 1: 寫失敗測試**

```js
// tests/settingsBackup.test.js
import { describe, it, assert } from 'vitest';

import { SETTINGS_SCHEMA, buildStorageDefaults } from '../src/config/settingsSchema.js';
import { EXPECTED_STORAGE_KEYS } from './fixtures/storageKeys.js';
import {
  SETTINGS_EXPORT_FORMAT,
  SETTINGS_EXPORT_VERSION,
  buildSettingsExport,
  parseSettingsImport,
} from '../src/utils/settingsBackup.js';

describe('utils/settingsBackup', function () {
  const FIXED_TIME = '2026-07-07T06:30:00.000Z';
  const defaultOf = (storageKey) =>
    SETTINGS_SCHEMA.find((e) => e.storageKey === storageKey).defaultValue;

  describe('.buildSettingsExport', function () {
    it('信封欄位齊全,settings 恰為 schema 全部 storageKey(52 鍵快照)', function () {
      const exp = buildSettingsExport(buildStorageDefaults(), FIXED_TIME);
      assert.strictEqual(exp.format, SETTINGS_EXPORT_FORMAT);
      assert.strictEqual(exp.version, SETTINGS_EXPORT_VERSION);
      assert.strictEqual(exp.exportedAt, FIXED_TIME);
      assert.deepEqual(Object.keys(exp.settings).sort(), EXPECTED_STORAGE_KEYS);
    });

    it('取用傳入值;缺鍵以預設補齊;白名單外的輸入鍵不外洩', function () {
      const exp = buildSettingsExport({ simplifyMedicineName: false, notASetting: 'x' }, FIXED_TIME);
      assert.strictEqual(exp.settings.simplifyMedicineName, false);
      assert.notProperty(exp.settings, 'notASetting');
      assert.strictEqual(exp.settings.enableATC5Colors, defaultOf('enableATC5Colors'));
    });

    it('歷史改名鍵以 storage 鍵名原樣出現', function () {
      const exp = buildSettingsExport(buildStorageDefaults(), FIXED_TIME);
      assert.property(exp.settings, 'enableATC5Colors');
      assert.property(exp.settings, 'atc5Groups');
      assert.property(exp.settings, 'chineseMedCopyFormat');
      assert.notProperty(exp.settings, 'atc5.enableColors');
    });
  });

  describe('.parseSettingsImport — 信封驗證(拒絕時一個鍵都不回)', function () {
    it('非物件 / 陣列 / format 不符 / 缺 settings → 拒絕', function () {
      assert.isFalse(parseSettingsImport(null).ok);
      assert.isFalse(parseSettingsImport([1]).ok);
      assert.isFalse(parseSettingsImport({ format: 'other', version: 1, settings: {} }).ok);
      assert.isFalse(parseSettingsImport({ format: SETTINGS_EXPORT_FORMAT, version: 1 }).ok);
    });

    it('version 過新 → 拒絕並提示更新;version 非正整數 → 拒絕', function () {
      const r = parseSettingsImport({ format: SETTINGS_EXPORT_FORMAT, version: 2, settings: {} });
      assert.isFalse(r.ok);
      assert.match(r.error, /更新/);
      assert.isFalse(parseSettingsImport({ format: SETTINGS_EXPORT_FORMAT, version: 0, settings: {} }).ok);
      assert.isFalse(parseSettingsImport({ format: SETTINGS_EXPORT_FORMAT, version: '1', settings: {} }).ok);
    });
  });

  describe('.parseSettingsImport — 全量還原語意', function () {
    it('export → import round-trip 恆等(warnings 為空)', function () {
      const flat = { ...buildStorageDefaults(), simplifyMedicineName: false, medicationTrackingDays: 180 };
      const r = parseSettingsImport(buildSettingsExport(flat, FIXED_TIME));
      assert.isTrue(r.ok);
      assert.deepEqual(r.settings, flat);
      assert.lengthOf(r.warnings, 0);
    });

    it('檔內只有部分鍵 → 其餘鍵重設為預設(輸出恆為完整 52 鍵)', function () {
      const r = parseSettingsImport({
        format: SETTINGS_EXPORT_FORMAT, version: 1,
        settings: { simplifyMedicineName: false },
      });
      assert.isTrue(r.ok);
      assert.deepEqual(Object.keys(r.settings).sort(), EXPECTED_STORAGE_KEYS);
      assert.strictEqual(r.settings.simplifyMedicineName, false);
      assert.deepEqual(r.settings.atc5Groups, defaultOf('atc5Groups'));
    });

    it('未知鍵忽略 + warning(向後相容:較新版本的匯出檔可匯入)', function () {
      const r = parseSettingsImport({
        format: SETTINGS_EXPORT_FORMAT, version: 1,
        settings: { simplifyMedicineName: false, futureOverviewCheckItems: ['x'] },
      });
      assert.isTrue(r.ok);
      assert.notProperty(r.settings, 'futureOverviewCheckItems');
      assert.strictEqual(r.settings.simplifyMedicineName, false);
      assert.lengthOf(r.warnings, 1);
      assert.match(r.warnings[0], /未知設定/);
    });

    it('型別不符 → 該鍵回預設 + warning;陣列鍵用 Array.isArray 判斷', function () {
      const r = parseSettingsImport({
        format: SETTINGS_EXPORT_FORMAT, version: 1,
        settings: { simplifyMedicineName: 'yes', focusedLabTests: 'not-an-array' },
      });
      assert.isTrue(r.ok);
      assert.strictEqual(r.settings.simplifyMedicineName, defaultOf('simplifyMedicineName'));
      assert.deepEqual(r.settings.focusedLabTests, defaultOf('focusedLabTests'));
      assert.lengthOf(r.warnings, 1);
      assert.match(r.warnings[0], /型別不符/);
    });
  });
});
```

- [ ] **Step 2: 跑測試確認失敗**

Run: `npx vitest run tests/settingsBackup.test.js`
Expected: FAIL(`Cannot find module '../src/utils/settingsBackup.js'` 之類的模組不存在錯誤)。

- [ ] **Step 3: 實作**

```js
// src/utils/settingsBackup.js
// 設定備份(匯出/匯入)純函數層。不碰 chrome API,方便單元測試。
// 格式契約與相容策略見 docs/superpowers/specs/2026-07-07-settings-backup-design.md:
// 「加鍵不 bump version」——新增設定鍵靠 SETTINGS_SCHEMA 白名單天然相容
// (舊檔缺鍵回預設、新檔未知鍵忽略);version 只在信封結構破壞性改變時才升。
import { SETTINGS_SCHEMA, buildStorageDefaults } from '../config/settingsSchema';

export const SETTINGS_EXPORT_FORMAT = 'nhitw-settings';
export const SETTINGS_EXPORT_VERSION = 1;

// 匯出物件:settings 為 SETTINGS_SCHEMA 白名單的扁平 storageKey(缺值補預設)。
export const buildSettingsExport = (flatSettings, exportedAt) => ({
  format: SETTINGS_EXPORT_FORMAT,
  version: SETTINGS_EXPORT_VERSION,
  exportedAt,
  settings: Object.fromEntries(
    SETTINGS_SCHEMA.map((e) => [e.storageKey, flatSettings[e.storageKey] ?? e.defaultValue])
  ),
});

// 陣列型預設值用 Array.isArray 判斷(typeof 陣列是 'object',擋不住字串以外的錯型別)
const matchesType = (value, defaultValue) =>
  Array.isArray(defaultValue) ? Array.isArray(value) : typeof value === typeof defaultValue;

// 全量還原:從 buildStorageDefaults() 出發,檔內通過驗證的鍵覆蓋,回傳完整 52 鍵。
// 未知鍵(可能來自較新版本)與型別不符鍵忽略,記入 warnings、不阻擋匯入。
export const parseSettingsImport = (json) => {
  if (!json || typeof json !== 'object' || Array.isArray(json)) {
    return { ok: false, error: '不是有效的設定檔(內容不是物件)' };
  }
  if (json.format !== SETTINGS_EXPORT_FORMAT) {
    return { ok: false, error: '不是本擴充功能的設定檔(format 標記不符)' };
  }
  if (!Number.isInteger(json.version) || json.version < 1) {
    return { ok: false, error: '設定檔的 version 欄位無效' };
  }
  if (json.version > SETTINGS_EXPORT_VERSION) {
    return { ok: false, error: '設定檔來自較新版本的擴充功能,請先更新擴充功能後再匯入' };
  }
  if (!json.settings || typeof json.settings !== 'object' || Array.isArray(json.settings)) {
    return { ok: false, error: '設定檔缺少 settings 內容' };
  }

  const byStorageKey = new Map(SETTINGS_SCHEMA.map((e) => [e.storageKey, e]));
  const settings = buildStorageDefaults();
  const warnings = [];
  let unknownCount = 0;
  const mismatched = [];
  for (const [key, value] of Object.entries(json.settings)) {
    const entry = byStorageKey.get(key);
    if (!entry) {
      unknownCount += 1;
      continue;
    }
    if (!matchesType(value, entry.defaultValue)) {
      mismatched.push(key);
      continue;
    }
    settings[key] = value;
  }
  if (unknownCount > 0) {
    warnings.push(`忽略 ${unknownCount} 個未知設定(可能來自較新版本)`);
  }
  if (mismatched.length > 0) {
    warnings.push(`${mismatched.length} 個設定型別不符,已改用預設值:${mismatched.join('、')}`);
  }
  return { ok: true, settings, warnings };
};
```

- [ ] **Step 4: 跑測試確認通過**

Run: `npx vitest run tests/settingsBackup.test.js`
Expected: PASS(9 測項)。
Run: `npm test` → Expected: 300 passed(291 + 9),零失敗。

- [ ] **Step 5: Commit**

```bash
git add tests/settingsBackup.test.js src/utils/settingsBackup.js
git commit -m "功能:設定備份純函數層(schema 白名單匯出/全量還原匯入,加鍵不 bump version)"
```

---

### Task 2: UI 區塊 `SettingsBackup.jsx` + 掛載

**Files:**
- Create: `src/components/settings/SettingsBackup.jsx`
- Modify: `src/components/PopupSettings.jsx`(import 區 + `tabContentMap` 設定 tab,`<AdvancedSettings />` 之後,約 L92)

**Interfaces:**
- Consumes: Task 1 的 `buildSettingsExport` / `parseSettingsImport`;`buildStorageDefaults`(settingsSchema)。
- Produces: default export `SettingsBackup`(無 props)。

- [ ] **Step 1: 建立元件**

```jsx
// src/components/settings/SettingsBackup.jsx
// 設定備份:匯出全部設定為 JSON 檔 / 從檔案全量還原。
// 純邏輯在 utils/settingsBackup.js(可單測);本元件只負責 chrome.storage 讀寫、
// 檔案下載/選擇與確認流程。格式契約見 specs/2026-07-07-settings-backup-design.md。
import { useRef, useState } from "react";
import {
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Typography,
  Button,
  Box,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import SettingsBackupRestoreIcon from "@mui/icons-material/SettingsBackupRestore";
import FileDownloadIcon from "@mui/icons-material/FileDownload";
import FileUploadIcon from "@mui/icons-material/FileUpload";
import { buildStorageDefaults } from "../../config/settingsSchema";
import { buildSettingsExport, parseSettingsImport } from "../../utils/settingsBackup";

const buildExportFileName = (date = new Date()) => {
  const pad = (n) => String(n).padStart(2, "0");
  return `NHITW_settings_${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}_${pad(date.getHours())}${pad(date.getMinutes())}.json`;
};

const SettingsBackup = () => {
  const fileInputRef = useRef(null);
  // { severity: 'success' | 'warning' | 'error', text: string } | null
  const [status, setStatus] = useState(null);
  // parseSettingsImport 的 ok 結果;非 null 時顯示全量覆蓋確認 dialog
  const [pendingImport, setPendingImport] = useState(null);

  const handleExport = () => {
    chrome.storage.sync.get(buildStorageDefaults(), (items) => {
      if (chrome.runtime.lastError) {
        setStatus({ severity: "error", text: `讀取設定失敗:${chrome.runtime.lastError.message}` });
        return;
      }
      const exportData = buildSettingsExport(items, new Date().toISOString());
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = buildExportFileName();
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      setStatus({ severity: "success", text: "設定已匯出" });
    });
  };

  const handleFileSelected = (event) => {
    const file = event.target.files?.[0];
    event.target.value = ""; // 清空以便重選同一檔案
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      let json;
      try {
        json = JSON.parse(reader.result);
      } catch {
        setStatus({ severity: "error", text: "檔案不是有效的 JSON" });
        return;
      }
      const result = parseSettingsImport(json);
      if (!result.ok) {
        setStatus({ severity: "error", text: result.error });
        return;
      }
      setStatus(null);
      setPendingImport(result);
    };
    reader.onerror = () => setStatus({ severity: "error", text: "讀取檔案失敗" });
    reader.readAsText(file);
  };

  const handleConfirmImport = () => {
    const { settings, warnings } = pendingImport;
    setPendingImport(null);
    chrome.storage.sync.set(settings, () => {
      if (chrome.runtime.lastError) {
        setStatus({ severity: "error", text: `寫入設定失敗:${chrome.runtime.lastError.message}` });
        return;
      }
      // popup 各設定區塊只在 mount 時讀 storage,匯入後需重開視窗才會顯示新值;
      // 頁面端由 settingsManager 的 storage.onChanged 自動刷新。
      const reopenHint = "畫面上各區塊的顯示需重新開啟本視窗才會更新";
      setStatus(
        warnings.length > 0
          ? { severity: "warning", text: `設定已匯入(${warnings.join(";")})。${reopenHint}` }
          : { severity: "success", text: `設定已匯入。${reopenHint}` }
      );
    });
  };

  return (
    <Accordion>
      <AccordionSummary
        expandIcon={<ExpandMoreIcon />}
        aria-controls="settings-backup-content"
        id="settings-backup-header"
      >
        <SettingsBackupRestoreIcon sx={{ mr: 1, color: "primary.main" }} />
        <Typography>設定備份</Typography>
      </AccordionSummary>
      <AccordionDetails>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
          將全部設定匯出成 JSON 檔備份,或從備份檔完整還原(檔案未包含的項目會重設為預設值)。
        </Typography>
        <Box sx={{ display: "flex", gap: 1, mb: 1.5 }}>
          <Button variant="outlined" size="small" startIcon={<FileDownloadIcon />} onClick={handleExport}>
            匯出設定
          </Button>
          <Button
            variant="outlined"
            size="small"
            startIcon={<FileUploadIcon />}
            onClick={() => fileInputRef.current?.click()}
          >
            匯入設定
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json,application/json"
            style={{ display: "none" }}
            onChange={handleFileSelected}
          />
        </Box>
        {status && (
          <Alert severity={status.severity} onClose={() => setStatus(null)}>
            {status.text}
          </Alert>
        )}
        <Dialog open={pendingImport !== null} onClose={() => setPendingImport(null)}>
          <DialogTitle>匯入設定?</DialogTitle>
          <DialogContent>
            <DialogContentText>
              將以檔案內容完整覆蓋所有設定;檔案未包含的項目會重設為預設值。
              {pendingImport?.warnings?.length > 0 && (
                <>
                  <br />
                  注意:{pendingImport.warnings.join(";")}。
                </>
              )}
            </DialogContentText>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setPendingImport(null)}>取消</Button>
            <Button variant="contained" onClick={handleConfirmImport}>
              確定匯入
            </Button>
          </DialogActions>
        </Dialog>
      </AccordionDetails>
    </Accordion>
  );
};

export default SettingsBackup;
```

- [ ] **Step 2: 掛載到 PopupSettings**

`src/components/PopupSettings.jsx` import 區(靠近 `import AdvancedSettings from './settings/AdvancedSettings';`)加:

```js
import SettingsBackup from './settings/SettingsBackup';
```

`tabContentMap` 設定 tab(index 0)內容,`<AdvancedSettings />` 之後加一行:

```jsx
        <AdvancedSettings />
        <SettingsBackup />
```

- [ ] **Step 3: 驗證**

Run: `npm test` → Expected: 300 passed(UI 無自動化測試,既有套件不得變紅)。
Run: `npm run type-check` → Expected: exit 0。
Run: `npm run build` → Expected: exit 0。
Run: `npx eslint src/components/settings/SettingsBackup.jsx src/components/PopupSettings.jsx src/utils/settingsBackup.js` → Expected: 0 error。

- [ ] **Step 4: Commit**

```bash
git add src/components/settings/SettingsBackup.jsx src/components/PopupSettings.jsx
git commit -m "功能:popup 設定 tab 新增「設定備份」區塊(匯出/匯入 + 全量覆蓋確認)"
```

---

### Task 3: 文件同步 + 最終驗證

**Files:**
- Modify: `DOC/Settings.md`(新增章節)
- Modify: `docs/superpowers/specs/2026-07-07-settings-backup-design.md`(資料流段落修正)

**Interfaces:**
- Consumes: Task 1/2 的最終行為。

- [ ] **Step 1: DOC/Settings.md 新增章節**

在「falsy 退回行為」章節之後加:

```markdown
## 設定備份(匯出/匯入)

popup 設定 tab 尾端的「設定備份」區塊(`src/components/settings/SettingsBackup.jsx`,
純邏輯在 `src/utils/settingsBackup.js`)。格式契約與相容策略見
`docs/superpowers/specs/2026-07-07-settings-backup-design.md`,重點:

- 匯出檔信封 `{ format: 'nhitw-settings', version: 1, exportedAt, settings }`,
  `settings` 為 SETTINGS_SCHEMA 的 52 個扁平 storageKey(歷史改名鍵原樣)。
- 匯入為**全量還原**:檔內鍵覆蓋、schema 內缺鍵重設為預設;寫回是一次
  `chrome.storage.sync.set` 完整 52 鍵。
- **加鍵不 bump version**:新增設定鍵後,舊檔匯入缺鍵回預設、新檔匯入未知鍵
  忽略 + 警告;`version` 只在信封結構破壞性改變時才升(屆時匯入拒絕並提示更新)。
- `developerMode`/`devFetchAll`(`storage.local` 開發旗標)不進備份。
- 匯入後 popup 各區塊需重開視窗才顯示新值(各區塊只在 mount 時讀 storage);
  頁面端由 `settingsManager` 的 `storage.onChanged` 自動刷新。
```

- [ ] **Step 2: spec 資料流段落修正**

`docs/superpowers/specs/2026-07-07-settings-backup-design.md` 的「資料流與刷新」段落改為(修正 popup 不會自動刷新的實況):

```markdown
## 資料流與刷新

匯入 `sync.set` 後:**頁面端**由既有的 `chrome.storage.onChanged` 監聽
(`utils/settingsManager.js`、`App.jsx`)自動刷新;**popup 端**各設定區塊
只在 mount 時讀 storage、無 onChanged 監聽,故匯入成功訊息提示使用者
「重新開啟本視窗」。不新增任何通知機制。
```

- [ ] **Step 3: 最終驗證**

Run: `npm test`(300 綠)、`npm run type-check`(exit 0)、`npm run build`(exit 0)。

手動驗證(維護者,實機):popup → 設定 tab 尾端「設定備份」→ 匯出檔內容含 52 鍵駝峰信封;改幾個設定後匯入剛才的檔 → 確認 dialog → 重開 popup 檢查設定被還原;拿匯出檔手動加一個假鍵再匯入 → 警告訊息出現。

- [ ] **Step 4: Commit**

```bash
git add DOC/Settings.md docs/superpowers/specs/2026-07-07-settings-backup-design.md
git commit -m "文件:設定備份章節(DOC/Settings)+ spec 資料流修正(popup 需重開視窗)"
```
