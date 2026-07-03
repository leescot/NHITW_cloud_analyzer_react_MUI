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

## 未來候選方向(非承諾,尚未排入計畫)

出處:`docs/superpowers/2026-07-02-refactor-handoff.md`「階段 7+ 候選項目」與本次盤點時延伸整理。

- **漸進式 TypeScript**:目前僅 `// @ts-check` + JSDoc typedef 的最小可行安全網(`jsconfig.json` 全域 `checkJs: false`)。若要進一步,下一步可能是挑幾個低風險、高變動率的檔案(如 `src/store/dataStore.js`)開 `// @ts-check` 試跑,再逐步擴大範圍,而非一次性遷移全 repo 或改用 `.ts` 副檔名(esbuild/vite 設定與 build pipeline 需同步調整)。
- **`dataStore.subscribe` 的 React 細粒度整合**:目前 `dataStore.subscribe` 尚無消費者,UI 更新仍靠 `dataFetchCompleted` 事件驅動全量重處理。若要細粒度更新,可設計 `useNhiData(type)` hook 直接訂閱單一型別變化,搭配 React 18 自動批次,理論上可取代事件機制;需先確認「批次抓取時 14 次逐型別通知」在該 hook 設計下不會造成不必要的中繼 render(`dataStore.js` 檔頭註解已預留此考量)。
- **技術債清單消化**:見 `04_技術債追蹤.md` 的「待處理」節(userInfoUtils/ageUtils 年齡計算整併、CKMSummaryBar 遷移到 Context、copyFormat 雙 config 重複 helper、NHITW_DATA 大小上限監控等),依風險與投報率排序後可個別排入小型 task。
- **大量資料情境下的 processor 記憶體/效能**:目前所有 processor 皆為一次性同步(或單一 `await`)處理完整 `rObject` 陣列,病患資料量大(長期慢性病史、大量檢驗記錄)時的記憶體佔用與處理耗時尚未有系統性量測或優化(如分頁處理、virtualization)。與上述「NHITW_DATA 大小監控」是同一資料量成長趨勢下的兩個面向。
