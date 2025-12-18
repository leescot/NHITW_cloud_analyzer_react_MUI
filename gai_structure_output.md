# GAI Sidebar 功能規格書 (Functional Specification) v2.0 - Optimized

## 1. 概述 (Overview)
GAI Sidebar 是一個整合 OpenAI API 的功能模組，旨在自動分析病人的雲端病歷資料，並輸出結構化的醫療摘要與風險提示。
此版本 (v2.0) 針對效能與使用者體驗進行優化，採用 **平行處理架構** 與 **gpt-5-nano** 模型，並提供分頁式 (Tabbed) 的 UI 呈現。

## 2. 系統架構與資料流 (Architecture & Data Flow)

### 2.1 平行處理架構 (Parallel Processing)
為了加速回應時間並提高分析精確度，系統將單一龐大的分析任務拆分為四個獨立的平行 API 請求：
1.  **Critical Alerts (危險/注意)**
2.  **Medication Risks (用藥雷點)**
3.  **Abnormal Labs (異常檢驗)**
4.  **Imaging Findings (影像異常)**

各個請求擁有獨立的狀態管理（Loading, Error, Success），使用者可在部分結果回傳時即時查看，無需等待所有分析完成。

### 2.2 資料觸發流程
1.  **資料載入**: NHI 雲端資料載入完成 (`isDataLoaded=true`)。
2.  **有效性檢查**: `Sidebar.jsx` 檢查 `hasValidData()`。
3.  **自動並行觸發**: 觸發 `handleAnalyze`，同時發送 4 個 `chrome.runtime.sendMessage` 請求給 Background Script。

### 2.3 通訊架構
*   **前端 (Sidebar.jsx)**: 負責 UI (Tabs) 顯示、獨立狀態管理。
*   **後端 (Background.js)**: 通用型 API Handler，接收 `model` 與 `json_schema` 參數，不再硬編碼 Schema。
*   **配置 (gaiConfig.js)**: 集中管理 4 個任務的 `System Prompt` 與 `JSON Schema`。

## 3. OpenAI API 整合細節

### 3.1 模型設定
*   **Model**: `gpt-5-nano` (優化速度與成本)
*   **Mode**: Parallel Async Requests (4 concurrent calls)
*   **Response Format**: JSON Schema (`strict: true`)

### 3.2 Prompt 設計
*   **System Prompt**:
    *   針對四個任務分別客製化 (定義於 `src/config/gaiConfig.js`)。
    *   **語言要求**: 強制要求輸出 **繁體中文 (zh-TW)**。
    *   **用語要求**: 使用 **台灣醫師習慣的醫療用語**。
*   **User Prompt**:
    *   來源: `generateGAIFormatXML(patientData)` (XML 格式化病歷)。

### 3.3 Structured Output Schema
Schema 已拆分為四個獨立定義，詳見 `src/config/gaiConfig.js`。每個 Schema 僅關注其特定領域的回傳欄位。

## 4. UI 元件與狀態 (v2.0)

### 4.1 Sidebar.jsx (Tabbed Data Display)
介面由垂直列表改為 **分頁 (Tabs)** 設計，以容納大量文字內容。

*   **Tabs**:
    1.  🔴 **注意 (Alerts)**: 危險/注意警示 (Badge: Error Color)。
    2.  💊 **用藥 (Meds)**: 用藥雷點 (Badge: Warning Color)。
    3.  🧪 **檢驗 (Labs)**: 異常檢驗 (Badge: Info Color)。
    4.  📸 **影像 (Imaging)**: 影像異常 (Badge: Error Color)。
*   **Badge System**: 每個 Tab 上方顯示紅點/色點，提示該類別是否有分析結果，方便醫師快速掃描。
*   **Scrollable Content**: 每個 Tab 內容區域獨立捲動，避免畫面過長。

### 4.2 狀態顯示
每各類別獨立顯示狀態：
*   **Loading**: 該分頁顯示 Spinner。
*   **Error**: 該分頁顯示錯誤訊息與重試按鈕。
*   **Empty**: 顯示無異常發現的提示文字。

## 5. 設定頁面 (GAISettings.jsx)
*   基本功能維持不變 (API Key 管理)。
*   Prompt 編輯功能目前主要用於測試，實際運作依賴 `gaiConfig.js` 的硬編碼優化 Prompt。

## 6. 驗證 (Verification)
*   確認 4 個 API 並行發送 (Chrome Network Tab)。
*   確認 Sidebar Tabs 顯示正確，且 Badge 顏色醒目 (尤其是影像 Badge 應為紅色)。
*   確認輸出內容為繁體中文且符合台灣醫療慣用語。
