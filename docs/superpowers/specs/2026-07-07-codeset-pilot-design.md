# CodeSet pilot:總覽自訂檢驗/影像項目(labFocus/imageFocus)設計

> 2026-07-07 定案。DOC/07 方向五的第一個 pilot,驅動需求 issue #64/#66/#67。
> 架構方案:overlay/delta 模型(brainstorming 三案擇一,方案 A)。

## 目標與範圍

**做**:

- 通用 `CodeSetEditor` + 兩個代碼集:`labFocus`(總覽關注檢驗)、`imageFocus`(總覽關注影像)。
- 功能:啟停、排序(影像端補上,補齊 #67)、label 編輯、從常用對照表(目錄)加入
  一對一項目、從 alias 預設組啟用一對多項目、移除加入項、還原預設(單筆/全部)。
- 一對多代碼(alias)為資料模型一等公民(#66/#67 核心)。
- 舊 `focusedLabTests`/`focusedImageTests` 使用者資料一次性遷移。

**不做**(依 DOC/07 執行順序表留待後續):

- `labChooseCopyItems` 與 atc5 分組收斂(下輪;本設計的宣告檔已為其預留形態)。
- 自由輸入代碼組 alias:pilot 只能從內建 alias 預設組與目錄挑選
  (brainstorming 決策:代碼來源=內建 alias 預設組+醫令代碼表衍生目錄)。
- 外部對照表匯入、`storage.local` 分流、provenance、`clinicalImpact` 標示
  (「CodeSet 成熟後」階段)。
- 目錄不涵蓋的代碼:等目錄擴充(往 config 加行),不開自由輸入。

## 實作時補記(2026-07-07,146 份真實測資查證)

alias 預設組初版僅 CBC(`08011C`/`08003C`):CRP/hs-CRP 同碼 `12015C`、
Cr/CCr 同碼 `09015C`(皆為 itemName 變體,免 alias);尿蛋白(UPCR/UACR)
跨碼(`09040C`/`09016C`/`Y00002` 等)但同碼下有非目標項目,orderCode 層
alias 會誤抓,留待「itemName 過濾」能力(CodeSet 成熟後階段)。

檢驗目錄(LAB_CATALOG)來源改為 KMUH 公開檢驗目錄快照
(`.test_data/reference/kmuh_lab_reference_20260707.json`,非個資),
以 order_code 去重約 301 筆 + 手挑常用碼聯集(取代 spec 原「abbreviationUtils
28 碼衍生」的初版方案,涵蓋面大幅擴大;手挑標籤優先)。注意:KMUH 表同一
檢驗因分屬多科(work_dept)/檢體變體會重覆多列(GPT 曾同時掛生化與腎功能
實驗室),去重以 order_code 為單位、標籤取最簡短名稱——比對只認 orderCode,
科別歸屬不影響功能。

## 資料模型

### 單筆項目(list shape)

```js
{
  id: 'cbc-hb',              // 穩定邏輯 id;內建項固定、目錄加入項用 'catalog:<code>'、alias 組用 'alias:<組id>'
  label: 'Hb',               // 顯示名稱,使用者可改
  codes: ['08011C-Hb'],      // 一對多代碼;任一命中即算此項目命中
  enabled: true,
  order: 3,
}
```

- 內建 CBC 子項(WBC/Hb/Platelet)保留 `08011C-*` 偽代碼語意(matcher 統一處理),
  使用者不能自建這種拆分(brainstorming 決策:只支援 orderCode 層級的 alias)。
- 影像的逗號串代碼(`'33085B,33084B'`)正式拆成 `codes` 陣列。

### 內建資料(config,不進 storage)

| 資料 | 位置 | 內容 |
|------|------|------|
| 新版預設清單 | `src/config/labTests.js` 加 `LAB_FOCUS_BUILTIN`、`imageTests.js` 加 `IMAGE_FOCUS_BUILTIN` | 由 `DEFAULT_LAB_TESTS`/`DEFAULT_IMAGE_TESTS` 換裝為新模型;**舊匯出保留**(FALLBACK、labChooseCopyItems 等仍在用) |
| alias 預設組 | `src/config/codeSetCatalog.js` | 專案維護的一對多組合;初版=issue #66 四組:CBC(08011C/08003C)、Cr/CCr、CRP/hs-CRP、尿蛋白 |
| 常用對照表(目錄) | `src/config/codeSetCatalog.js` | 一對一項目。lab 初版從 `abbreviationUtils.js` 的 28 個常用代碼衍生;影像手工整理常見檢查代碼。未來以健保署醫令代碼表擴充 |
| 代碼集宣告 | `src/config/codeSets.js` | 每代碼集一份:`{ id, shape: 'list', builtin, catalog, aliasPresets, storageKey, legacyStorageKey }`;編輯器與 resolver 都吃宣告,未來收斂其他 dialog = 加宣告 |

## 儲存與遷移

### overlay 格式(只存 delta)

`defaultSettings.js` 的 `overview` section 加兩鍵:`labFocusOverlay`、`imageFocusOverlay`,
預設 `null`(= 無自訂,用內建)。sync 儲存(容量估算:極端 2–3KB,遠低於單鍵 8KB;
local 分流留給未來大型對照表)。

```js
{
  overrides: { 'cbc-hb': { enabled: false }, 'bun': { order: 7, label: 'BUN(腎)' } },
  additions: [ { id: 'catalog:09023C', label: 'Cl', codes: ['09023C'], enabled: true, order: 12 } ],
  removals: ['catalog:09020C'],   // 只對加入項;內建項只能停用不能移除
}
```

- 內建表隨版本升級:新項目自動出現、修正自動生效,使用者自訂不受影響。
- 還原此筆 = 從 `overrides` 刪該 id;全部還原 = 整鍵寫回 `null`。

### 遷移(舊鍵 → overlay)

- 觸發:讀取時 `labFocusOverlay === null` 且舊鍵(`focusedLabTests`)有值。
  執行點=popup 設定載入與頁面端 `settingsManager` 載入兩處皆可觸發,**冪等**
  (寫入前再確認新鍵仍為 `null`,已遷移者跳過);計算是純函數,寫入是一次
  `chrome.storage.sync.set`。
- 純函數 `migrateLegacyFocusList(legacy, builtin)`:以 orderCode 對回內建 id,
  萃取使用者的 enabled/排序差異成 `overrides`;對不上內建的舊項轉 `additions`。
  結果寫入新鍵,一次性。
- **舊鍵保留不動**(可回滾、降級不炸)。`FALSY_FALLBACK_KEYS` 語意留在舊鍵;
  新鍵不設 falsy 退回(`null` 是合法值=用預設)。
- 設定備份:兩新鍵依「加鍵不 bump version」契約自動納入
  (`2026-07-07-settings-backup-design.md`),信封不動。

## resolver 與比對(`src/utils/codeSetResolver.js`,純函數)

- `resolveCodeSet(builtin, overlay)` → 最終清單:套 overrides、併 additions、
  濾 removals、依 order 排序。消費端只認 `{ id, label, codes, enabled, order }`。
- `migrateLegacyFocusList(legacy, builtin)` → overlay。
- `buildCodeMatcher(resolvedList)` → 給資料列的 orderCode 回命中項目。
  統一三種既有比對特例:精確碼、`08011C-` 前綴偽代碼、影像多代碼(已是陣列)。
- **錯誤處理**:overlay 結構不合法(非物件/欄位型別錯)視同 `null` 用預設
  並 `console.warn`,不炸 UI;備份匯入帶進壞 overlay 由同一層擋住。

## 消費端改動(pilot 只動總覽兩處)

- `Overview_LabTests.jsx`:overlay → `resolveCodeSet` → matcher 取代
  `isCBCCode()` 等手寫比對。09015C 的 Cr/eGFR 選值、CBC 拆欄等**資料處理特例保留**
  (判讀邏輯非清單邏輯),觸發條件改由 matcher 判定。
- `Overview_ImagingTests.jsx`:同樣換 resolver + matcher,刪 `orderCode.split(',')`。
- 設定讀取鏈:兩鍵進 `overview` section 自動流到消費端;resolver 在消費端呼叫,
  settingsManager 不藏魔法。

## UI(`src/components/settings/CodeSetEditor.jsx`)

- 通用 dialog,吃 `codeSets.js` 宣告渲染;`OverviewSettings.jsx` 兩顆按鈕改開它
  (props 只差 codeSet id),兩個舊 dialog 刪除。
- **主清單**:checkbox 啟停、上/下箭頭排序、label 點擊編輯、代碼小字顯示
  (如 `08011C, 08003C`)、加入項有刪除鈕。
- **新增區**:「從常用項目加入」展開目錄(搜尋框過濾 label/代碼);alias 預設組
  獨立小節勾選啟用;已在清單者不重複顯示。
- **動作列**:取消/全部還原預設(二次確認)/保存。temp state、保存才寫 storage,
  寫入後發既有 `settingChanged` 訊息刷新頁面端。

## 測試策略(先 characterization 後重構)

1. **Characterization 先行**:總覽兩消費端現有比對行為(CBC 偽代碼、09015C、
   逗號串)以 `.test_data/json` 真實測資路徑建基準;重構後 overlay=null 時輸出不變。
   (測資絕不入 commit,依 repo 紀律。)
2. **resolver 單元測試**:resolve/migrate/matcher 全覆蓋,含防禦性解析、
   「對不上內建轉 addition」、null/falsy 邊界。
3. **備份 round-trip**:兩新鍵進出備份檔不失真。
4. 基準:`npm test` 302 綠 + 新增測試全綠;type-check/build exit 0。

## 底線(DOC/07)

- sync 配額(單鍵 8KB/總 100KB)不可觸;只存偏好,病人資料永不進設定儲存。
- processor/resolver 純函數,vitest headless 可跑。
- 設定單一事實來源(`Settings.md`),完成後同步更新該文件與 DOC/07 執行順序表。
