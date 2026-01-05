# GAI 系統完整技術文件

**版本**: 2.3
**最後更新**: 2026-01-05
**文件狀態**: 完整整合版本

---

## 目錄

1. [系統概述](#1-系統概述)
2. [當前架構 (V2)](#2-當前架構-v2)
3. [核心功能](#3-核心功能)
4. [AI 提供者系統](#4-ai-提供者系統)
5. [Sidebar Tab 系統](#5-sidebar-tab-系統)
6. [資料處理流程](#6-資料處理流程)
7. [技術實作細節](#7-技術實作細節)
8. [開發指南](#8-開發指南)
9. [故障排除](#9-故障排除)
10. [變更歷史](#10-變更歷史)

---

## 1. 系統概述

### 1.1 GAI 是什麼

GAI (Generative AI) 是 Chrome Extension 的核心特色之一，提供自動化的病歷分析與風險評估。系統採用模組化架構，支援多 AI 提供者，可執行靈活的醫療摘要分析。

### 1.2 主要特點

- **多 AI 提供者支援**: OpenAI、Google Gemini、Groq、Cerebras (4 個提供者)
- **三 Tab 設計** (V2 架構，2025-12-31 起):
  - **Tab 1 - 自動分析**: Sidebar 打開時自動執行 1 個使用者選擇的分析
  - **Tab 2 - 快速按鈕**: 6 個可配置的分析按鈕，點擊後執行
  - **Tab 3 - Chat 對話**: 與醫療資料進行多輪對話
- **選擇性資料傳輸**: 可選擇傳送 10 種醫療資料類型的任意組合
- **Token 估算**: 呼叫前估算 token 用量（針對繁體中文優化）
- **即時分析結果顯示**: 完整 Markdown 支援（列表、表格、粗體等）
- **雙 API Key 輪流**: 分擔流量、避免 Rate Limit
- **BETA 標記**: 介面顯示 BETA 標籤，提醒使用者功能仍持續優化中

### 1.3 系統架構圖

```
使用者設定 (GAISettings.jsx)
    ↓ (API Keys, Provider Selection)
Chrome Storage Sync
    ↓
病患資料 → 資料掛載 (FloatingIcon.jsx)
    ↓
Sidebar V2 (三 Tab 設計)
    ├─ Tab 1: 自動分析 (單一模板，自動執行)
    ├─ Tab 2: 快速按鈕 (6 個可配置按鈕)
    └─ Tab 3: Chat 對話 (多輪對話 + 快速提問)
         ↓ (使用者互動)
    根據 Tab 選擇資料類型 → generateSelectiveXML()
         ↓ (chrome.runtime.sendMessage)
Background.js (callGAI)
    ↓ (Provider Registry)
    ├─→ OpenAIProvider
    ├─→ GeminiProvider
    ├─→ GroqProvider
    └─→ CerebrasProvider
         ↓ (HTTP Request with Token Estimation)
AI Provider API
    ↓ (Response + Rate Limit Headers)
Provider (formatResponse & Rate Limit Monitoring)
    ↓ (Standardized Response)
Background.js (sendResponse)
    ↓
Sidebar 更新對應 Tab 的 state
    ↓
顯示結果於 UI (Markdown 渲染，可圈選複製)
```

---

## 2. 當前架構 (V2)

### 2.1 V2 架構概述

**實作日期**: 2025-12-31
**重大變更**: 從動態 4 Tab 改為固定功能 3 Tab

#### V1 vs V2 對比

| 項目 | V1 (舊架構) | V2 (當前架構) |
|------|------------|--------------|
| **Tab 數量** | 4 個動態 Tab | 3 個固定功能 Tab |
| **Tab 配置** | 每個 Tab 可配置為不同模板 | Tab 1: 自動分析<br>Tab 2: 快速按鈕 (6 個)<br>Tab 3: Chat 對話 |
| **狀態管理** | `tabConfigs` 陣列<br>`analysisResults` 物件 (key 為 templateId) | 每個 Tab 獨立狀態<br>子組件化設計 |
| **執行方式** | 全部 Tab 同時執行分析 | Tab 1: 自動<br>Tab 2: 手動點擊<br>Tab 3: 對話式 |
| **自訂功能** | 1 個自訂 Tab (slot 3) | Tab 2: 6 個自訂/預設混合按鈕<br>Tab 3: 可配置快速提問 |

### 2.2 Chrome Storage 結構 (V2)

```javascript
// V2 版本標記
gaiSidebarConfigVersion: 2

// Tab 1 配置
gaiAutoAnalysisConfig: {
  templateId: 'atc_classification',  // 從 7 個預設模板選擇
  enabled: true                       // 是否啟用自動分析
}

// Tab 2 配置（6 個按鈕）
gaiQuickButtonsConfig: [
  {
    slotIndex: 0,                    // 按鈕位置 (0-5)
    type: 'preset',                  // 'preset' | 'custom'
    templateId: 'medication_risks',  // preset 時使用
    customConfig: null,              // custom 時使用
    label: '用藥風險',
    icon: 'Medication',
    enabled: true
  },
  // ... 最多 6 個按鈕
]

// Tab 3 配置（Chat）
gaiChatConfig: {
  systemPrompt: '你是專業的醫療AI助理...',
  dataTypes: ['diagnosis', 'patientSummary', ...],  // 全部 10 種
  quickQuestions: ['請摘要重點', '有哪些異常需要注意？', ...],
  enableHistory: true,
  maxHistoryLength: 5                // 已調校為 5 輪，兼顧脈絡與效能
}

// Chat 歷史（存在 chrome.storage.local，不同步）
gaiChatHistory: [
  { role: 'user', content: '...', timestamp: '...' },
  { role: 'assistant', content: '...', timestamp: '...', metadata: {...} }
]
```

### 2.3 預設模板系統

系統提供 **7 種預設模板**，分為 3 個類別：

#### 基礎分析類（4 種）

| ID | 名稱 | 資料類型 | 用途 |
|----|------|---------|------|
| `drug_interaction` | 藥物交互作用 | patientSummary, allergy, medication, lab, hbcvdata | 辨識藥物間的相互作用 |
| `abnormal_labs` | 檢驗異常值 | lab | 列出近期異常檢驗數值 (TL;DR 格式) |
| `imaging_findings` | 影像重點 | imaging | 摘要影像報告重要發現 (粗體標註異常) |
| `atc_classification` | 藥品 ATC 分類 | medication | WHO ATC 2025 規則分類，Table 格式 |

#### 專科分析類（2 種）

| ID | 名稱 | 資料類型 | 用途 |
|----|------|---------|------|
| `renal_medication` | 腎功能用藥 | lab, medication, patientSummary | 分析腎功能與用藥安全性、劑量調整 |
| `diabetes_management` | 糖尿病管理 | lab, medication, patientSummary | 綜合分析血糖控制與用藥 |

#### 進階分析類（1 種）

| ID | 名稱 | 資料類型 | 用途 |
|----|------|---------|------|
| `comprehensive_summary` | 綜合摘要 | diagnosis, patientSummary, allergy, medication, lab, imaging, discharge | 產生門診前病歷摘要 |

**模板結構**：
```javascript
{
  id: 'atc_classification',
  name: '藥品 ATC 分類',
  icon: 'Category',
  category: 'advanced',
  description: '依 WHO ATC 2025 規則進行藥物分類',
  dataTypes: ['medication'],
  systemPrompt: '你是藥理分類專家 AI...',
  schema: null  // V2 不再強制 JSON Schema
}
```

---

## 3. 核心功能

### 3.1 Tab 1 - 自動分析

**功能描述**：
- Sidebar 打開時自動執行 **1 個** 使用者選擇的分析
- 只執行一次，避免重複 API 呼叫

**配置介面**：
- 從 7 個預設模板中選擇 1 個
- 啟用/停用開關
- 顯示所選模板的資料類型

**實作細節**：
```javascript
// src/components/sidebar/Tab1AutoAnalysis.jsx
// Props: config, result, loading, error, onRetry
// 顯示：Loading 狀態 → 結果列表 → 錯誤 + 重試
```

### 3.2 Tab 2 - 快速按鈕

**功能描述**：
- 6 個可配置的分析按鈕
- 每個按鈕可選擇：預設模板 或 自訂配置
- 點擊按鈕執行分析，結果展開/收合

**配置介面**：
- 6 個按鈕槽位
- 每個槽位：類型選擇 (preset/custom)、模板選擇、啟用開關
- 自訂按鈕編輯器：名稱、資料類型選擇、System Prompt 編輯

**實作細節**：
```javascript
// src/components/sidebar/Tab2QuickButtons.jsx
// Props: buttons, results, loadings, errors, onButtonClick
// 按鈕網格 (上方) + 共享結果區域 (下方)
// 點擊執行 → 高亮選中 → 顯示結果
```

**佈局設計**：
- **上方**: 2x3 按鈕網格（Grid 佈局）
- **下方**: 共享結果顯示區域（統一樣式）
- 選中按鈕：Primary 邊框 + 淺藍背景
- 結果區域：自動滾動到視圖

### 3.3 Tab 3 - Chat 對話

**功能描述**：
- 與醫療資料進行多輪對話
- 快速提問按鈕（可配置）
- 對話歷史保存（session 內，最多 10 輪）

**配置介面**：
- System Prompt 多行編輯
- 快速提問列表管理（新增/編輯/刪除）
- 對話歷史開關 + 最大保存數量設定

**實作細節**：
```javascript
// src/components/sidebar/Tab3Chat.jsx
// Props: config, history, loading, error, userInput, onInputChange, onSendMessage, onQuickQuestion
// 快速提問 Chips → 對話訊息列表 → 輸入框 + 傳送按鈕
```

**UI 設計**：
- **全寬區塊式設計**：移除傳統左右對話框限制
- **左側色條區分**：使用者（藍色）vs AI（灰色）
- **標籤系統**：User/AI 標籤 + metadata（tokens、執行時間）
- **Markdown 支援**：完整支援表格、列表、粗體、連結等

**Chat 歷史清除機制**：
- 載入新資料時清空
- 病人變化時清空（追蹤病歷號/身分證號）
- Session 變化時清空（監聽 `userSessionChanged` 事件）
- 載入本地資料時清空（監聽 `localDataLoaded` 事件）

---

## 4. AI 提供者系統

### 4.1 Provider Registry 架構

```
src/services/gai/providers/
├── BaseProvider.js          (抽象基礎類別)
├── OpenAIProvider.js        (OpenAI 實作)
├── GeminiProvider.js        (Google Gemini 實作)
├── GroqProvider.js          (Groq 實作)
├── CerebrasProvider.js      (Cerebras 實作)
├── providerRegistry.js      (提供者註冊管理)
└── index.js                 (統一匯出介面)
```

### 4.2 提供者比較表

| Provider | 速度 | 成本 | Rate Limit (Free) | 推薦場景 |
|----------|------|------|-------------------|----------|
| **OpenAI** | 中等 | 較高 | - | 最高準確度需求 |
| **Gemini** | 較快 | 較低 | - | 大量分析、成本敏感 |
| **Groq** | 極快 | 免費 | 30 RPM, 6K TPM | 快速測試（受限於 Token Limit） |
| **Cerebras** | 極快 | 免費/付費 | 30 RPM, 60K TPM | 醫療分析平衡選擇（推薦） |

**技術細節**：

| 項目 | OpenAI | Gemini | Groq | Cerebras |
|------|--------|--------|------|----------|
| **預設模型** | gpt-5-nano | gemini-3-flash-preview | llama-3.3-70b-versatile | llama-3.3-70b-versatile |
| **Max Tokens** | 預設 4096 | 預設 4096 | 16,384 (推理模型) | 32,768 (推理模型) |
| **Schema 支援** | json_schema (strict) | responseJsonSchema | json_object (基礎) | json_object (基礎) |
| **System Prompt** | messages[0].role="system" | systemInstruction | messages[0].role="system" | messages[0].role="system" |
| **回應格式** | OpenAI 原生 | 需轉換為 OpenAI 格式 | OpenAI 相容 | OpenAI 相容 |

### 4.3 雙 API Key 輪流功能

**功能目的**：分擔 API 呼叫流量、避免 Rate Limit

**Storage 結構**（以 OpenAI 為例）：
```javascript
{
  openaiApiKey: 'sk-xxx',              // 第一個 API Key
  openaiApiKey2: 'sk-yyy',             // 第二個 API Key (選填)
  openaiDualKeyEnabled: false,         // 是否啟用雙 Key 模式
  openaiLastKeyIndex: 0                // 上次使用的 Key 索引 (0 或 1)
}
```

**核心技術 - Mutex 機制**：
```javascript
// BaseProvider.js
class BaseProvider {
    constructor(config) {
        this._keyRotationQueue = Promise.resolve(); // Mutex
    }

    async getNextApiKey() {
        const previousQueue = this._keyRotationQueue;
        let unlockNext;
        this._keyRotationQueue = new Promise(resolve => { unlockNext = resolve; });

        try {
            await previousQueue;  // 等待前一個操作完成
            // 執行 key rotation（讀取 → 計算 → 寫入）
            const nextIndex = lastIndex === 0 ? 1 : 0;
            await chrome.storage.sync.set({ lastKeyIndex: nextIndex });
            return { key: nextKey, keyIndex: nextIndex };
        } finally {
            unlockNext();  // 釋放鎖
        }
    }
}
```

**效能分析**：
- Mutex 鎖定時間：~5ms/次（僅鎖定 Key 選擇）
- API 呼叫：仍然並行執行（不受影響）
- 4 個並發呼叫範例：Key 1 → Key 2 → Key 1 → Key 2（完美輪流）

### 4.4 推理模型 (Reasoning Models) 支援

**特點**：
- Groq 和 Cerebras 支援推理模型（如 `llama-3.3-70b-versatile`）
- 推理模型會輸出思考過程（`<think>` 標籤）
- 需要更高的 Token Limit（16,384 - 32,768）

**實作細節**：
1. **Token 限制提升**：
   - CerebrasProvider: `defaultMaxTokens: 32768`
   - GroqProvider: `defaultMaxTokens: 16384`

2. **推理內容提取**：
   - 自動備援機制：優先使用 `response.data.reasoning` 欄位
   - 若無 `reasoning` 欄位，則從 `content` 中提取

3. **UI 優化**：
   - 新增截斷警告標記
   - 自動過濾 `<think>` 標籤（清理後顯示）

---

## 5. Sidebar Tab 系統

### 5.1 V2 組件架構

```
src/components/Sidebar.jsx (主組件)
├── Tab1AutoAnalysis.jsx        (自動分析顯示)
├── Tab2QuickButtons.jsx        (快速按鈕 + 結果)
├── Tab3Chat.jsx                (Chat 對話)
├── SidebarV2ConfigDialog.jsx  (配置對話框)
└── CustomButtonEditor.jsx     (自訂按鈕編輯器)
```

### 5.2 配置對話框 (SidebarV2ConfigDialog)

**功能**：
- 3 個 Tab 對應 3 個配置區域
- Tab 1: 模板選擇下拉選單 + 啟用開關 + 資料類型顯示
- Tab 2: 6 個按鈕槽位配置（摺疊式設計）
- Tab 3: System Prompt 編輯 + 快速提問管理

**UI 設計**：
- Grid 與 Card 導向的現代化設計
- 點擊展開的摺疊式槽位編輯（縮短視覺長度）
- z-index 層級優化（2147483649）確保顯示在最上層
- Select Menu z-index: 2147483650（確保下拉選單可展開）

### 5.3 自訂按鈕編輯器 (CustomButtonEditor)

**功能**：
- 按鈕名稱輸入
- 資料類型選擇（10 種，使用 Chip 多選）
- System Prompt 多行編輯
- z-index: 2147483650（高於配置對話框）

---

## 6. 資料處理流程

### 6.1 10 種醫療資料類型

系統支援 **10 種醫療資料類型**的選擇性傳輸：

| ID | 中文名稱 | 圖示 | 分類 | 說明 |
|----|---------|------|------|------|
| `diagnosis` | 診斷/收案 | Assignment | diagnosis | 就醫診斷、專科收案、疫苗記錄 |
| `medication` | 西藥記錄 | Medication | medication | 近期處方用藥（含 ATC 碼） |
| `chinesemed` | 中藥記錄 | Spa | medication | 中醫處方用藥 |
| `lab` | 檢驗記錄 | Science | lab | 實驗室檢驗數值 |
| `imaging` | 影像報告 | ImageSearch | imaging | 影像學檢查報告（去個資化） |
| `surgery` | 手術記錄 | LocalHospital | history | 外科手術記錄 |
| `discharge` | 住院記錄 | BedroomBaby | history | 住院出院記錄 |
| `allergy` | 過敏史 | HealthAndSafety | basic | 藥物過敏記錄 |
| `hbcvdata` | BC肝資料 | Coronavirus | lab | B型、C型肝炎檢驗資料 |
| `patientSummary` | 備註資料 | Person | basic | 雲端註記資料、基本資訊 |

**新增功能亮點**：

1. **診斷/收案資料 (diagnosis)**：
   - 獨立處理邏輯 (`diagnosisProcessor.js`)
   - 從西藥、中藥、備註資料中提取診斷、疫苗及收案資訊
   - 在 UI 選擇器中顯示在第一個位置

2. **藥品 ATC 碼整合**：
   - `medicationProcessor.js` 提取 `atc_code` 欄位
   - `formatMedication()` 包含 ATC 碼於 XML 輸出
   - 支援藥理分類分析（新增「藥品 ATC 分類」模板）

3. **影像報告去個資化**：
   - `piiUtils.js` 實作進階正則表達式匿名化邏輯
   - **全面遮罩**: 自動去除病患、醫護人員 (醫師、放射師、護理師)、系統編號及證照號碼
   - **多醫院格式支援**: 針對 **臺北榮總 (VGH)**、**西園醫院** 提供深度優化，支援各類特定醫師稱謂與報告表頭
   - **證照保護**: 偵測並遮罩各類醫字號、專科證照號碼 (如放診專字、**病解專醫字**) 及 No. 格式
   - **分類處理**: `PiiPatterns` 類別支援按類別 (patient/staff/system) 取得特定模式

### 6.2 資料選擇器 (Data Selector)

**位置**: `src/utils/dataSelector.js`

**核心函數**：
```javascript
export const generateSelectiveXML = (patientData, selectedDataTypes) => {
  // 根據 selectedDataTypes 陣列，選擇性呼叫對應的格式化函數
  let xmlText = `這是一位 ${age} 歲的 ${gender} 性病人，以下是病歷資料\n\n`;

  selectedDataTypes.forEach(dataType => {
    const formatter = FORMATTER_MAP[dataType];  // 從 gaiCopyFormatter 匯入
    const data = patientData[DATA_KEY_MAP[dataType]];
    if (data && formatter) {
      xmlText += formatter(data);
    }
  });

  return xmlText;
};
```

**優勢**：
- **Token 節省**：專科分析只需傳送 2-3 種資料，節省 30-70% tokens
- **精準分析**：AI 不會被無關資料干擾
- **彈性組合**：可自由選擇 10 種資料的任意組合

### 6.3 Markdown 渲染系統

**組件**: `src/components/sidebar/MarkdownRenderer.jsx`

**支援的 Markdown 語法**：
- **表格** (Table) - 使用 MUI Table 組件美化顯示
- **標題** (H1-H4)、列表（有序/無序）
- **粗體**、斜體、連結
- **程式碼** (inline/block)、引用 (blockquote)
- 自動換行和長詞斷行

**格式清理邏輯**：
```javascript
// Sidebar.jsx - cleanMarkdownContent()
const cleanMarkdownContent = (content) => {
  return content
    .replace(/\s+$/gm, '')                      // 移除行尾空格（包括兩個空格強制換行）
    .replace(/\n{3,}/g, '\n\n')                 // 壓縮 3+ 個連續空行為 2 個
    .replace(/(\n-\s.*)\n+(?=-\s)/g, '$1\n')   // 移除列表項目之間的多餘空行
    .replace(/(\n\|.*\|.*\n)/g, '\n$1\n');     // 確保表格前後有空行
};
```

**樣式優化**：
- 行高：`lineHeight: 1.1`（極度緊湊）
- 列表項目邊距：`mb: 0`（最小化間距）
- 表格：水平滾動支援（`overflowX: 'auto'`）
- 段落：`m: 0`（所有方向零邊距）

---

## 7. 技術實作細節

### 7.1 Token 估算系統

**位置**: `src/services/gai/tokenCounter.js`

**估算規則**（針對繁體中文優化）：

| 文本類型 | 估算係數 | 說明 |
|----------|---------|------|
| 繁體中文字符 | 2.5 tokens/字 | 包含常用漢字、擴展 A/B 區 |
| 英文單詞 | 1.3 tokens/詞 | 連續字母視為一個單位 |
| 數字組 | 1.2 tokens/組 | 包含小數點的數字 |
| 標點符號 | 1.0 tokens/字符 | 各種標點與特殊字符 |
| 空白字符 | 0.5 tokens/字符 | 空格、換行等 |

**估算公式**：
```javascript
estimatedTokens = Math.ceil(
    chineseChars × 2.5 +
    englishWords × 1.3 +
    numberGroups × 1.2 +
    punctuation × 1.0 +
    whitespace × 0.5
)
```

**Console 輸出範例**：
```
================================================================================
🔢 [Cerebras Token Estimation]
================================================================================
📊 Model: llama-3.3-70b-versatile
📝 System Prompt: 345 tokens
💬 User Prompt: 7.85K tokens
📈 Total (System + User): 8.20K tokens
⚠️  Note: 此為估算值，實際用量可能有 ±20% 誤差
================================================================================
```

### 7.2 完整資料流程

```
1. 使用者開啟 Sidebar
   ↓
2. V2 配置載入
   - loadAutoAnalysisConfig()
   - loadQuickButtonsConfig()
   - loadChatConfig()
   ↓
3. 渲染 3 個 Tab UI
   ↓
4. Tab 1 自動分析觸發（如果 enabled）
   - 只執行一次（防護：hasAnalyzed flag）
   - 取得 template
   - generateSelectiveXML(patientData, template.dataTypes)
   - runAutoAnalysis(template, xmlData, provider)
   ↓
5. 使用者點擊 Tab 2 按鈕
   - runButtonAnalysis(buttonConfig)
   - generateSelectiveXML(patientData, buttonConfig.dataTypes)
   - chrome.runtime.sendMessage({ action: 'callGAI', ... })
   ↓
6. 使用者在 Tab 3 輸入訊息
   - sendChatMessage(message)
   - 組合對話歷史到 user prompt
   - generateSelectiveXML(patientData, ALL_10_DATA_TYPES)
   - chrome.runtime.sendMessage({ action: 'callGAI', jsonSchema: null })
   ↓
7. background.js 處理請求
   - getProvider(providerId)
   - logTokenEstimation(systemPrompt, userPrompt)
   - getNextApiKey() (雙 Key 輪流)
   - provider.callAPI(...)
   ↓
8. AI Provider 處理
   - OpenAI/Gemini/Groq/Cerebras API 呼叫
   - Rate Limit 監控
   - 回應格式標準化
   ↓
9. Sidebar 接收回應
   - cleanMarkdownContent(content)
   - 更新對應 state (autoAnalysisResult / buttonResults / chatHistory)
   ↓
10. UI 渲染
    - MarkdownRenderer 渲染內容
    - 支援表格、列表、粗體、連結等
    - 顯示 metadata（tokens、執行時間、Key 索引）
```

### 7.3 錯誤處理與重試機制

**錯誤類型**：
1. **API Key 未設定**：顯示錯誤訊息，提示前往設定頁面
2. **HTTP 錯誤** (401, 429, 500, etc.)：解析錯誤訊息並顯示
3. **JSON 解析失敗**：直接顯示原始內容（V2 已移除強制 JSON Schema）
4. **Rate Limit 超限**：顯示等待時間與剩餘配額

**重試按鈕**：
- Tab 1: 錯誤訊息下方顯示「重試」按鈕
- Tab 2: 每個按鈕獨立錯誤處理
- Tab 3: 錯誤訊息附加在對話歷史中

### 7.4 效能優化

**已實作優化**：
1. **防止重複 API 呼叫**：
   - Tab 1 使用 `hasAnalyzed` flag
   - useEffect 依賴陣列只包含原始值（避免物件引用變化）

2. **選擇性資料傳輸**：
   - 專科分析節省 30-70% tokens
   - 使用 `dataSelector.generateSelectiveXML()`

3. **並行處理**：
   - Tab 2 多個按鈕可同時執行（獨立狀態）
   - 雙 API Key 輪流（Mutex 機制確保原子性）

4. **Markdown 格式清理**：
   - 預處理移除多餘空格和空行
   - 減少渲染負擔

---

## 8. 開發指南

### 8.1 新增 AI 提供者

**步驟**（預估 1-2 小時）：

1. **建立 Provider 類別**（約 80-150 行）：
```javascript
// src/services/gai/providers/ClaudeProvider.js
import BaseProvider from './BaseProvider.js';

class ClaudeProvider extends BaseProvider {
  constructor() {
    super({
      id: 'claude',
      name: 'Anthropic Claude',
      apiKeyStorageKey: 'claudeApiKey',
      defaultModel: 'claude-3-5-sonnet-20241022'
    });
  }

  async callAPI(systemPrompt, userPrompt, jsonSchema, options = {}) {
    const { key, keyIndex } = await this.getNextApiKey();

    // Claude API 實作...
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': key,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: options.model || this.config.defaultModel,
        system: systemPrompt,
        messages: [{ role: 'user', content: userPrompt }],
        max_tokens: options.max_tokens || 4096
      })
    });

    // 處理回應...
    return this.formatResponse(data, keyIndex);
  }
}

export default ClaudeProvider;
```

2. **註冊 Provider**（約 2 行）：
```javascript
// src/services/gai/providers/providerRegistry.js
import ClaudeProvider from './ClaudeProvider.js';

registerProvider(new ClaudeProvider());
```

3. **完成！** UI 和 background.js 自動整合

### 8.2 新增分析模板

**步驟**（預估 30 分鐘）：

1. **編輯預設模板**（約 30-40 行）：
```javascript
// src/services/gai/tabs/presetTemplates.js
export const PRESET_TEMPLATES = {
  // 現有模板...

  my_custom_analysis: {
    id: 'my_custom_analysis',
    name: '我的自訂分析',
    icon: 'AutoAwesome',             // MUI Icon 名稱
    category: 'specialized',          // 'basic' | 'specialized' | 'advanced'
    description: '自訂分析描述',
    dataTypes: ['medication', 'lab', 'diagnosis'],  // 從 10 種選擇
    systemPrompt: `你是專業的醫療AI助理。請分析以下病歷資料...`,
    schema: null  // V2 不再強制 JSON Schema
  }
};
```

2. **完成！** 模板自動出現在配置對話框的下拉選單中

### 8.3 新增醫療資料類型

**步驟**（預估 1 小時）：

1. **定義元數據**：
```javascript
// src/config/dataTypeMetadata.js
export const DATA_TYPE_METADATA = {
  // 現有類型...

  new_data_type: {
    id: 'new_data_type',
    label: '新資料類型',
    icon: 'NewIcon',
    color: '#1976d2',
    category: 'basic',  // 'basic' | 'history' | 'medication' | 'lab' | 'imaging' | 'diagnosis'
    description: '新資料類型說明'
  }
};
```

2. **實作格式化函數**：
```javascript
// src/utils/gaiCopyFormatter.js
export const formatNewDataType = (data) => {
  if (!data || data.length === 0) {
    return '<newDataType>\n(無資料)\n</newDataType>\n\n';
  }

  let text = '<newDataType>\n';
  // 格式化邏輯...
  text += '</newDataType>\n\n';
  return text;
};
```

3. **註冊到 Data Selector**：
```javascript
// src/utils/dataSelector.js
const FORMATTER_MAP = {
  // 現有映射...
  new_data_type: formatNewDataType
};

const DATA_KEY_MAP = {
  // 現有映射...
  new_data_type: 'newDataTypeData'  // 對應 patientData 中的 key
};
```

4. **在資料掛載點傳遞資料**：
```javascript
// src/components/FloatingIcon.jsx
const [patientData, setPatientData] = useState({
  // 現有資料...
  newDataTypeData: []
});

// 在資料載入邏輯中處理新資料類型...
```

### 8.4 測試檢查清單

**功能測試**：
- [ ] 3 個 Tab 可正常切換
- [ ] Tab 1 自動分析執行（只執行一次）
- [ ] Tab 2 按鈕點擊執行分析
- [ ] Tab 2 結果展開/收合
- [ ] Tab 3 Chat 多輪對話
- [ ] Tab 3 快速提問按鈕
- [ ] 配置儲存/載入
- [ ] Markdown 格式正確顯示（列表、表格、粗體）
- [ ] 錯誤處理與重試
- [ ] 雙 API Key 輪流（如啟用）

**效能測試**：
- [ ] 自動分析不重複呼叫 API
- [ ] 多個按鈕同時執行不衝突
- [ ] Chat 歷史清除機制正常
- [ ] Token 估算準確度（±20% 範圍內）

**相容性測試**：
- [ ] V1 到 V2 資料遷移正常
- [ ] 舊使用者配置自動轉換
- [ ] 不同 AI 提供者切換正常

---

## 9. 故障排除

### 9.1 常見問題

**Q1: 自動分析執行多次（重複 API 呼叫）**

**原因**：useEffect 依賴陣列包含物件引用，導致每次渲染時重複觸發

**解決方案**：
```javascript
// ❌ 錯誤
useEffect(() => {
  // ...
}, [patientData, autoAnalysisConfig]);

// ✅ 正確
useEffect(() => {
  // ...
}, [open, isDataLoaded, hasAnalyzed, autoAnalysisConfig?.enabled, autoAnalysisConfig?.templateId]);
```

---

**Q2: Markdown 列表行距過寬**

**原因**：AI 回傳內容包含兩個空格強制換行符（`  \n`）和多餘空行

**解決方案**：
- 使用 `cleanMarkdownContent()` 預處理
- MarkdownRenderer 樣式設定 `lineHeight: 1.1`, `mb: 0`

---

**Q3: Tab 2 按鈕 JSON 解析錯誤**

**原因**：Schema property key 不一致，或自訂按鈕沒有 schema

**解決方案**（V2 已修復）：
- 移除強制 JSON Schema（`jsonSchema: null`）
- 直接使用 AI 回傳的 content（支援任何格式）

---

**Q4: Chat 對話表格無法正確顯示**

**原因**：傳統左右對話框模式寬度限制（maxWidth: 85%）

**解決方案**：
- 改為全寬區塊式設計（width: 100%）
- 使用左側色條區分使用者/AI
- TableContainer 添加 `overflowX: 'auto'`

---

**Q5: Config 對話框下拉選單無法展開**

**原因**：MUI Select Menu z-index 低於對話框 z-index

**解決方案**：
```javascript
<Select
  MenuProps={{ sx: { zIndex: 2147483650 } }}  // 高於對話框
>
  {/* ... */}
</Select>
```

---

**Q6: Rate Limit 錯誤（HTTP 429）**

**症狀**：顯示 "Rate Limit 超過限制"

**解決方案**：
1. 等待 Rate Limit 重置（查看錯誤訊息中的等待時間）
2. 檢查 Console 的 Rate Limit Status
3. 啟用雙 API Key 輪流功能
4. 切換到其他 AI 提供者

---

### 9.2 除錯技巧

**Console 日誌**：
- Token 估算：`🔢 [Provider] Token Estimation`
- API Key 使用：`🔑 [Provider] 使用 API Key X (雙 Key 輪流)`
- Rate Limit 狀態：`📊 [Provider] Rate Limit Status`
- 錯誤訊息：`❌ [Provider] API call failed`

**React DevTools**：
- 檢查 Sidebar 的 state（`autoAnalysisResult`, `buttonResults`, `chatHistory`）
- 確認 `tabConfigs` 正確載入
- 追蹤 `hasAnalyzed` flag

**Chrome Storage Inspector**：
- 檢查 `gaiSidebarConfigVersion` 是否為 2
- 驗證 `gaiAutoAnalysisConfig`, `gaiQuickButtonsConfig`, `gaiChatConfig`
- 查看 `gaiChatHistory`（在 chrome.storage.local）

---

## 10. 變更歷史

### V2.3 (2026-01-05) - **最新版本**

**UI/UX 精簡與統一優化**：

1. **Tab 名稱精簡**：
   - Tab 1: 「自動分析」→「自動」
   - Tab 2: 「快速按鈕」→「快速」
   - Tab 3: 「對話」維持不變

2. **Tab 3 配置簡化**：
   - 移除 Tab 3 的「啟用/停用」開關（Chat 功能預設啟用）
   - 配置對話框 Tab 3 區域內容直接顯示，不再使用 Collapse 包裝

3. **統計資訊格式統一**：
   - 三個 Tab 統一顯示格式：`AI 可能出錯，請查核資訊 / {tokens}tokens/{duration}s/{keyUsed}`
   - Tab 1 & Tab 2：使用 `[STATS]` 前綴區分統計資訊與內容
   - Tab 3：metadata 物件儲存統計資訊

4. **複製功能完善**：
   - Tab 1 & Tab 2：Header 區域新增複製按鈕（僅複製內容，排除統計資訊）
   - Tab 3：每則 AI 訊息右下角新增複製按鈕（使用者訊息不顯示）
   - 複製成功後顯示綠色打勾圖示（2 秒後恢復）

5. **AI 提供者優化**：
   - 預設排序調整：Cerebras > Groq > Gemini > OpenAI
   - Cerebras 名稱加上「(推薦)」標記
   - 所有提供者描述中的 API Key 連結可直接點擊開啟

6. **自訂按鈕設定統一**：
   - 「自訂分析 Prompt」更名為「自訂分析指令」
   - 自訂類型按鈕圖示統一使用「Star」（不可變更）

7. **開發者模式功能**：
   - 「開啟複製XML資料格式」和「開啟包含提示詞資料格式」選項移至開發者模式
   - 一般使用者介面不顯示這兩個進階選項
   - 這兩個選項預設值設為 `false`

**程式碼變更摘要**：
- `src/components/Sidebar.jsx` - 統計資訊格式變更、Tab 名稱更新
- `src/components/sidebar/Tab1AutoAnalysis.jsx` - 新增複製功能、統計資訊解析
- `src/components/sidebar/Tab2QuickButtons.jsx` - 新增複製功能、統計資訊顯示
- `src/components/sidebar/Tab3Chat.jsx` - AI 訊息複製功能、格式統一
- `src/components/sidebar/SidebarV2ConfigDialog.jsx` - Tab 3 配置簡化、Tab 名稱更新、自訂按鈕設定調整
- `src/components/settings/GAISettings.jsx` - 開發者模式條件渲染、API Key 連結可點擊
- `src/components/PopupSettings.jsx` - 傳遞 developerMode prop 至 GAISettings
- `src/services/gai/providers/providerRegistry.js` - 提供者排序調整
- `src/services/gai/providers/CerebrasProvider.js` - 名稱加上「(推薦)」
- `src/services/gai/providers/*.js` - 各提供者新增 API Key 連結

### V2.2 (2026-01-02)

- **PII 系統深度升級**:
  - 新增 **臺北榮總 (VGH)** 專屬過濾邏輯（含醫師、報告人、表頭等）。
  - 新增 **病理報告 (Pathology)** 證照號碼過濾模式。
  - 新增 **西園醫院** 特定姓名與醫師稱謂過濾。
  - 優化 **Radiologist** 與醫師稱謂的各種邊際格式遮罩。
- **資料處理與導出優化**:
  - 修復 `diagnosis` 欄位在 XML 匯出時為空的問題。
  - 調整 XML 輸出順序：`diagnosis` 現在緊接在 `patientSummary` 之後呈現，提升分析邏輯一致性。
  - **HBCV 資料增強**: 匯出 XML 中新增檢驗值的原始正常範圍 (Ref: `consult_value`)。
- **UI/UX 微調**:
  - 確保 Sidebar 自動分析與手動複製使用相同的資料格式化邏輯。

### V2.1 (2026-01-02)

**PII 去個資化與 UI/UX 持續優化**：
1. **PII 去個資化系統升級**: 
   - 新增放射師、醫師多格式姓名、證照號碼 (放診專字、No. 等) 遮罩。
   - `PiiPatterns` 重構為類別型式，支援分類篩選。
2. **UI/UX 空間優化**:
   - 移除對話頭像，擴大訊息顯示寬度。
   - 壓縮 Header Tab 與模板描述文字，釋放更多垂直空間。
   - 新增 **BETA** 標籤。
3. **管理功能增強**:
   - 新增 **「清除歷史」** (Clear History) 按鈕於 Chat 視窗。
   - 新增 **「重設為預設值」** (Reset to Defaults) 按鈕於 GAI 設定。
4. **效能調校**:
   - 將對話歷史上限從 10 輪調整為 **5 輪**，維持反應速度並節省 Token。
   - 更新預設快速提問 (Quick Questions) 內容。

### V2.0 (2025-12-31 - 2026-01-01)

**重大變更**：從動態 4 Tab 改為固定功能 3 Tab

**新增功能**：
1. **三 Tab 設計**：
   - Tab 1: 自動分析（單一模板，自動執行）
   - Tab 2: 快速按鈕（6 個可配置按鈕）
   - Tab 3: Chat 對話（多輪對話 + 快速提問）

2. **配置系統重構**：
   - 新增 `sidebarV2Defaults.js`
   - 新增 V2 配置管理函數（settingsManager.js）
   - 自動資料遷移（V1 → V2）

3. **組件子組件化**：
   - Tab1AutoAnalysis.jsx
   - Tab2QuickButtons.jsx
   - Tab3Chat.jsx
   - SidebarV2ConfigDialog.jsx
   - CustomButtonEditor.jsx

4. **Markdown 完整支援**：
   - MarkdownRenderer.jsx（支援表格、列表、粗體、連結）
   - 格式清理邏輯（移除尾隨空格、壓縮空行）
   - 樣式優化（lineHeight: 1.1, 最小邊距）

5. **10 種醫療資料類型**：
   - 新增 `diagnosis`（診斷/收案）
   - 藥品 ATC 碼整合
   - 影像報告去個資化

6. **預設模板調整**：
   - 移除「危險警示」
   - 重構「藥物交互作用」
   - 新增「藥品 ATC 分類」（WHO ATC 2025）
   - 優化「檢驗異常值」（TL;DR 格式）
   - 優化「影像重點」（粗體標註異常）

7. **推理模型支援**：
   - Token Limit 提升（Cerebras: 32,768, Groq: 16,384）
   - 推理內容提取與備援機制
   - `<think>` 標籤過濾

8. **UI 全面優化**：
   - Tab 1: 移除嵌套 Paper，最大化顯示空間
   - Tab 2: 上方按鈕網格 + 下方共享結果區域
   - Tab 3: 全寬區塊式設計，完整 Markdown 支援
   - Config 對話框：Grid 與 Card 導向設計

**修復問題**：
1. 自動分析多次呼叫 API（useEffect 依賴陣列優化）
2. Tab 點擊無反應（明確 value props + onClick handlers）
3. Config 對話框下拉選單無法展開（z-index 修復）
4. 快速按鈕 JSON 解析錯誤（移除強制 JSON Schema）
5. Markdown 行距過寬（格式清理 + 樣式優化）
6. Chat 歷史清除機制（監聽資料變化事件）
7. 表格顯示問題（全寬設計 + 水平滾動）
8. V1 架構程式碼完全移除（避免重複執行）

**技術債清理**：
- 移除 debug console.log 語句
- React 19 Import 優化（解構 import）
- 完全移除 V1 相關程式碼

---

### V1.0 (2025-12-29 - 2025-12-30)

**初始模組化重構**：
1. **Provider 系統建立**：
   - BaseProvider 抽象類別
   - OpenAIProvider, GeminiProvider, GroqProvider, CerebrasProvider
   - providerRegistry 統一管理

2. **Token 估算系統**：
   - tokenCounter.js（針對繁體中文優化）
   - 呼叫前 token 估算（預期誤差 ±20%）

3. **雙 API Key 輪流功能**：
   - Mutex 機制確保原子性
   - 完美輪流（Key 1 → Key 2 → Key 1 → Key 2）

4. **動態 Tab 系統**（已廢棄於 V2）：
   - 4 個動態 Tab 配置
   - 7 種預設模板 + 1 種自訂模板
   - 選擇性資料傳輸（9 種資料類型）

5. **文件完善**：
   - GAI_ARCHITECTURE.md
   - GAI_MODULARIZATION_PLAN.md
   - GAI_REFACTORING_SUMMARY.md

---

## 附錄

### A. 程式碼統計

**V2 架構程式碼行數**：

| 類別 | 檔案數 | 總行數 |
|------|-------|--------|
| **核心組件** | 6 | ~2,100 |
| **Provider 系統** | 7 | ~850 |
| **配置系統** | 3 | ~310 |
| **工具模組** | 5 | ~690 |
| **文件** | 1 | ~736 |
| **總計** | 22 | ~4,686 |

### B. 關鍵檔案路徑速查

**核心組件**：
- `src/components/Sidebar.jsx` - 主組件（V2 重構）
- `src/components/sidebar/Tab1AutoAnalysis.jsx` - 自動分析
- `src/components/sidebar/Tab2QuickButtons.jsx` - 快速按鈕
- `src/components/sidebar/Tab3Chat.jsx` - Chat 對話
- `src/components/sidebar/SidebarV2ConfigDialog.jsx` - 配置對話框
- `src/components/sidebar/CustomButtonEditor.jsx` - 自訂編輯器
- `src/components/sidebar/MarkdownRenderer.jsx` - Markdown 渲染

**配置系統**：
- `src/config/sidebarV2Defaults.js` - V2 預設配置
- `src/config/dataTypeMetadata.js` - 10 種資料類型元數據
- `src/services/gai/tabs/presetTemplates.js` - 7 種預設模板

**工具模組**：
- `src/utils/settingsManager.js` - V2 配置管理
- `src/utils/dataSelector.js` - 選擇性 XML 生成
- `src/utils/gaiCopyFormatter.js` - 10 種格式化函數
- `src/utils/diagnosisProcessor.js` - 診斷資料處理
- `src/utils/piiUtils.js` - 進階去個資化 (PII) 工具系統

**Provider 系統**：
- `src/services/gai/providers/BaseProvider.js` - 抽象基礎類別
- `src/services/gai/providers/OpenAIProvider.js` - OpenAI
- `src/services/gai/providers/GeminiProvider.js` - Gemini
- `src/services/gai/providers/GroqProvider.js` - Groq
- `src/services/gai/providers/CerebrasProvider.js` - Cerebras
- `src/services/gai/providers/providerRegistry.js` - 註冊管理
- `src/services/gai/tokenCounter.js` - Token 估算

### C. 聯絡與貢獻

**專案維護**: Claude Code (Anthropic AI)
**文件更新頻率**: 每次重大更新後同步
**問題回報**: 參見專案 Issue Tracker

---

**文件結束**
