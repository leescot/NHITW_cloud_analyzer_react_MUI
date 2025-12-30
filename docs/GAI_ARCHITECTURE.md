# GAI 功能運作方式技術文件

## 1. 概述

GAI (Generative AI) 功能是 Chrome Extension 的核心特色之一，提供自動化的病歷分析與風險評估。系統採用模組化架構，支援多 AI 提供者（OpenAI、Google Gemini、Groq、Cerebras），可平行執行四項醫療摘要分析。

### 1.1 主要功能
- 支援 4 個 AI 提供者：
  - OpenAI (gpt-5-nano)
  - Google Gemini (gemini-3-flash-preview)
  - Groq (llama-3.3-70b-versatile)
  - Cerebras (gpt-oss-120b)
- 四項平行分析：注意事項、用藥風險、異常檢驗、影像發現
- 自動化 XML 格式病歷資料生成
- 呼叫前 Token 用量估算（統一估算法，針對繁體中文優化）
- 即時分析結果顯示與錯誤處理
- Token 使用量與執行時間監控
- Rate Limit 監控與錯誤處理

### 1.2 系統架構圖

```
使用者設定 (GAISettings.jsx)
    ↓ (API Keys, Provider Selection)
Chrome Storage Sync
    ↓
病患資料 → XML 生成器 (gaiCopyFormatter.js)
    ↓
Token 估算 (tokenCounter.js)
    ↓ (顯示預估用量)
Sidebar.jsx (handleAnalyze)
    ↓ (平行執行 4 項分析)
    ├─→ runAnalysisForKey('critical_alerts')
    ├─→ runAnalysisForKey('medication_risks')
    ├─→ runAnalysisForKey('abnormal_labs')
    └─→ runAnalysisForKey('imaging_findings')
         ↓ (chrome.runtime.sendMessage)
Background.js (callGAI)
    ↓ (Provider Registry)
    ├─→ OpenAIProvider
    ├─→ GeminiProvider
    ├─→ GroqProvider
    └─→ CerebrasProvider
         ↓ (HTTP Request with Token Estimation)
AI Provider API
    ↓ (JSON Response + Rate Limit Headers)
Provider (formatResponse & Rate Limit Monitoring)
    ↓ (Standardized Response)
Background.js (sendResponse)
    ↓
Sidebar.jsx (更新 analysisResults state)
    ↓
顯示結果於 UI (可圈選複製)
```

---

## 2. 主要元件說明

### 2.1 GAISettings.jsx - 使用者設定介面

**功能**：提供 GAI 功能的設定選項

**主要狀態**：
```javascript
{
  enableGAICopyFormat: false,    // 開啟複製 XML 資料格式
  enableGAIPrompt: false,        // 開啟包含提示詞資料格式
  enableGAISidebar: false,       // 開啟 GAI 側邊欄顯示
  gaiProvider: 'openai',         // AI 提供者 ('openai' 或 'gemini')
  openaiApiKey: '',              // OpenAI API Key
  geminiApiKey: ''               // Gemini API Key
}
```

**設定儲存機制**：
1. 使用者修改設定 → `handleLocalSettingChange(key, value)`
2. 更新 React state (即時 UI 回應)
3. 觸發 `window.dispatchEvent('settingChanged')` (通知同頁面元件)
4. 儲存至 `chrome.storage.sync` (跨裝置同步)
5. 透過 `chrome.tabs.sendMessage` 通知 content script

**API Key 管理**：
- API Keys 儲存在 `chrome.storage.sync`（用戶瀏覽器本地）
- 提供顯示/隱藏功能（VisibilityOff/Visibility icons）
- 儲存後顯示 2 秒確認訊息

---

### 2.2 Sidebar.jsx - GAI 分析側邊欄

**功能**：顯示 GAI 分析結果的可調整大小側邊欄

#### 2.2.1 核心狀態管理

```javascript
// 分析結果
const [analysisResults, setAnalysisResults] = useState({
  critical_alerts: [],      // 危險/注意事項
  medication_risks: [],     // 用藥雷點/注意
  abnormal_labs: [],        // 異常檢驗數值
  imaging_findings: []      // 影像檢查發現
});

// 細緻的載入狀態（每個類別獨立）
const [loadingStates, setLoadingStates] = useState({
  critical_alerts: false,
  medication_risks: false,
  abnormal_labs: false,
  imaging_findings: false
});

// 錯誤狀態（每個類別獨立）
const [errorStates, setErrorStates] = useState({
  critical_alerts: null,
  medication_risks: null,
  abnormal_labs: null,
  imaging_findings: null
});

const [hasAnalyzed, setHasAnalyzed] = useState(false);  // 避免重複分析
```

#### 2.2.2 自動分析機制

```javascript
useEffect(() => {
  // 條件：側邊欄開啟 && 資料已載入 && 尚未分析 && 有效資料存在
  if (open && isDataLoaded && !isAnalyzing && !hasAnalyzed && hasValidData()) {
    console.log('Sidebar: Auto-analyzing valid patient data...');
    handleAnalyze();
  }
}, [open, isDataLoaded, hasAnalyzed, patientData]);
```

**自動分析觸發條件**：
- 側邊欄開啟（`open === true`）
- 病患資料已載入（`isDataLoaded === true`）
- 目前沒有進行中的分析（`!isAnalyzing`）
- 尚未執行過分析（`!hasAnalyzed`）
- 病患資料包含有效內容（`hasValidData()` 檢查）

#### 2.2.3 主要分析流程

**handleAnalyze() - 啟動所有分析**：
```javascript
const handleAnalyze = () => {
  setHasAnalyzed(true);

  // 1. 生成 XML 格式病歷資料
  const xmlString = generateGAIFormatXML(patientData);

  // 2. 讀取使用者選擇的 AI 提供者
  chrome.storage.sync.get(['gaiProvider'], (result) => {
    const provider = result.gaiProvider || 'openai';

    // 3. 平行執行所有分析（4 個獨立請求）
    Object.keys(GAI_CONFIG).forEach(key => {
      runAnalysisForKey(key, xmlString, provider);
    });
  });
};
```

**runAnalysisForKey(key, xmlString, provider) - 執行單一分析**：
```javascript
const runAnalysisForKey = (key, xmlString, provider = 'openai') => {
  const config = GAI_CONFIG[key];  // 從 gaiConfig.js 讀取配置

  // 1. 更新載入狀態
  setLoadingStates(prev => ({ ...prev, [key]: true }));
  setErrorStates(prev => ({ ...prev, [key]: null }));

  // 2. 傳送訊息至 background script
  chrome.runtime.sendMessage({
    action: provider === 'gemini' ? 'callGemini' : 'callOpenAI',
    systemPrompt: config.systemPrompt,
    userPrompt: xmlString,
    jsonSchema: config.schema,
    model: "gpt-5-nano"
  }, (response) => {
    // 3. 處理回應
    setLoadingStates(prev => ({ ...prev, [key]: false }));

    if (chrome.runtime.lastError) {
      setErrorStates(prev => ({ ...prev, [key]: chrome.runtime.lastError.message }));
    } else if (!response || !response.success) {
      setErrorStates(prev => ({ ...prev, [key]: response?.error || "Unknown error" }));
    } else {
      // 4. 解析 JSON 並更新結果
      try {
        const content = response.data.choices[0].message.content;
        const parsed = JSON.parse(content);

        setAnalysisResults(prev => {
          const mergedResults = { ...prev, ...parsed };

          // 5. 附加效能指標
          if (mergedResults[key] && Array.isArray(mergedResults[key]) && response.data.usage) {
            const totalTokens = response.data.usage.total_tokens || response.data.usage.totalTokenCount || 0;
            const durationSec = ((response.data.duration || 0) / 1000).toFixed(2);
            mergedResults[key].push(`(Total_tokens: ${totalTokens}, 執行時間: ${durationSec}s)`);
          }

          return mergedResults;
        });
      } catch (e) {
        setErrorStates(prev => ({ ...prev, [key]: "Parse error: " + e.message }));
      }
    }
  });
};
```

#### 2.2.4 UI 顯示邏輯

**renderContentList(dataKey, color, emptyMsg) - 渲染分析結果**：
- 載入中：顯示 CircularProgress + "正在分析..."
- 發生錯誤：顯示錯誤訊息 + 重試按鈕
- 無結果：顯示空狀態訊息（如 "無重大危險警示"）
- 有結果：以列表形式顯示分析項目

**分頁架構**：
- 使用 Material-UI Tabs 元件
- 四個分頁：注意 / 用藥 / 檢驗 / 影像
- Badge 標示：當該類別有結果時顯示紅點

---

### 2.3 background.js - 背景服務處理器

**功能**：作為 Chrome Extension 的背景服務，處理 AI API 呼叫

#### 2.3.1 OpenAI API 處理 (callOpenAI)

```javascript
['callOpenAI', (message, sender, sendResponse) => {
  chrome.storage.sync.get(['openaiApiKey'], async (result) => {
    const apiKey = result.openaiApiKey;
    if (!apiKey) {
      sendResponse({ success: false, error: "OpenAI API Key not found. Please set it in Options." });
      return;
    }

    try {
      const startTime = Date.now();

      // API 請求
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: message.model || "gpt-5-nano",
          messages: [
            { role: "system", content: message.systemPrompt },
            { role: "user", content: message.userPrompt }
          ],
          response_format: {
            type: "json_schema",
            json_schema: message.jsonSchema
          }
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || `HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      const endTime = Date.now();
      const duration = endTime - startTime;

      // 記錄效能數據
      console.groupCollapsed(`OpenAI API Call (${duration}ms)`);
      console.log("Model:", message.model);
      console.log("Token Usage:", data.usage);
      console.log("Full Response:", data);
      console.groupEnd();

      data.duration = duration;
      sendResponse({ success: true, data: data });

    } catch (error) {
      console.error("OpenAI API call failed:", error);
      sendResponse({ success: false, error: error.message });
    }
  });
  return true; // 保持通道開放以進行異步回應
}]
```

**OpenAI 請求格式**：
- **Endpoint**: `https://api.openai.com/v1/chat/completions`
- **Model**: `gpt-5-nano`（可由 message.model 覆蓋）
- **Response Format**: `json_schema` with strict mode
- **Messages**:
  - System: 分析指引（來自 gaiConfig.js）
  - User: XML 格式病歷資料

#### 2.3.2 Gemini API 處理 (callGemini)

```javascript
['callGemini', (message, sender, sendResponse) => {
  chrome.storage.sync.get(['geminiApiKey'], async (result) => {
    const apiKey = result.geminiApiKey;
    if (!apiKey) {
      sendResponse({ success: false, error: "Gemini API Key not found. Please set it in Options." });
      return;
    }

    try {
      const startTime = Date.now();

      // API 請求
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            systemInstruction: {
              parts: [{ text: message.systemPrompt }]
            },
            contents: [{
              parts: [{ text: message.userPrompt }]
            }],
            generationConfig: {
              responseMimeType: "application/json",
              responseJsonSchema: message.jsonSchema.schema
            }
          })
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || `HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      const endTime = Date.now();
      const duration = endTime - startTime;

      // 記錄效能數據
      console.groupCollapsed(`Gemini API Call (${duration}ms)`);
      console.log("Model: gemini-3-flash-preview");
      console.log("Token Usage:", data.usageMetadata);
      console.log("Full Response:", data);
      console.groupEnd();

      // 轉換回應格式以符合前端預期（模擬 OpenAI 格式）
      const contentText = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!contentText) {
        throw new Error("Empty response from Gemini");
      }

      const mockedResponse = {
        choices: [{
          message: {
            content: contentText
          }
        }],
        usage: data.usageMetadata,
        duration: duration
      };

      sendResponse({ success: true, data: mockedResponse });

    } catch (error) {
      console.error("Gemini API call failed:", error);
      sendResponse({ success: false, error: error.message });
    }
  });
  return true;
}]
```

**Gemini 請求格式**：
- **Endpoint**: `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent`
- **Model**: `gemini-3-flash-preview`（固定）
- **System Instruction**: 分析指引
- **Generation Config**: JSON schema response
- **回應轉換**: 轉換成 OpenAI 相容格式

**關鍵差異**：
| 項目 | OpenAI | Gemini |
|------|--------|--------|
| Schema 傳遞 | `json_schema` | `responseJsonSchema: schema` |
| System Prompt | `messages[0].role: "system"` | `systemInstruction.parts[0].text` |
| User Prompt | `messages[1].role: "user"` | `contents[0].parts[0].text` |
| Token 用量 | `usage.total_tokens` | `usageMetadata.totalTokenCount` |
| 回應路徑 | `choices[0].message.content` | `candidates[0].content.parts[0].text` |

---

### 2.4 gaiConfig.js - AI 分析配置

**功能**：定義四項分析的 JSON Schema 與 System Prompt

#### 2.4.1 配置結構

```javascript
export const GAI_CONFIG = {
  critical_alerts: { schema: {...}, systemPrompt: "..." },
  medication_risks: { schema: {...}, systemPrompt: "..." },
  abnormal_labs: { schema: {...}, systemPrompt: "..." },
  imaging_findings: { schema: {...}, systemPrompt: "..." }
};
```

#### 2.4.2 四項分析類別

**1. Critical Alerts (危險/注意事項)**
- **目的**: 識別最危險、需立即注意的項目
- **焦點**: 嚴重疾病、活躍風險、重大警告
- **Schema**: `{ critical_alerts: string[] }`
- **System Prompt**: "識別最危險或需緊急注意的項目"

**2. Medication Risks (用藥雷點/注意)**
- **目的**: 識別用藥風險與交互作用
- **焦點**: 藥物交互作用、禁忌症、腎功能劑量調整
- **Schema**: `{ medication_risks: string[] }`
- **System Prompt**: "分析用藥風險、交互作用、禁忌症、腎劑量調整"

**3. Abnormal Labs (異常檢驗數值)**
- **目的**: 提取近期異常檢驗結果
- **焦點**: 超出正常範圍的數值、重要趨勢、危急值
- **Schema**: `{ abnormal_labs: string[] }`
- **System Prompt**: "提取近期異常檢驗結果並提供簡要解釋"

**4. Imaging Findings (影像檢查發現)**
- **目的**: 摘要影像報告重要發現
- **焦點**: 異常發現、診斷、建議
- **Schema**: `{ imaging_findings: string[] }`
- **System Prompt**: "提取並摘要影像報告的重要異常發現"

#### 2.4.3 Schema 結構（以 critical_alerts 為例）

```javascript
{
  name: "critical_alerts_response",
  strict: true,  // OpenAI strict mode
  schema: {
    type: "object",
    properties: {
      critical_alerts: {
        type: "array",
        items: { type: "string" },
        description: "List of critical alerts, dangerous conditions, or urgent attention items"
      }
    },
    required: ["critical_alerts"],
    additionalProperties: false
  }
}
```

**重要特性**：
- `strict: true` - OpenAI 的 strict mode，確保輸出嚴格符合 schema
- `additionalProperties: false` - 禁止額外屬性
- `required` - 必須包含的欄位
- 所有輸出要求使用台灣醫師常用的繁體中文醫學術語

---

### 2.5 gaiCopyFormatter.js - XML 格式化工具

**功能**：將病患資料轉換成結構化 XML 格式供 AI 分析

#### 2.5.1 主要函數

**generateGAIFormatXML(data) - 生成完整 XML**：
```javascript
export const generateGAIFormatXML = (data) => {
  const {
    userInfo,
    patientSummaryData,
    allergyData,
    surgeryData,
    dischargeData,
    hbcvData,
    groupedMedications,
    groupedLabs,
    groupedChineseMeds,
    imagingData
  } = data;

  const age = userInfo?.age || '未知';
  const gender = userInfo?.gender === 'M' ? 'male' : userInfo?.gender === 'F' ? 'female' : '未知';

  let gaiText = `這是一位 ${age} 歲的 ${gender} 性病人，以下是病歷資料\n\n`;

  gaiText += formatPatientSummary(patientSummaryData);
  gaiText += formatAllergy(allergyData);
  gaiText += formatSurgery(surgeryData);
  gaiText += formatDischarge(dischargeData);
  gaiText += formatHBCV(hbcvData);
  gaiText += formatMedication(groupedMedications);
  gaiText += formatLab(groupedLabs);
  gaiText += formatChineseMed(groupedChineseMeds);
  gaiText += formatImaging(imagingData);

  return gaiText;
};
```

#### 2.5.2 XML 結構範例

```xml
這是一位 65 歲的 male 性病人，以下是病歷資料

<patientSummary>
雲端註記資料:
慢性腎臟病第四期
糖尿病
</patientSummary>

<allergy>
過敏史:
Penicillin - 皮膚紅疹
</allergy>

<surgery>
開刀史:
2023/01/15 - 台大醫院 - 膽囊切除術
</surgery>

<discharge>
住院史:
2023/05/10 - 2023/05/20 - 榮總 - N18.4 慢性腎臟病第四期
</discharge>

<hbcvdata>
B、C肝炎資料:
2023/03/01 - HBsAg: Negative
</hbcvdata>

<medication>
近期用藥記錄:
2023/11/20 - 台大醫院
診斷: E11.9 第二型糖尿病
  Metformin 500mg 2# BID 30天 (Metformin HCl)
  Lisinopril 10mg 1# QD 30天
</medication>

<lab>
近期檢驗記錄:
2023/11/15 - 台大醫院
  Creatinine: 2.8 mg/dL (參考值: 0.7-1.3)
  eGFR: 25 mL/min/1.73m²
</lab>

<chinesemed>
近期中藥記錄:
2023/10/01 - 中醫診所
  加味逍遙散 4g TID 7天
</chinesemed>

<imaging>
近期影像學報告:
2023/09/10 - 台大醫院 - Chest X-ray
  報告: Bilateral pleural effusion noted. Cardiomegaly present.
</imaging>
```

#### 2.5.3 格式化子函數

每個資料類型都有對應的格式化函數：
- `formatPatientSummary()` - 雲端註記資料
- `formatAllergy()` - 過敏史
- `formatSurgery()` - 開刀史
- `formatDischarge()` - 住院史
- `formatHBCV()` - B、C 肝炎資料
- `formatMedication()` - 近期用藥記錄
- `formatLab()` - 近期檢驗記錄
- `formatChineseMed()` - 近期中藥記錄
- `formatImaging()` - 近期影像學報告

**資料處理特性**：
- 自動過濾無用資訊（如牙科影像提示）
- 清理影像報告格式（移除標記如 "Imaging findings:"）
- 日期格式化（轉換成 zh-TW locale）
- 空資料處理（顯示空標籤）

---

## 3. 完整資料流程

### 3.1 初始化流程

```
1. 使用者開啟設定頁面
   ↓
2. 選擇 AI 提供者 (OpenAI/Gemini)
   ↓
3. 輸入對應的 API Key
   ↓
4. 開啟 "GAI 側邊欄顯示" 選項
   ↓
5. 設定儲存至 chrome.storage.sync
```

### 3.2 分析執行流程

```
1. 使用者瀏覽健保雲端病歷頁面
   ↓
2. Extension 攔截 API 並載入病患資料
   ↓
3. 使用者開啟 GAI 側邊欄（或自動開啟）
   ↓
4. Sidebar.jsx 偵測到資料已載入
   ↓
5. 自動觸發 handleAnalyze()
   ↓
6. generateGAIFormatXML(patientData)
   ├─ 讀取病患基本資料 (年齡、性別)
   ├─ 格式化雲端註記、過敏史、開刀史
   ├─ 格式化住院史、B/C肝炎資料
   ├─ 格式化用藥、檢驗、中藥記錄
   └─ 格式化影像報告
   ↓ (生成 XML 字串)
7. 讀取 gaiProvider 設定
   ↓
8. 平行執行四項分析
   ├─ runAnalysisForKey('critical_alerts', xmlString, provider)
   ├─ runAnalysisForKey('medication_risks', xmlString, provider)
   ├─ runAnalysisForKey('abnormal_labs', xmlString, provider)
   └─ runAnalysisForKey('imaging_findings', xmlString, provider)
   ↓ (每個分析獨立執行)
9. chrome.runtime.sendMessage() 傳送至 background
   ├─ action: 'callOpenAI' 或 'callGemini'
   ├─ systemPrompt: GAI_CONFIG[key].systemPrompt
   ├─ userPrompt: xmlString
   ├─ jsonSchema: GAI_CONFIG[key].schema
   └─ model: "gpt-5-nano"
   ↓
10. background.js 處理請求
    ├─ 讀取 API Key from chrome.storage.sync
    ├─ 發送 HTTP 請求至 AI Provider
    ├─ 記錄開始時間
    └─ 等待回應
    ↓
11. AI Provider 處理
    ├─ OpenAI: POST /v1/chat/completions
    └─ Gemini: POST /v1beta/models/gemini-3-flash-preview:generateContent
    ↓
12. background.js 接收回應
    ├─ 計算執行時間
    ├─ 記錄 Token 用量
    ├─ (Gemini) 轉換回應格式為 OpenAI 相容
    └─ sendResponse({ success: true, data: {...} })
    ↓
13. Sidebar.jsx 接收回應
    ├─ 更新 loadingStates[key] = false
    ├─ 解析 JSON: JSON.parse(response.data.choices[0].message.content)
    ├─ 附加效能指標 (tokens, 執行時間)
    └─ 更新 analysisResults[key]
    ↓
14. UI 自動重新渲染
    ├─ 顯示分析結果列表
    ├─ 更新 Badge 標示
    └─ 使用者可切換分頁查看各類別結果
```

### 3.3 錯誤處理流程

```
API 呼叫失敗
├─ chrome.runtime.lastError
│  └─ setErrorStates[key] = lastError.message
├─ response.success === false
│  └─ setErrorStates[key] = response.error
├─ HTTP 錯誤 (response.ok === false)
│  └─ throw Error(errorData.error?.message)
├─ JSON 解析失敗
│  └─ setErrorStates[key] = "Parse error: " + e.message
└─ 空回應 (Gemini)
   └─ throw Error("Empty response from Gemini")
   ↓
UI 顯示錯誤訊息 + 重試按鈕
```

---

## 4. 效能與監控

### 4.1 效能指標追蹤

**背景服務記錄**：
```javascript
console.groupCollapsed(`OpenAI API Call (${duration}ms)`);
console.log("Model:", message.model);
console.log("Token Usage:", data.usage);
console.log("Full Response:", data);
console.groupEnd();
```

**前端顯示**：
```javascript
if (mergedResults[key] && Array.isArray(mergedResults[key]) && response.data.usage) {
  const totalTokens = response.data.usage.total_tokens || response.data.usage.totalTokenCount || 0;
  const durationSec = ((response.data.duration || 0) / 1000).toFixed(2);
  mergedResults[key].push(`(Total_tokens: ${totalTokens}, 執行時間: ${durationSec}s)`);
}
```

**監控項目**：
- **Token 用量**: 每次 API 呼叫的 token 消耗
- **執行時間**: 從請求發送到回應接收的毫秒數
- **錯誤率**: 透過 errorStates 追蹤失敗請求

### 4.2 平行處理優勢

**傳統序列處理**：
```
critical_alerts (3s) → medication_risks (3s) → abnormal_labs (3s) → imaging_findings (3s)
總時間: 12 秒
```

**目前平行處理**：
```
critical_alerts (3s)  ┐
medication_risks (3s)  ├─ 平行執行
abnormal_labs (3s)     │
imaging_findings (3s) ┘
總時間: ~3 秒（最慢的那個）
```

**實作方式**：
```javascript
Object.keys(GAI_CONFIG).forEach(key => {
  runAnalysisForKey(key, xmlString, provider);
});
```

### 4.3 狀態管理優化

**細緻的載入狀態**：
- 每個分析類別有獨立的 loading/error/result 狀態
- 允許部分成功、部分失敗的情況
- 使用者可看到即時進度（某些已完成，某些仍在載入）

**避免重複分析**：
- `hasAnalyzed` flag 確保自動分析只執行一次
- 手動重新整理時重置 flag
- 資料變更時重置 flag

---

## 5. Token 估算系統

### 5.1 概述

為了在呼叫 AI API 前提供成本預估與配額管理，系統實作了統一的 Token 估算模組（`src/services/gai/tokenCounter.js`），針對繁體中文醫療數據優化。

### 5.2 估算規則

基於 OpenAI tokenizer 的觀察與測試，估算規則如下：

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

### 5.3 核心函數

#### estimateTokens(text)
估算單一文本的 token 數量。

**參數**：
- `text` (string): 要估算的文本

**回傳**：
- (number): 估算的 token 數量

#### estimatePromptTokens(systemPrompt, userPrompt)
估算 system + user prompts 的總 token 數量。

**參數**：
- `systemPrompt` (string): System prompt 文本
- `userPrompt` (string): User prompt 文本

**回傳**：
- (Object): `{ systemTokens, userTokens, totalTokens }`

#### formatTokenCount(tokens)
格式化 token 數量為易讀字串。

**範例**：
- `245` → "245 tokens"
- `8234` → "8.23K tokens"
- `1500000` → "1.50M tokens"

### 5.4 整合方式

Token 估算整合至所有 AI Provider 的 `callAPI` 方法中：

```javascript
// BaseProvider.js
logTokenEstimation(systemPrompt, userPrompt, options = {}) {
    const estimation = estimatePromptTokens(systemPrompt, userPrompt);

    console.log(`🔢 [${this.name} Token Estimation]`);
    console.log(`📝 System Prompt: ${formatTokenCount(estimation.systemTokens)}`);
    console.log(`💬 User Prompt: ${formatTokenCount(estimation.userTokens)}`);
    console.log(`📈 Total: ${formatTokenCount(estimation.totalTokens)}`);

    return estimation;
}
```

### 5.5 Console 輸出範例

呼叫 API 前會在 Console 顯示：

```
================================================================================
🔢 [Cerebras Token Estimation]
================================================================================
📊 Model: gpt-oss-120b
📝 System Prompt: 345 tokens
💬 User Prompt: 7.85K tokens
📈 Total (System + User): 8.20K tokens
⚠️  Note: 此為估算值，實際用量可能有 ±20% 誤差
================================================================================
```

### 5.6 準確度評估

**預期誤差範圍**：±20%

**誤差來源**：
- Tokenizer 差異：不同 AI 提供者使用不同的 tokenizer
- 中文字符處理：各家 tokenizer 對中文的編碼效率不同
- 特殊字符：醫學符號、Unicode 字符可能有差異

**改進方式**：
如果實際使用中發現誤差持續偏高或偏低，可調整 `tokenCounter.js` 中的係數：
```javascript
// 範例：如果估算值持續低估 15%，可調整係數
chineseChars * 2.9 +  // 從 2.5 調整為 2.9
englishWords * 1.5 +  // 從 1.3 調整為 1.5
```

### 5.7 使用場景

1. **成本預估**：呼叫前知道大約會消耗多少 tokens
2. **配額管理**：避免超過 Rate Limit（如 Cerebras Free tier 60K TPM）
3. **優化提示詞**：根據 token 用量調整 prompt 長度
4. **除錯分析**：對比估算值與實際用量，找出異常請求

---

## 6. AI 提供者比較

| 特性 | OpenAI | Gemini | Groq | Cerebras |
|------|--------|--------|------|----------|
| **預設模型** | gpt-5-nano | gemini-3-flash-preview | llama-3.3-70b-versatile | gpt-oss-120b |
| **API Endpoint** | api.openai.com | generativelanguage.googleapis.com | api.groq.com | api.cerebras.ai |
| **定價** | 較高 | 較低 | 免費（有限制） | 免費/付費 |
| **速度** | 中等 | 較快 | 極快 | 極快 |
| **Schema 支援** | json_schema (strict) | responseJsonSchema | json_object (基礎) | json_object (基礎) |
| **Token 欄位** | usage.total_tokens | usageMetadata.totalTokenCount | usage.total_tokens | usage.total_tokens |
| **System Prompt** | messages[0].role="system" | systemInstruction | messages[0].role="system" | messages[0].role="system" |
| **回應格式** | OpenAI 原生 | 需轉換 | OpenAI 相容 | OpenAI 相容 |
| **Rate Limit (Free)** | - | - | 30 RPM, 6K TPM | 30 RPM, 60K TPM |
| **特殊功能** | Strict JSON mode | 內建工具呼叫 | 超快推理速度 | Token bucketing |

**選擇建議**：
- **OpenAI**: 需要最高準確度、嚴格 JSON schema 時使用
- **Gemini**: 大量分析、成本敏感、需要工具呼叫時使用
- **Groq**: 需要極快速度、小規模測試時使用（注意 Rate Limit）
- **Cerebras**: 平衡速度與成本、醫療分析場景（Free tier 60K TPM 足夠）

---

## 7. 安全性考量

### 7.1 API Key 儲存
- 儲存位置：`chrome.storage.sync`（用戶本地瀏覽器）
- 不會傳送至伺服器
- 支援 Chrome 同步功能（加密傳輸）

### 7.2 資料隱私
- 病患資料僅在分析時傳送至 AI Provider
- 不儲存於 Extension 伺服器
- XML 格式化後直接傳送，不經過中間伺服器

### 7.3 權限控制
- 需要使用者明確輸入 API Key 才能啟用
- 使用者可隨時關閉 GAI 側邊欄功能
- 支援隱藏/顯示 API Key 功能

---

## 8. 未來擴充性

### 8.1 新增 AI 提供者
```javascript
// 1. 在 GAISettings.jsx 新增選項
<MenuItem value="claude">Anthropic Claude</MenuItem>

// 2. 在 background.js 新增處理器
['callClaude', (message, sender, sendResponse) => {
  // 實作 Claude API 呼叫
}]

// 3. 在 Sidebar.jsx 更新條件
action: provider === 'claude' ? 'callClaude' : ...
```

### 8.2 新增分析類別
```javascript
// 1. 在 gaiConfig.js 新增配置
export const GAI_CONFIG = {
  // 現有類別...
  drug_allergy_check: {
    schema: { ... },
    systemPrompt: "檢查用藥與過敏史的衝突"
  }
};

// 2. 在 Sidebar.jsx 新增狀態
const [analysisResults, setAnalysisResults] = useState({
  // 現有類別...
  drug_allergy_check: []
});

// 3. 在 UI 新增 Tab
<Tab icon={...} label="過敏檢查" />
```

### 8.3 自訂 System Prompt
目前使用者可透過 "編輯提示詞" 功能修改 DEFAULT_GAI_PROMPT，但這僅用於複製功能。若要支援自訂每個分析類別的 System Prompt：

```javascript
// 儲存結構
{
  customPrompts: {
    critical_alerts: "自訂的危險警示提示詞",
    medication_risks: "自訂的用藥風險提示詞",
    // ...
  }
}

// 使用時
const systemPrompt = customPrompts[key] || GAI_CONFIG[key].systemPrompt;
```

---

## 9. 常見問題排查

### 9.1 分析失敗

**症狀**：顯示 "OpenAI API Key not found" 或 "Gemini API Key not found"
**解決**：
1. 確認已在設定中輸入正確的 API Key
2. 確認已點擊 "儲存" 按鈕
3. 重新整理頁面

**症狀**：顯示 "HTTP error! status: 401"
**解決**：API Key 無效或已過期，請更新 API Key

**症狀**：顯示 "Parse error"
**解決**：AI 回應格式不符合 JSON Schema，可能是 AI Provider 問題，請重試

**症狀**：顯示 "Rate Limit 超過限制"
**解決**：
1. 等待 Rate Limit 重置（查看錯誤訊息中的等待時間）
2. 檢查 Console 的 Rate Limit Status 了解配額使用情況
3. 考慮切換到其他 AI 提供者
4. 升級到付費方案以獲得更高配額

### 9.2 載入無止盡

**症狀**：分析一直顯示 "正在分析..." 不會停止
**解決**：
1. 檢查瀏覽器 Console 是否有錯誤訊息
2. 確認網路連線正常
3. 嘗試手動重新整理（點擊側邊欄重新分析按鈕）

### 9.3 部分分析成功

**症狀**：只有某些類別有結果，其他顯示錯誤
**解決**：
- 這是正常行為（平行處理允許部分失敗）
- 點擊錯誤訊息旁的重試按鈕重新執行該類別分析

### 9.4 Token 估算不準確

**症狀**：估算值與實際用量差異超過 30%
**解決**：
1. 檢查 Console 的 token 估算與實際用量對比
2. 如持續偏高/偏低，可調整 `tokenCounter.js` 中的係數
3. 不同 AI 提供者的 tokenizer 差異可能導致誤差

---

## 10. 開發者注意事項

### 10.1 修改 Schema 時
- 同時更新 `gaiConfig.js` 中的 `schema.schema` 和 `description`
- 確保 `required` 欄位正確設定
- 測試 OpenAI 和 Gemini 兩種提供者

### 10.2 修改 System Prompt 時
- 使用繁體中文醫學術語
- 明確指定輸出格式要求
- 測試不同病患資料的分析結果
- 注意 token 用量，過長的 prompt 會增加成本

### 10.3 新增資料類型至 XML 時
- 在 `gaiCopyFormatter.js` 新增格式化函數
- 在 `generateGAIFormatXML()` 中調用
- 確保使用 XML 標籤包裹（如 `<newdata>...</newdata>`）
- 更新文件說明

### 10.4 新增 AI 提供者時
- 在 `src/services/gai/providers/` 建立新的 Provider 類別
- 繼承 `BaseProvider` 並實作 `callAPI` 方法
- 在 `providerRegistry.js` 註冊新 Provider
- 測試 Token 估算、Rate Limit 處理、錯誤處理
- 無需修改 UI 或其他檔案（自動整合）

---

## 11. 總結

GAI 功能透過以下核心機制運作：

1. **多提供者支援**：支援 4 個 AI 提供者（OpenAI、Gemini、Groq、Cerebras），Provider Registry 自動處理格式轉換
2. **Token 估算**：呼叫前估算 token 用量，針對繁體中文醫療數據優化，誤差範圍 ±20%
3. **平行處理**：四項分析同時執行，大幅縮短總處理時間
4. **細緻狀態管理**：每個分析類別獨立的 loading/error/result 狀態
5. **自動化流程**：側邊欄開啟時自動分析，無需手動觸發
6. **結構化輸出**：透過 JSON Schema 確保 AI 回應格式一致
7. **效能監控**：記錄 Token 用量、執行時間、Rate Limit 狀態，便於成本控制
8. **使用者體驗**：分析結果可圈選複製，支援多種錯誤重試機制

這個模組化架構具有良好的擴充性，可輕鬆新增 AI 提供者（~80 行程式碼）、分析類別或自訂功能。
