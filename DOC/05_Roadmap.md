# Roadmap

> 規劃/追蹤文件,非對外承諾。歷史規格與逐 task 進度見 `docs/superpowers/`。

## 已完成:架構優化六階段

出處:`docs/superpowers/specs/2026-07-02-architecture-analysis.md`(原始規格與優化順序表)、`docs/superpowers/2026-07-02-refactor-handoff.md`(交班文件)。全部完成於 `refactor-phase1-2` ~ `refactor-phase6` 分支(疊分支開發,尚未 squash merge 回 `feature-CKM`,見交班文件 Git 快照)。

| 階段 | 摘要 | 對應計畫文件 |
|---|---|---|
| 1 | 安全網 + 清理:測試遷移至 Vitest headless、183 個 `console.log` 收斂為 `debugLog`、刪除死碼(`vite.extension.config.js` 等)、`ageUtils.js` 統一民國年齡計算 | [`plans/2026-07-02-refactor-phase1-2.md`](../docs/superpowers/plans/2026-07-02-refactor-phase1-2.md) |
| 2 | 新增 `SettingsContext`,消除約 200 處 `generalDisplaySettings` prop drilling,順手修復 FloatingIcon 的 stale closure bug | [`plans/2026-07-02-refactor-phase1-2.md`](../docs/superpowers/plans/2026-07-02-refactor-phase1-2.md) |
| 3 | 新增 `dataStore.js`/`nhitwExport.js`,取代 15 個 `window.lastIntercepted*` 全域變數,`NHITW_DATA` 對外契約統一格式 | [`plans/2026-07-02-refactor-phase3-datastore.md`](../docs/superpowers/plans/2026-07-02-refactor-phase3-datastore.md) |
| 4 | `FloatingIcon.jsx` 925 → 349 行:拆出 `useUserInfo`/`useNhiDataState`/`useSettingsState` 三個 hook 與 `MainDialogHeader.jsx`,以 `nhiDataRef` 解循環相依 | [`plans/2026-07-02-refactor-phase4-floatingicon.md`](../docs/superpowers/plans/2026-07-02-refactor-phase4-floatingicon.md) |
| 5 | 修復 LabData 複製全部的真 ReferenceError bug、死碼清理、`dataManager.js` 宣告式 `PROCESSOR_REGISTRY` 化、`medicationFormatSettings` window 側通道移除、合併 `medicationCopyFormat/`+`labCopyFormat/` 為單一 config 驅動的 `copyFormat/` 模組(淨減約 1,693 行) | [`plans/2026-07-03-refactor-phase5.md`](../docs/superpowers/plans/2026-07-03-refactor-phase5.md) |
| 6 | Part A:`src/types/processors.js` 集中 typedef + `npm run type-check` 型別安全網,12 個 processor 主方法補 `@returns`。Part B:`legacyContent.js` 改名/拆解為 `src/apiInterceptor/`(六個模組),病患 ID debug log 遮罩 | [`plans/2026-07-03-refactor-phase6.md`](../docs/superpowers/plans/2026-07-03-refactor-phase6.md) |

**驗證基準(2026-07-03)**:24 個測試檔 / 224 個測試全綠;`npm run build` 成功;`npm run type-check` 0 errors;`src/` 範圍 ESLint 問題數 1,355(既存風格債,標準為不新增,見 `04_技術債追蹤.md`)。

## 已完成:issue #68 四點意見處理(2026-07-04)

出處:issue #68(danny0838「專案架構維護的觀察及建議」);計畫與執行紀錄見
[`plans/2026-07-04-issue-68-lint-compat-settings.md`](../docs/superpowers/plans/2026-07-04-issue-68-lint-compat-settings.md)。
完成於 `issue-68-quality` 分支(11 個 commits,**尚未 merge 回 main,待維護者審查**)。

| # | 意見 | 處理 |
|---|---|---|
| 1 | 程式碼風格不一致 | lint **1,357 問題 → 0 errors**(規則校準 + `--fix` 獨立 commit + 手動清理 + 死碼 -475 行);新增 CI gate(`.github/workflows/ci.yml`:lint/type-check/test/build) |
| 2 | 測試框架與跨版本瀏覽器 | manifest 宣告 `minimum_chrome_version: "109"`,build target 三處統一 `chrome109`(語法層保證);runtime 一次性驗證指南在本機 `.test_data/chrome109-testing.md`;vitest 保留(自動化)+ `test:manual`(真瀏覽器)雙軌 |
| 3 | 設定參數散落多處 | `src/config/settingsSchema.js` 單一事實來源(由 `defaultSettings.js` 自動衍生 52 個 storage 鍵);`settingsManager` 531→351 行;5 個設定 UI 元件收斂並修正預設值矛盾 bug;新增設定從 5–7 檔降為「defaultSettings 一行 + UI 控制項」,SOP 見 `Settings.md` |
| 4 | 先寫測試再重構 | 重構前先寫 loadAllSettings characterization 測試(52 鍵快照 fixture)鎖行為,重構期間既有測試一字未改全綠;此紀律已寫入 `03_開發與維護指南.md` 測試策略 |

**驗證基準(2026-07-04,`issue-68-quality`)**:25 個測試檔 / 239 個測試全綠;lint 0 errors + 23 warnings;type-check 綠;build 綠;CI 綠燈。
意外收穫:CI 首跑即抓到既有的時區敏感測試(見 `04_技術債追蹤.md` #5a)。

## 未來候選方向(非承諾,尚未排入計畫)

出處:`docs/superpowers/2026-07-02-refactor-handoff.md`「階段 7+ 候選項目」與本次盤點時延伸整理。
**擴充性的整體目標架構(資料型別描述檔、表格管線、UI registry)已獨立成 [`07_擴充藍圖.md`](./07_擴充藍圖.md),下列個別項目與其對齊。**

- **漸進式 TypeScript**:目前僅 `// @ts-check` + JSDoc typedef 的最小可行安全網(`jsconfig.json` 全域 `checkJs: false`)。若要進一步,下一步可能是挑幾個低風險、高變動率的檔案(如 `src/store/dataStore.js`)開 `// @ts-check` 試跑,再逐步擴大範圍,而非一次性遷移全 repo 或改用 `.ts` 副檔名(esbuild/vite 設定與 build pipeline 需同步調整)。
- **`dataStore.subscribe` 的 React 細粒度整合**:目前 `dataStore.subscribe` 尚無消費者,UI 更新仍靠 `dataFetchCompleted` 事件驅動全量重處理。若要細粒度更新,可設計 `useNhiData(type)` hook 直接訂閱單一型別變化,搭配 React 18 自動批次,理論上可取代事件機制;需先確認「批次抓取時 14 次逐型別通知」在該 hook 設計下不會造成不必要的中繼 render(`dataStore.js` 檔頭註解已預留此考量)。
- **技術債清單消化**:見 `04_技術債追蹤.md` 的「待處理」節(userInfoUtils/ageUtils 年齡計算整併、CKMSummaryBar 遷移到 Context、copyFormat 雙 config 重複 helper、NHITW_DATA 大小上限監控等),依風險與投報率排序後可個別排入小型 task。
- **大量資料情境下的 processor 記憶體/效能**:目前所有 processor 皆為一次性同步(或單一 `await`)處理完整 `rObject` 陣列,病患資料量大(長期慢性病史、大量檢驗記錄)時的記憶體佔用與處理耗時尚未有系統性量測或優化(如分頁處理、virtualization)。與上述「NHITW_DATA 大小監控」是同一資料量成長趨勢下的兩個面向。
- **exhaustive-deps 8 個 warnings 修復**(issue #68 遺留):每個都涉及 effect 觸發時機的行為變更,需逐一補行為測試後個別處理,不可 `--fix` 或機械式補依賴。
- **真瀏覽器自動化測試**(danny 第 2 點的理想型):Playwright persistent context 載入套件的自動煙霧測試,可鎖定舊版 Chromium(如 1.29 綁 109)。等出現老瀏覽器使用者的實際回報再投資;在那之前以「宣告底線 + 一次性手動驗證」為足。