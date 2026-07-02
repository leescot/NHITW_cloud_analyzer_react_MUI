# 交班文件:架構優化階段 1+2(2026-07-02)

> 用途:重啟對話 / context compact 後接手工作的完整狀態快照。
> 相關文件:規格 `specs/2026-07-02-architecture-analysis.md`、計畫 `plans/2026-07-02-refactor-phase1-2.md`(內含逐 task 進度與後續追蹤清單)

## 目前狀態(TL;DR)

- **階段 1+2 重構已全部完成**,並已 **squash merge 回 `feature-CKM`**(commit `0ea940a`),**尚未 push**。
- 細粒度分支 `refactor-phase1-2` **保留**(16 個 commit,可追溯個別改動),不 push。
- 合併後驗證:Vitest **125/125 全綠**、`npm run build` 成功、ESLint 相對基準淨減 94 個問題。
- **唯一未完成項:手動煙霧測試**(見下方清單),完成後可考慮 push / release。

## 已完成內容

### 階段 1:測試安全網 + 清理
- `npm test` = Vitest headless(node + jsdom);舊瀏覽器 Mocha harness 已刪除;手動測試流程改名 `npm run test:manual`。
- `src/utils/logger.js` 的 `debugLog`:預設靜默,console 執行 `localStorage.setItem('nhitw_debug','1')` 後重新整理開啟。183 個 `console.log` 已收斂(改 debugLog 或刪除);ESLint `no-console` 規則已啟用(allow warn/error)。
- 死碼移除:`vite.extension.config.js`、FloatingIcon 註解 import。
- `src/utils/ageUtils.js`:民國年生日→年齡計算單一來源(含測試)。

### 階段 2:SettingsContext
- `src/contexts/SettingsContext.jsx`:`SettingsProvider` + `useGeneralDisplaySettings()` / `useAppSettings()`;無 Provider 時回傳 DEFAULT_SETTINGS 對應值(popup 安全)。
- Provider 掛在 `FloatingIcon.jsx`;38+ 元件改用 hook,約 200 處 `generalDisplaySettings` prop 傳遞已全數移除(僅剩 Provider 一處)。
- **修復 stale closure bug**:FloatingIcon 掛載 listener 改讀 `openRef` / `appSettingsRef`,popup 觸發「開啟自訂格式編輯器」不再需要重新整理。
- popup 樹(`PopupSettings.jsx`)維持自有 state,不使用此 context(獨立 React root)。
- 例外:`CKMSummaryBar` 仍以 `gds` prop 接收顯示設定(它真的在用,留待後續遷移)。

## 待辦(依優先序)

### 1. 手動煙霧測試(阻擋 push/release 的唯一項目)
`npm run test:manual` → Chrome 載入 `dist/` → 開 `http://localhost:5173/`:
1. **stale closure 修復**:popup 開啟「藥物自訂複製格式」→ 從 popup 觸發「開啟自訂格式編輯器」→ dialog 應第一次就跳到進階 tab(不需重新整理)
2. **文字大小即時更新**:dialog 開著時在 popup 調整內容文字大小,各 tab 文字即時變化
3. **CKM Overview 卡片**:其他檢驗、影像卡片文字大小正常
4. **本地 JSON 匯入**:上傳 `tests/test_data/Fake_Data_250402.json`,病患姓名/性別/年齡正確
5. **debugLog**:console 預設無輸出;設 flag 重新整理後出現

通過後:把計畫文件驗收清單最後一格打勾、Task 15 Step 3 打勾。

### 2. 審查累積的既存問題(非本次引入,可開新 task)
1. `LabData.jsx:219-293`「複製全部」引用不存在的 `setSnackbarMessage`/`setSnackbarOpen` → 潛在 ReferenceError(**真 bug,優先**)
2. `userInfoUtils.js` 有與 `ageUtils` 近似的年齡計算(比較邏輯用 Date rollover 後的值,非純複製),值得整併
3. `Overview_AdultHealthCheck / CancerScreening / hbcvdata` 三檔為死碼(被 `Overview_IntegratedHealthData` 取代),可刪
4. `CKMSummaryBar` 遷移到 hook 後,可一併移除 `CKMData.jsx:289` 與 `Overview.jsx:93` 的 `gds={...}`
5. debug log 含病患身分證號(`legacyContent.js` 病患切換 log),可考慮遮罩
6. `FloatingIcon.handleData` 內 `userInfo` 仍有既存 stale read(僅多餘 re-render,無正確性問題)
7. `LineSpacingWrapper.jsx` 無人使用(死碼);其 fallback 引用不存在的 `lineSpacingHeight` 設定鍵

### 3. 規格文件的階段 3+(尚未動工)
見 `specs/2026-07-02-architecture-analysis.md` 優化順序表:
- 階段 3:`dataStore` 取代 `window.lastIntercepted*` 全域變數(最核心的架構改善)
- 階段 4:拆 FloatingIcon(948 行 god component)
- 階段 5:合併 medicationCopyFormat / labCopyFormat 兩套近乎複製的編輯器;dataManager 宣告式化
- 階段 6(選配):JSDoc typedef / 漸進 TypeScript

## 接手必知(環境與慣例)

- **CLAUDE.md 是 gitignored**:對它的更新只存在本機磁碟,不進版控。目前磁碟版已同步(Vitest 指令、SettingsContext 段落)。
- **D: 是 subst 磁碟**(映射到 `C:\Users\mchnurse\DiskD`):`vitest.config.js` 的 `resolve.preserveSymlinks: true` 就是為此,**不要移除**。偶發 Rollup 快取路徑錯誤(訊息含 DiskD)→ `rm -rf dist node_modules/.vite` 重建即可。
- **stash 警告**:stash list 有一個舊的 `feature-copydata-content` stash(GitHub Desktop 建立),**不要 pop**——它會對 package.json / manifest.json 造成衝突。本次工作中曾誤 pop 過一次,已用 `git reset --hard` 復原,stash 本身完整保留。
- **npm scripts**:`npm test`(Vitest)/ `npm run test:watch` / `npm run test:manual`(build TEST 模式 + server)/ `npm run build`。
- **lint 基準**:repo 有約 2,160 個既存 stylistic lint 問題(trailing spaces 等),與本次重構無關;驗證標準是「不新增」,不是「全綠」。
- 工作流程慣例:specs/ 放設計、plans/ 放實作計畫(checkbox 追蹤)、commit message 繁體中文。

## Git 快照(2026-07-02)

```
feature-CKM(目前所在,領先 origin 21+1 commit,未 push)
└─ 0ea940a 架構優化階段 1+2 squash commit(102 檔,+1,879/−26,246)
   └─ 1868d93 commit 優化方案(merge 前的 tip)

refactor-phase1-2(保留,16 commits:b612caf…2b8e15c)
```
