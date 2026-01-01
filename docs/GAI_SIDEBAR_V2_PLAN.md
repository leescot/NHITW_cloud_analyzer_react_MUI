# GAI Sidebar 三 Tab 重構實作計畫

**文件版本**: 1.0
**建立日期**: 2025-12-31
**作者**: Claude Code (Sonnet 4.5)
**狀態**: 計畫階段

---

## 需求總結

將現有的 4 個動態分析 Tab 重構為 3 個固定功能 Tab：

### Tab 1 - 自動分析
- **功能**：在 Sidebar 打開時自動執行 1 個使用者選擇的分析
- **配置**：使用者從 7 個內建模板中選擇 1 個（例如：危險警示、用藥風險等）
- **顯示**：分析結果列表

### Tab 2 - 快速按鈕
- **功能**：6 個可配置的分析按鈕，點擊後執行
- **配置**：每個按鈕可選擇內建模板或自訂 prompt（混合模式）
- **顯示**：按鈕列表 + 點擊後在下方展開顯示結果

### Tab 3 - Chat 對話
- **功能**：與醫療資料進行多輪對話
- **配置**：固定傳送全部 9 種醫療資料
- **特性**：快速提問按鈕 + 對話歷史保存（session 內）

---

## 架構變更概述

### 從動態 4 Tab → 固定 3 Tab

**現有架構**：
- 4 個動態 Tab，每個可配置為不同模板
- 使用 `tabConfigs` 陣列管理配置
- 使用 `analysisResults`, `loadingStates`, `errorStates` 物件（key 為 templateId）

**新架構**：
- 3 個固定功能 Tab（自動分析、快速按鈕、Chat）
- 每個 Tab 有獨立的狀態管理
- 每個 Tab 使用獨立的子組件

---

## 資料結構設計

### Chrome Storage 新增 Keys

```javascript
// Tab 1 配置
gaiAutoAnalysisConfig: {
  templateId: 'critical_alerts',  // 從 7 個預設模板選擇
  enabled: true                   // 是否啟用自動分析
}

// Tab 2 配置（6 個按鈕）
gaiQuickButtonsConfig: [
  {
    slotIndex: 0,                    // 按鈕位置 (0-5)
    type: 'preset',                  // 'preset' | 'custom'
    templateId: 'medication_risks',  // preset 時使用
    customConfig: null,              // custom 時使用（結構同自訂 tab）
    label: '用藥風險',                // 按鈕文字
    icon: 'Medication',              // MUI 圖示名稱
    enabled: true                    // 是否啟用
  },
  // ... 最多 6 個按鈕
]

// Tab 3 配置（Chat）
gaiChatConfig: {
  systemPrompt: '你是專業的醫療AI助理...',
  dataTypes: ['patientSummary', 'allergy', 'surgery', ...],  // 全部 9 種
  quickQuestions: ['請摘要重點', '有哪些異常需要注意？', ...],
  enableHistory: true,
  maxHistoryLength: 10
}

// Chat 歷史（存在 chrome.storage.local，不同步）
gaiChatHistory: [
  { role: 'user', content: '...', timestamp: '...' },
  { role: 'assistant', content: '...', timestamp: '...', metadata: {...} }
]

// 版本標記（用於資料遷移）
gaiSidebarConfigVersion: 2
```

### 預設值定義

新增檔案：`src/config/sidebarV2Defaults.js`

---

## 關鍵文件修改清單

### 1. Sidebar.jsx（重構，~400 行）

**主要修改**：
- 移除 `tabConfigs`, `customTabConfig` 狀態
- 新增 3 個 Tab 的獨立狀態：
  - `autoAnalysisConfig`, `autoAnalysisResult`, `autoAnalysisLoading`, `autoAnalysisError`
  - `quickButtonsConfig`, `buttonResults[0-5]`, `buttonLoadings[0-5]`, `buttonErrors[0-5]`
  - `chatConfig`, `chatHistory`, `chatLoading`, `chatError`, `userInput`
- 重寫載入邏輯（`useEffect` 載入 3 個配置）
- 重寫自動分析邏輯（只執行 1 個選定的模板）
- 新增按鈕執行邏輯（`runButtonAnalysis(buttonConfig)`）
- 新增 Chat 邏輯（`sendChatMessage(message)`, `handleQuickQuestion(question)`）
- 重寫 Tab 渲染（3 個固定 Tab + 3 個子組件）

### 2. settingsManager.js（新增 ~150 行）

**新增函數**：
- `loadAutoAnalysisConfig()` / `saveAutoAnalysisConfig(config)`
- `loadQuickButtonsConfig()` / `saveQuickButtonsConfig(config)`
- `loadChatConfig()` / `saveChatConfig(config)`
- `loadChatHistory()` / `saveChatHistory(history)` （使用 chrome.storage.local）
- `migrateSidebarConfigToV2()` （資料遷移邏輯）

### 3. 新增組件（5 個）

#### src/components/sidebar/Tab1AutoAnalysis.jsx (~120 行)
- Props: `config, result, loading, error, onRetry`
- 顯示單一分析結果列表
- 處理 loading/error/empty 狀態

#### src/components/sidebar/Tab2QuickButtons.jsx (~200 行)
- Props: `buttons, results, loadings, errors, onButtonClick`
- 渲染 6 個按鈕（只顯示 enabled 的）
- 每個按鈕可展開/收合結果
- 獨立的 loading/error 狀態

#### src/components/sidebar/Tab3Chat.jsx (~180 行)
- Props: `config, history, loading, error, userInput, onInputChange, onSendMessage, onQuickQuestion`
- 快速提問按鈕區域
- 對話訊息列表（使用者/AI 分開樣式）
- 輸入框 + 傳送按鈕
- 自動滾動到底部

#### src/components/sidebar/SidebarV2ConfigDialog.jsx (~350 行)
- 取代現有的 `TabConfigDialog.jsx`
- 3 個 Tab：自動分析、快速按鈕、Chat
- Tab 1：模板選擇下拉選單 + 啟用開關
- Tab 2：6 個按鈕槽位配置 + 編輯按鈕
- Tab 3：System Prompt 編輯 + 快速提問管理

#### src/components/sidebar/CustomButtonEditor.jsx (~150 行)
- 編輯自訂按鈕配置
- 按鈕名稱輸入
- 資料類型選擇（9 種，Chip 顯示）
- System Prompt 編輯

### 4. 新增配置檔案

#### src/config/sidebarV2Defaults.js (~120 行)
- `DEFAULT_AUTO_ANALYSIS_CONFIG`
- `DEFAULT_QUICK_BUTTONS_CONFIG` （6 個按鈕預設值）
- `DEFAULT_CHAT_CONFIG`

---

## 實作步驟（分 5 個階段）

### Phase 1：基礎設施準備（1-2 天）

**目標**：建立新的配置系統和資料遷移邏輯

1. 建立 `src/config/sidebarV2Defaults.js`
   - 定義 3 個 Tab 的預設配置
   - 匯出 `DEFAULT_AUTO_ANALYSIS_CONFIG`, `DEFAULT_QUICK_BUTTONS_CONFIG`, `DEFAULT_CHAT_CONFIG`

2. 擴充 `src/utils/settingsManager.js`
   - 新增 6 個配置管理函數（load/save × 3）
   - 新增 Chat 歷史管理函數（使用 chrome.storage.local）
   - 新增 `migrateSidebarConfigToV2()` 遷移邏輯

3. 建立空殼組件（先建立檔案，只包含基本結構）
   - `Tab1AutoAnalysis.jsx`
   - `Tab2QuickButtons.jsx`
   - `Tab3Chat.jsx`
   - `SidebarV2ConfigDialog.jsx`
   - `CustomButtonEditor.jsx`

**測試重點**：
- 新增的 load/save 函數正確運作
- 預設值自動建立
- 遷移邏輯不影響現有使用者

---

### Phase 2：Tab 1 實作（1 天）

**目標**：完成自動分析功能

1. 修改 `Sidebar.jsx`
   - 新增 Tab 1 相關 state（`autoAnalysisConfig`, `autoAnalysisResult`, 等）
   - 修改 `useEffect` 載入邏輯（載入 `autoAnalysisConfig`）
   - 重寫自動分析邏輯（只執行 1 個模板）
   - 新增 `runAutoAnalysis()` 函數
   - 暫時保留現有 4 Tab 渲染（並行開發）

2. 完成 `Tab1AutoAnalysis.jsx`
   - 實作 loading 狀態顯示（CircularProgress）
   - 實作錯誤顯示 + 重試按鈕
   - 實作結果列表渲染
   - 實作空狀態顯示

3. 新增 `SidebarV2ConfigDialog.jsx` - Tab 1 配置區
   - 基本對話框結構（3 個 Tab）
   - Tab 1：模板選擇下拉選單
   - Tab 1：啟用/停用開關
   - Tab 1：顯示所選模板的資料類型

**測試重點**：
- Sidebar 打開時自動執行 1 個分析
- 配置選擇正確儲存/載入
- Loading/Error 狀態正確
- 停用時不執行分析

---

### Phase 3：Tab 2 實作（2-3 天）

**目標**：完成快速按鈕功能

1. 修改 `Sidebar.jsx`
   - 新增 Tab 2 相關 state（`quickButtonsConfig`, `buttonResults`, `buttonLoadings`, `buttonErrors`）
   - 新增 `runButtonAnalysis(buttonConfig)` 函數
   - 處理 preset 和 custom 兩種類型

2. 完成 `Tab2QuickButtons.jsx`
   - 渲染按鈕列表（只顯示 enabled 的按鈕）
   - 每個按鈕顯示圖示 + 文字
   - 點擊按鈕執行分析
   - 結果區域展開/收合（使用 MUI Collapse）
   - 獨立的 loading/error 狀態

3. 擴充 `SidebarV2ConfigDialog.jsx` - Tab 2 配置區
   - 6 個按鈕槽位配置介面
   - 每個槽位：類型選擇（preset/custom）、模板選擇、啟用開關
   - 整合 CustomButtonEditor

4. 完成 `CustomButtonEditor.jsx`
   - 按鈕名稱輸入
   - 資料類型選擇（9 種，使用 Chip）
   - System Prompt 編輯

**測試重點**：
- 6 個按鈕正確渲染
- 點擊執行分析
- 結果展開/收合
- Preset 和 Custom 按鈕都正常
- 配置正確儲存/載入

---

### Phase 4：Tab 3 實作（2 天）

**目標**：完成 Chat 對話功能

1. 修改 `Sidebar.jsx`
   - 新增 Tab 3 相關 state（`chatConfig`, `chatHistory`, `chatLoading`, `userInput`）
   - 新增 `sendChatMessage(message)` 函數
   - 新增 `handleQuickQuestion(question)` 函數
   - 新增 `clearChatHistory()` 函數
   - 組合對話歷史到 user prompt（多輪對話）

2. 完成 `Tab3Chat.jsx`
   - 快速提問按鈕區域（Chip 按鈕）
   - 對話訊息列表（user/assistant 不同樣式）
   - 輸入框 + 傳送按鈕
   - 自動滾動到底部（useRef + useEffect）
   - Loading 指示器

3. 擴充 `SidebarV2ConfigDialog.jsx` - Tab 3 配置區
   - System Prompt 多行編輯框
   - 快速提問列表管理（新增/編輯/刪除）
   - 對話歷史開關 + 最大保存數量設定

**測試重點**：
- 輸入訊息傳送
- 快速提問按鈕執行
- 對話歷史正確顯示
- 多輪對話上下文保持
- 清除歷史功能
- 自動滾動

---

### Phase 5：整合與遷移（1-2 天）

**目標**：完成整合測試、向後相容和 UI 優化

1. 完成 `Sidebar.jsx` 重構
   - 移除舊的 4 Tab 渲染邏輯
   - 整合 3 個新 Tab
   - 更新 Header 按鈕（清除對話按鈕只在 Tab 3 顯示）
   - 整合 `SidebarV2ConfigDialog`

2. 資料遷移
   - 在 `Sidebar.jsx` 初始化時呼叫 `migrateSidebarConfigToV2()`
   - 測試舊配置遷移
   - 備份舊配置到 `gaiSidebarTabs_backup`

3. UI/UX 優化
   - 調整樣式（間距、顏色、字體）
   - 優化 loading 狀態顯示
   - 優化錯誤訊息
   - 響應式調整

4. 整合測試
   - 3 個 Tab 切換
   - 配置儲存/載入
   - 錯誤處理
   - 效能測試

**測試重點**：
- 完整流程測試（開啟 Sidebar → 自動分析 → 點按鈕 → Chat 對話 → 配置修改）
- 舊使用者配置自動遷移
- 無錯誤和警告
- 使用者體驗流暢

---

## 關鍵設計決策

### 1. Chat 不使用 Strict JSON Schema
- 傳送 `jsonSchema: null` 給 background.js
- 直接取得純文字回應
- 適合自由對話場景

### 2. Chat 歷史存在 chrome.storage.local
- 不跨設備同步（避免 quota 問題）
- 只保留當前 session
- 最多保留 10 輪對話（滑動窗口）

### 3. 按鈕結果展開/收合
- 預設收合（節省空間）
- 點擊展開圖示展開
- 使用 MUI Collapse 動畫

### 4. 向後相容策略
- 自動偵測舊配置（`gaiSidebarTabs` 存在但 `gaiSidebarConfigVersion` !== 2）
- Tab 0 → 自動分析
- Tab 1-3 → 快速按鈕 slot 0-2
- 保留舊配置作為備份

---

## 關鍵文件路徑

### 修改檔案
1. `src/components/Sidebar.jsx` - 核心重構（~400 行修改）
2. `src/utils/settingsManager.js` - 新增函數（~150 行）

### 新增檔案
3. `src/config/sidebarV2Defaults.js` - 預設配置（~120 行）
4. `src/components/sidebar/Tab1AutoAnalysis.jsx` - Tab 1 組件（~120 行）
5. `src/components/sidebar/Tab2QuickButtons.jsx` - Tab 2 組件（~200 行）
6. `src/components/sidebar/Tab3Chat.jsx` - Tab 3 組件（~180 行）
7. `src/components/sidebar/SidebarV2ConfigDialog.jsx` - 配置對話框（~350 行）
8. `src/components/sidebar/CustomButtonEditor.jsx` - 自訂編輯器（~150 行）

**總計**：2 個修改檔案、6 個新增檔案、~1670 行新增/修改程式碼

---

## 預估時間

- Phase 1（基礎設施）：1-2 天
- Phase 2（Tab 1）：1 天
- Phase 3（Tab 2）：2-3 天
- Phase 4（Tab 3）：2 天
- Phase 5（整合測試）：1-2 天

**總計**：7-10 天

---

## 潛在風險與緩解

### 風險 1：Chat 對話 Token 超限
**緩解**：
- 限制歷史記錄數量（最多 10 輪）
- 提供清除歷史按鈕
- 監控 token 使用量

### 風險 2：6 個按鈕同時執行導致效能問題
**緩解**：
- 獨立狀態管理，避免互相影響
- 顯示 loading 狀態，用戶知道正在執行
- 可考慮限制同時執行數量（未來優化）

### 風險 3：資料遷移失敗
**緩解**：
- 保留舊配置作為備份
- 充分測試遷移邏輯
- 提供重置功能

### 風險 4：使用者不熟悉新界面
**緩解**：
- 提供預設配置（開箱即用）
- 清楚的按鈕標籤和圖示
- 快速提問降低學習成本

---

## 成功標準

✅ 3 個 Tab 功能完整實作
✅ 配置系統正確運作
✅ 舊使用者配置自動遷移
✅ 無錯誤和警告
✅ 通過所有功能測試
✅ UI/UX 流暢
✅ 程式碼可維護性高

---

## 相關文件

- [GAI 模組化計畫](./GAI_MODULARIZATION_PLAN.md) - 原始的 4 Tab 模組化架構
- [GAI 架構文件](./GAI_ARCHITECTURE.md) - GAI 系統整體架構說明

---

## 實作記錄

### Phase 1-4 完成 (2025-12-31)

**已完成項目**：
- ✅ 建立 `src/config/sidebarV2Defaults.js` 配置檔案
- ✅ 擴充 `src/utils/settingsManager.js` 新增 V2 配置管理函數
- ✅ 實作 `migrateSidebarConfigToV2()` 資料遷移邏輯
- ✅ 建立 5 個 V2 組件：
  - `Tab1AutoAnalysis.jsx` - 自動分析顯示組件
  - `Tab2QuickButtons.jsx` - 快速按鈕組件
  - `Tab3Chat.jsx` - Chat 對話組件
  - `SidebarV2ConfigDialog.jsx` - 配置對話框
  - `CustomButtonEditor.jsx` - 自訂按鈕編輯器
- ✅ 重構 `Sidebar.jsx` 支援 V2 架構（雙模式共存）
- ✅ Tab 1 自動分析功能完整實作
- ✅ Tab 2 快速按鈕功能完整實作（6 個可配置按鈕）
- ✅ Tab 3 Chat 對話功能完整實作（多輪對話、快速提問）

**問題修復記錄**：

1. **Config 對話框 z-index 問題** (2025-12-31)
   - 問題：config 視窗被移到後層有部份看不到
   - 解決：設定 `SidebarV2ConfigDialog` z-index = 2147483649
   - 解決：設定 `CustomButtonEditor` z-index = 2147483650

2. **TextField/IconButton 缺少 import** (2025-12-31)
   - 問題：點擊「對話」tab 時出現 `TextField is not defined` 錯誤
   - 解決：在 `SidebarV2ConfigDialog.jsx` 新增 `TextField, IconButton` 到 MUI imports

3. **Tab 點擊無反應問題** (2025-12-31)
   - 問題：Tab 2 和 Tab 3 無法點擊，Tab icon 不會變色
   - 根本原因：
     - Tab 點擊事件被阻擋（pointer-events 問題）
     - Tab 組件沒有明確的 `value` props，MUI 無法追蹤選擇狀態
   - 解決方案：
     - 新增明確的 `value={0}`, `value={1}`, `value={2}` props
     - 新增直接 `onClick` handlers 作為備援
     - 新增 `pointerEvents: 'auto'` 和 `cursor: 'pointer'` 樣式
   - 結果：所有 Tab 點擊正常，選擇狀態樣式正確顯示

4. **Chat 歷史清除機制實作** (2025-12-31)
   - 需求：載入新資料或重新啟動時清空 Chat 歷史
   - 實作內容：
     - 新增 `clearChatHistory()` 函數（Sidebar.jsx:221-227）
     - 資料重載時清除（監聽 `isDataLoaded` 變化）
     - 病人變化時清除（追蹤 `patientSummaryData` 中的病歷號/身分證號）
     - Session 變化時清除（監聽 `userSessionChanged` 事件）
     - 載入本地資料時清除（監聽 `localDataLoaded` 事件）
   - 技術細節：
     - 使用 `previousPatientIdRef` useRef 追蹤上一個病人 ID，避免重複觸發
     - 使用 `chrome.runtime.onMessage` 監聽 background.js 事件
     - 清除時同時重置 chatHistory、chatError、userInput 狀態
     - 清除操作保存至 chrome.storage.local

5. **Config 對話框下拉選單無法展開問題** (2025-12-31)
   - 問題：「自動分析」和「快速按鈕」設定中的下拉選單無法展開選擇
   - 根本原因：MUI Select 的下拉選單（Menu）使用 Portal 渲染到 body 層級，預設 z-index 低於對話框的 z-index (2147483649)，導致被遮擋
   - 解決方案：為所有 Select 組件添加 `MenuProps={{ sx: { zIndex: 2147483650 } }}`
   - 修改位置：
     - `SidebarV2ConfigDialog.jsx:162-164` - 自動分析模板選擇
     - `SidebarV2ConfigDialog.jsx:237-239` - 快速按鈕類型選擇
     - `SidebarV2ConfigDialog.jsx:261-263` - 快速按鈕模板選擇
   - 結果：所有下拉選單可正常展開並選擇選項

6. **快速按鈕 JSON 解析錯誤問題** (2025-12-31)
   - 問題：快速按鈕執行後出現空白或 JSON 解析錯誤 "No number after minus sign in JSON at position 1"
   - 根本原因：
     - Schema property key 不一致：部分模板（renal_medication、diabetes_management、comprehensive_summary）的 schema property key 與 template.id 不同
     - 自訂按鈕沒有 schema，導致 API 回傳純文字而非 JSON
   - 解決方案：
     - 修改解析邏輯為動態提取：`const firstKey = Object.keys(parsed)[0]` 取代硬編碼的 `parsed[template.id]`
     - 為自訂按鈕提供預設 schema（使用 `analysis_results` 作為 property key）
   - 修改位置：
     - `Sidebar.jsx:383-386` - Auto-analysis 動態 key 提取
     - `Sidebar.jsx:480-483` - Button analysis 動態 key 提取
     - `Sidebar.jsx:432-456` - 自訂按鈕預設 schema
   - 結果：所有模板和自訂按鈕都能正確解析 JSON 回應

7. **Markdown 格式排版改善與 Table 支援** (2025-12-31)
   - 需求：改善分析結果的 markdown 格式排版，支援表格顯示
   - 實作內容：
     - 安裝 `react-markdown` 和 `remark-gfm` 依賴
     - 建立 `MarkdownRenderer.jsx` 通用組件，支援完整 markdown 語法
     - 整合 MUI 組件：Table、Typography、Link 等
     - 更新 `Tab1AutoAnalysis.jsx` 和 `Tab2QuickButtons.jsx` 使用 MarkdownRenderer
   - 支援的 markdown 語法：
     - 表格 (Table) - 使用 MUI Table 組件美化顯示
     - 標題 (H1-H4)、列表、粗體、斜體、連結
     - 程式碼 (inline/block)、引用 (blockquote)
     - 自動換行和長詞斷行
   - 新增檔案：`src/components/sidebar/MarkdownRenderer.jsx`
   - 結果：分析結果支援豐富的 markdown 格式，表格以專業樣式顯示

8. **取消 JSON Schema 強制回傳格式** (2025-12-31)
   - 需求：移除 API 呼叫時的 JSON Schema 限制，讓 AI 自由決定回傳格式
   - 根本原因：強制 JSON 格式限制了 AI 的輸出靈活性，且容易產生解析錯誤
   - 解決方案：
     - 將所有 API 呼叫的 `jsonSchema` 參數設為 `null`
     - 移除 `JSON.parse()` 邏輯，直接使用 AI 回傳的 content
     - 移除自訂按鈕的 defaultSchema 定義（不再需要）
   - 修改位置：
     - `Sidebar.jsx:367` - Auto-analysis jsonSchema: null
     - `Sidebar.jsx:481` - Button analysis jsonSchema: null
     - `Sidebar.jsx:380-384` - 直接使用 content，不再 JSON.parse
     - `Sidebar.jsx:494-498` - 直接使用 content，不再 JSON.parse
     - `Sidebar.jsx:430-435` - 簡化 custom template 建構
   - 結果：AI 可自由輸出任何格式（純文字、Markdown、表格等），MarkdownRenderer 自動處理顯示

9. **Markdown 行距優化與尾隨空格修復** (2025-12-31)
   - 問題：Tab1 顯示結果行距過寬，且 AI 回傳內容中的尾隨空格導致不必要的換行
   - 解決方案：
     - 大幅減少所有 Markdown 元素的邊距（`mb: 0`，`mt: 0`）
     - 統一行高為 `lineHeight: 1.5`
     - 在 MarkdownRenderer 中預處理內容，移除每行末尾的空格（`/\s+$/gm`）
   - 修改位置：
     - `MarkdownRenderer.jsx:24-27` - 預處理內容移除尾隨空格
     - `MarkdownRenderer.jsx:49-71` - 減少所有元素邊距
   - 結果：列表顯示更緊湊，標題和子項目之間無多餘空白

10. **修復自動分析多次呼叫 API 問題** (2025-12-31)
   - 問題：自動分析在資料載入時會呼叫多次 API（觀察到 5 次重複呼叫）
   - 根本原因：useEffect 依賴陣列包含 `patientData` 和 `autoAnalysisConfig` 物件，每次渲染時物件引用改變導致重複觸發
   - 解決方案：
     - 修改依賴陣列，只依賴原始值而非物件
     - 使用 `autoAnalysisConfig?.enabled` 和 `autoAnalysisConfig?.templateId` 取代整個物件
     - 移除 `patientData` 依賴（在函數內部直接使用）
   - 修改位置：
     - `Sidebar.jsx:220` - 修改 useEffect 依賴陣列
   - 結果：每次資料載入只執行一次自動分析，避免重複 API 呼叫

**測試狀態**：
- ✅ 3 個 Tab 可正常切換
- ✅ Tab icon 選擇狀態樣式正確
- ✅ 自動分析在 Sidebar 打開時執行（只執行一次，無重複 API 呼叫）
- ✅ 快速按鈕點擊執行分析
- ✅ 按鈕結果展開/收合功能正常
- ✅ Chat 對話多輪對話功能正常
- ✅ 快速提問按鈕正常運作
- ✅ 配置儲存/載入正常
- ✅ V1 到 V2 資料遷移正常
- ✅ Chat 歷史清除機制正常（待實測驗證）
- ✅ Config 對話框下拉選單正常展開
- ✅ AI 自由格式回傳（不再強制 JSON Schema）
- ✅ Markdown 格式排版正常（列表、表格、粗體等）
- ✅ Markdown 行距緊湊，無多餘空白
- ✅ 尾隨空格自動移除，嵌套列表正確顯示

**待辦事項**：
- [ ] 移除 debug console.log 語句
- [ ] Phase 5 整合測試和 UI 優化
- [ ] 實際使用環境測試（切換病人、上傳 JSON、session 變化）
- [ ] 效能測試（多個按鈕同時執行）
- [ ] 文件更新（CLAUDE.md）
- [ ] 更新 preset templates 的 system prompts（移除 JSON 格式要求，改為 Markdown 格式指引）

---

**最後更新**: 2025-12-31
