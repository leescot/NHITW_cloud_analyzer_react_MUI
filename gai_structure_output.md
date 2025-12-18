# GAI Sidebar 功能規格書 (Functional Specification)

## 1. 概述 (Overview)
GAI Sidebar 是一個整合 OpenAI API 的功能模組，旨在自動分析病人的雲端病歷資料，並輸出結構化的醫療摘要與風險提示。此功能會在病人資料載入完成後自動執行分析，並將結果顯示於側邊欄中。

## 2. 系統架構與資料流 (Architecture & Data Flow)

### 2.1 資料觸發流程
1.  **資料載入**: `localDataHandler.js` 或 `Content Script` 攔截並解析 NHI 雲端資料。
2.  **狀態彙整**: `FloatingIcon.jsx` 收集各類資料（藥物、檢驗、影像等）並組合成 `patientData` 物件。
3.  **載入完成判定**: `FloatingIcon.jsx` 維護 `isDataLoaded` 狀態，當所有資料處理完畢後設為 `true`。
4.  **自動觸發**: `Sidebar.jsx` 監聽 `isDataLoaded` 與 `open` 狀態。若資料有效 (`hasValidData()`) 且尚未分析，則自動發送分析請求。

### 2.2 通訊架構
*   **前端 (Sidebar.jsx)**: 負責 UI 顯示、狀態管理、發送 `chrome.runtime.sendMessage`。
*   **後端 (Background.js)**: 負責安全存取 API Key、執行實際的 OpenAI API `fetch` 請求。
*   **API Key 儲存**: 使用 `chrome.storage.sync` 儲存，不暴露於前端 DOM。

## 3. OpenAI API 整合細節

### 3.1 模型設定
*   **API Endpoint**: `https://api.openai.com/v1/chat/completions`
*   **Model**: `gpt-5-mini`
*   **Temperature**: Default (1.0)
*   **Response Format**: JSON Schema (`strict: true`)

### 3.2 Prompt 結構
*   **System Prompt**:
    *   來源: 使用者於設定頁面自訂的 `gaiPrompt`。
    *   預設值: `DEFAULT_GAI_PROMPT` (由 `src/config/defaultSettings.js` 定義)。
*   **User Prompt**:
    *   來源: `src/utils/gaiCopyFormatter.js` 中的 `generateGAIFormatXML(patientData)`。
    *   內容: XML 格式化的病人完整資料字串。

### 3.3 Structured Output Schema
API 回傳嚴格定義的 JSON 物件，包含以下四個欄位：

```json
{
  "name": "medical_record_summary",
  "strict": true,
  "schema": {
    "type": "object",
    "properties": {
      "critical_alerts": {
        "type": "array",
        "items": { "type": "string" },
        "description": "最危險/最需要注意的點 (Most dangerous/urgent items)"
      },
      "medication_risks": {
        "type": "array",
        "items": { "type": "string" },
        "description": "用藥雷點 (Medication risks/contraindications)"
      },
      "abnormal_labs": {
        "type": "array",
        "items": { "type": "string" },
        "description": "近期異常檢驗 (Recent abnormal lab results)"
      },
      "imaging_findings": {
        "type": "array",
        "items": { "type": "string" },
        "description": "重要影像異常 (Important imaging findings)"
      }
    },
    "required": ["critical_alerts", "medication_risks", "abnormal_labs", "imaging_findings"],
    "additionalProperties": false
  }
}
```

## 4. UI 元件與狀態

### 4.1 設定頁面 (GAISettings.jsx)
*   **API Key 輸入**: 遮蔽式輸入框 (`type="password"`)，支援顯示/隱藏切換。
*   **儲存**: Key 儲存於 `chrome.storage.sync.openaiApiKey`。

### 4.2 FloatingIcon.jsx
*   **職責**: 資料中樞。
*   **Props**: 將 `patientData` 和 `isDataLoaded` 傳遞給 Sidebar。

### 4.3 Sidebar.jsx
*   **顯示區域**:
    1.  🔴 **危險/注意 (Critical Alerts)**: 紅色系樣式。
    2.  💊 **用藥雷點 (Medication Risks)**: 橘/黃色系樣式。
    3.  🧪 **異常檢驗 (Abnormal Labs)**: 藍色系樣式。
    4.  📸 **影像異常 (Imaging Findings)**: 灰色系樣式。
*   **狀態顯示**:
    *   **Waiting**: "等待資料載入後自動分析..." (資料未載入或資料為空)。
    *   **Analyzing**: Loading spinner + "正在分析病歷資料..."。
    *   **Success**: 顯示上述四個區塊。
    *   **Error**: 顯示錯誤訊息 (如 API Key 未設定、網路錯誤)。
*   **互動**:
    *   **重新分析**: Header 上的 Refresh 按鈕可強制重新執行分析。
    *   **收合**: 收合 Sidebar。

## 5. 驗證與測試 (Verification)
*   **自動觸發條件**: 需確認 `patientData` 非空 (使用 `hasValidData()` 檢查) 且 `isDataLoaded` 為 `true`。
*   **空資料處理**: 若 `isDataLoaded` 為 `true` 但資料為空，不應觸發 API 呼叫。
