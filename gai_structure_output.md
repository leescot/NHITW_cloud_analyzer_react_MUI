# GAI Sidebar 功能規格書 (Functional Specification) v2.1 - Gemini Support & Metrics

## 1. 概述 (Overview)
GAI Sidebar 是一個整合 GenAI API 的功能模組，旨在自動分析病人的雲端病歷資料，並輸出結構化的醫療摘要與風險提示。
此版本 (v2.1) 新增 **Google Gemini** 支援，允許使用者在 OpenAI 與 Gemini 之間切換，並提供透明的效能與成本指標顯示。

## 2. 系統架構 (System Architecture)

### 2.1 雙模組供應商架構 (Dual Provider Architecture)
系統核心支援兩種 AI Provider，由使用者設定決定路由。
*   **路由機制**: 前端 (`Sidebar.jsx`) 讀取 `chrome.storage.sync` 中的 `gaiProvider` 設定。
*   **預設值**: 若未設定，預設為 `openai`。
*   **Provider 選項**:
    1.  **OpenAI**:
        *   Model: `gpt-5-nano`
        *   Auth: `openaiApiKey` (Stored in browser sync storage)
    2.  **Google Gemini**:
        *   Model: `gemini-3-flash-preview`
        *   Auth: `geminiApiKey` (Stored in browser sync storage)

### 2.2 通訊與 Schema 適配 (Communication & Schema Adaptation)
為了適配不同 Provider 對於 Json Schema 的要求，`backgroud.js` 扮演適配層的角色。

*   **Config Source**: 所有 System Prompt 與 Schema 定義集中於 `src/config/gaiConfig.js`。
    *   定義格式遵循 OpenAI Structured Output 標準 (包覆 `strict: true` 與 `name`)。

*   **Request Mapping (Background.js)**:
    *   **OpenAI Request**:
        *   直接使用 config 中的 `jsonSchema` 物件。
        *   Payload: `response_format: { type: "json_schema", json_schema: message.jsonSchema }`
    *   **Gemini Request**:
        *   需提取 config 中的內部 Schema (`message.jsonSchema.schema`)。
        *   Payload: `generationConfig: { responseMimeType: "application/json", responseJsonSchema: message.jsonSchema.schema }`

### 2.3 效能指標計算 (Metrics Calculation)
為了監控 API 延遲與 Token 消耗，Backgroud Script 負責收集原始數據並回傳給前端。

*   **執行時間 (Duration)**:
    *   計算方式: `Date.now()` (Response Received) - `Date.now()` (Request Start)。
    *   單位: 毫秒 (ms)，前端顯示時轉換為秒 (s)。
*   **Token 用量 (Token Usage)**:
    *   **OpenAI**: 讀取 response 中的 `usage.total_tokens`。
    *   **Gemini**: 讀取 response 中的 `usageMetadata.totalTokenCount`。

## 3. API 整合細節 (API Integration Details)

### 3.1 OpenAI Integration
*   **Endpoint**: `https://api.openai.com/v1/chat/completions`
*   **Method**: `POST`
*   **Headers**: `Authorization: Bearer $OPENAI_API_KEY`
*   **Response Handling**:
    *   Content: `choices[0].message.content`
    *   Strict Mode: Enabled (`strict: true`) to ensure valid JSON output.

### 3.2 Google Gemini Integration
*   **Endpoint**: `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent`
*   **Method**: `POST`
*   **Query Param**: `key=$GEMINI_API_KEY`
*   **Payload Structure**:
    *   `systemInstruction`: 對應 OpenAI 的 System Prompt。
    *   `contents`: 對應 OpenAI 的 User Message。
*   **Response Handling**:
    *   Content: `candidates[0].content.parts[0].text`
    *   Normalization: Background script 封裝回傳格式，使其與 OpenAI 結構一致 (`data.choices[0].message.content`)，讓前端無須修改 Parsing 邏輯。

## 4. UI/UX 設計更新 (UI/UX Updates)

### 4.1 設定頁面 (GAISettings.jsx)
*   **Provider Selector**: 新增下拉選單 (Select) 切換 `AI 模型提供者`。
*   **Dynamic Input**:
    *   選擇 OpenAI 時顯示 "OpenAI API Key" 欄位。
    *   選擇 Gemini 時顯示 "Gemini API Key" 欄位。
*   **狀態提示**: 顯示當前使用的 Gemini 模型名稱 (`gemini-3-flash-preview`)。

### 4.2 分析結果顯示 (Sidebar.jsx)
*   **列表式呈現**: 針對 4 個類別 (Alerts, Meds, Labs, Imaging) 分頁顯示。
*   **Metrics Footer**:
    *   在每個分析結果列表的最下方，自動附加效能統計資訊。
    *   顯示格式: `(Total_tokens: {count}, 執行時間: {seconds}s)`
    *   目的: 提供使用者即時的成本(Token)與效能(Time)回饋。

### 4.3 Logging (Console)
*   **Frontend Console**:
    *   印出完整 API Response JSON 物件，方便開發者除錯。
    *   Log Format: `[GAI Analysis - {key}] Response: {object}`
*   **Background Console**:
    *   折疊式群組 Log (`console.groupCollapsed`)。
    *   包含: `Duration`, `Model`, `Token Usage`, `Full Response Body`.

## 5. 驗證情境 (Verification Scenarios)
1.  **切換 Provider**: 設定為 Gemini，執行分析，確認請求發送至 Google Host。
2.  **Schema 驗證**: 確認 Gemini 回傳的 JSON 結構正確 (如 `critical_items` 陣列)，無 Hallucination 或格式錯誤。
3.  **Metrics 顯示**: 確認 UI 底部正確顯示非零的 Token 數與秒數。
4.  **混合相容性**: 切換回 OpenAI，確認原有功能運作正常，且同樣顯示 Metrics。
