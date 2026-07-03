# DOC/ 文件索引

本目錄是**開發者導向**的技術文件庫,說明「現行程式碼長什麼樣子」。內容以 2026-07-03(架構優化階段 6 完成後)的程式碼實況為準,會隨程式碼演進而更新。

| 文件 | 內容 |
|---|---|
| [`01_架構總覽.md`](./01_架構總覽.md) | 三個進入點、`apiInterceptor` 模組群、`dataStore` 單一真實來源、React 層(hooks/Context)、processor pattern、copyFormat 編輯器、型別安全網、資料流圖 |
| [`02_NHITW_DATA_對外契約.md`](./02_NHITW_DATA_對外契約.md) | 給下游 extension 開發者:page localStorage `NHITW_DATA` key 的完整格式、寫入時機、變更政策 |
| [`03_開發與維護指南.md`](./03_開發與維護指南.md) | npm scripts、測試策略、lint 政策、常見任務 how-to(新增資料型別/設定/複製格式元素)、release 流程 |
| [`04_技術債追蹤.md`](./04_技術債追蹤.md) | 各階段重構審查累積、尚未處理的已知問題清單 |
| [`05_Roadmap.md`](./05_Roadmap.md) | 已完成的六階段重構一覽、未來候選方向(非承諾) |

## 與其他文件的分工

- **`CLAUDE.md`**(repo 根目錄,gitignored,僅存在於維護者本機)—— 給 AI coding agent(Claude Code)的開發環境指引:常用指令、build pipeline 的非顯而易見之處、架構速覽。內容與本目錄有重疊,但 `CLAUDE.md` 更精簡、聚焦「動手改程式前要知道的坑」;本目錄提供完整脈絡與細節。
- **`docs/superpowers/`**(入版控)—— 歷史規劃紀錄:每次重構的 spec(`specs/`)、逐 task 實作計畫與 checkbox 進度(`plans/`)、交班文件(`2026-07-02-refactor-handoff.md`)。這些文件是**時間快照**,記錄「當時為什麼這樣做」,不會隨後續程式碼變動回頭修改(除了狀態欄位)。若想知道某個決策的來龍去脈或某階段的詳細變更清單,查這裡;若想知道「現在」的架構,查本目錄。

`src/apiInterceptor/README.md` 額外記錄該模組的執行流程與慢箋(chronicMed)資料 schema 細節,不重複收錄於本目錄,見 `01_架構總覽.md` 的連結。
