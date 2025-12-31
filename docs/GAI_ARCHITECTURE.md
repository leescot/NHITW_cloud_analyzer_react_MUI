# GAI 功能運作方式技術文件

## 1. 概述

GAI (Generative AI) 功能是 Chrome Extension 的核心特色之一，提供自動化的病歷分析與風險評估。系統採用模組化架構，支援多 AI 提供者（OpenAI、Google Gemini、Groq、Cerebras），可平行執行四項醫療摘要分析。

### 1.1 主要功能
- 支援 4 個 AI 提供者：
  - OpenAI (gpt-5-nano)
  - Google Gemini (gemini-3-flash-preview)
  - Groq (llama-3.3-70b-versatile)
  - Cerebras (gpt-oss-120b)
- **動態 Tab 配置系統**（2025-12-31 新增）：
  - 4 個可配置的分析 Tab
  - 前 3 個 Tab 可從 7 種預設模板選擇
  - 第 4 個 Tab 為自訂分析（可選擇資料類型 + 快速提問）
- **選擇性資料傳輸**：
  - 可選擇傳送 9 種醫療資料類型的任意組合
  - 減少不必要的 token 消耗（30-70%）
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
                                    ┌─→ Sidebar 右上角⚙️設定按鈕
                                    ↓
                        TabConfigDialog.jsx (Tab 配置對話框)
                            ↓ (選擇 Tab 1-3 模板 + 編輯自訂 Tab)
                        TabTemplateManager (模板管理器)
                            ├─→ 7 種預設模板（基礎4+專科2+進階1）
                            └─→ 自訂 Tab 配置
                            ↓ (儲存配置)
                        Chrome Storage Sync
                        (gaiSidebarTabs + gaiCustomTabConfig)
                            ↓ (Sidebar 載入配置)
病患資料 → 資料選擇器 (dataSelector.js)
                ↓ (根據 template.dataTypes 選擇資料)
            選擇性 XML 生成器 (generateSelectiveXML)
                ↓ (僅包含所需資料類型)
            Token 估算 (tokenCounter.js)
                ↓ (顯示預估用量)
Sidebar.jsx (handleAnalyze - 動態執行)
    ↓ (平行執行所有配置的 Tab 分析)
    ├─→ runAnalysisForKey(tab1.templateId, template, xmlData)
    ├─→ runAnalysisForKey(tab2.templateId, template, xmlData)
    ├─→ runAnalysisForKey(tab3.templateId, template, xmlData)
    └─→ runAnalysisForKey('custom', customTemplate, xmlData)
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
Sidebar.jsx (更新 analysisResults[key] state)
    ↓
動態 Tab 渲染 (根據 tabConfigs.map())
    ├─→ Tab 圖示、名稱、結果顯示
    └─→ 自訂 Tab 快速提問按鈕
    ↓
顯示結果於 UI (可圈選複製)
```

---

## 2. Tab 配置與資料選擇系統（2025-12-31 新增）

### 2.0.1 系統概述

為了讓使用者能更靈活地配置 GAI 分析功能，系統實作了模組化的 Tab 配置系統，包含以下核心功能：

1. **動態 Tab 配置**：使用者可在 Sidebar 內配置 4 個分析 Tab
2. **預設模板系統**：提供 7 種常見醫療分析模板
3. **自訂 Tab**：支援自訂資料類型選擇與快速提問
4. **選擇性資料傳輸**：僅傳送分析所需的醫療資料，減少 token 消耗

### 2.0.2 Tab 模板管理器 (TabTemplateManager)

**位置**：`src/services/gai/tabs/TabTemplateManager.js`

**功能**：單例模式的模板管理器，負責註冊與提供所有分析模板。

**核心方法**：
```javascript
class TabTemplateManager {
  getTemplate(id)          // 根據 ID 取得模板
  getAllTemplates()        // 取得所有模板列表
  getTemplatesByCategory(category)  // 根據分類取得模板
  registerTemplate(template)        // 註冊新模板（擴充用）
}

// 全域單例
const tabTemplateManager = new TabTemplateManager();
export default tabTemplateManager;
```

### 2.0.3 7 種預設模板

**位置**：`src/services/gai/tabs/presetTemplates.js`

**基礎分析類（4 種）**：

1. **critical_alerts（危險警示）**
   - 資料類型：patientSummary, allergy, medication, lab, imaging
   - 目的：辨識需要立即注意的危險狀況
   - 圖示：Warning（警告圖示）

2. **medication_risks（用藥風險）**
   - 資料類型：patientSummary, allergy, medication, lab, hbcvdata
   - 目的：辨識用藥交互作用、禁忌與劑量問題
   - 圖示：Medication（藥物圖示）

3. **abnormal_labs（檢驗異常值）**
   - 資料類型：lab
   - 目的：列出近期異常檢驗數值並解釋
   - 圖示：Science（實驗室圖示）

4. **imaging_findings（影像重點）**
   - 資料類型：imaging
   - 目的：摘要影像學報告的重要發現
   - 圖示：ImageSearch（影像搜尋圖示）

**專科分析類（2 種）**：

5. **renal_medication（腎功能用藥）**
   - 資料類型：lab, medication, patientSummary
   - 目的：分析腎功能與用藥安全性、劑量調整
   - 圖示：Vaccines（針劑圖示）

6. **diabetes_management（糖尿病管理）**
   - 資料類型：lab, medication, patientSummary
   - 目的：綜合分析血糖控制與用藥
   - 圖示：Favorite（愛心圖示）

**進階分析類（1 種）**：

7. **comprehensive_summary（綜合摘要）**
   - 資料類型：patientSummary, allergy, medication, lab, imaging, discharge
   - 目的：產生門診前病歷摘要
   - 圖示：Description（文件圖示）

**模板結構**：
```javascript
{
  id: 'renal_medication',
  name: '腎功能用藥',
  icon: 'Vaccines',
  category: 'specialized',
  description: '分析腎功能與用藥安全性、劑量調整',
  dataTypes: ['lab', 'medication', 'patientSummary'],
  systemPrompt: '你是腎臟科專家 AI...',
  schema: { /* JSON Schema */ }
}
```

### 2.0.4 9 種醫療資料類型

**位置**：`src/config/dataTypeMetadata.js`

| ID | 中文名稱 | 圖示 | 分類 | 說明 |
|----|---------|------|------|------|
| patientSummary | 患者摘要 | Person | basic | 雲端註記資料、基本資訊 |
| allergy | 過敏史 | HealthAndSafety | basic | 藥物過敏記錄 |
| surgery | 開刀史 | LocalHospital | history | 外科手術記錄 |
| discharge | 住院史 | BedroomBaby | history | 住院出院記錄 |
| hbcvdata | B/C 肝炎 | Coronavirus | history | B、C 肝炎檢驗資料 |
| medication | 用藥記錄 | Medication | medication | 近期用藥處方 |
| lab | 檢驗記錄 | Science | lab | 實驗室檢驗數值 |
| chinesemed | 中藥記錄 | Spa | medication | 中醫處方用藥 |
| imaging | 影像報告 | ImageSearch | imaging | 影像學檢查報告 |

### 2.0.5 資料選擇器 (Data Selector)

**位置**：`src/utils/dataSelector.js`

**核心函數**：
```javascript
export const generateSelectiveXML = (patientData, selectedDataTypes) => {
  // 根據 selectedDataTypes 陣列，選擇性呼叫對應的格式化函數
  // 例如：['medication', 'lab'] → formatMedication() + formatLab()

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
- **彈性組合**：可自由選擇 9 種資料的任意組合

### 2.0.6 Tab 配置對話框 (TabConfigDialog)

**位置**：`src/components/sidebar/TabConfigDialog.jsx`

**UI 結構**：
- **Tab 1-3 選擇器**：下拉選單選擇預設模板（分類顯示：基礎/專科/進階）
- **Tab 4 編輯按鈕**：開啟自訂 Tab 編輯器（Stage 4 實作中）
- **功能按鈕**：
  - "重置為預設"：恢復預設 4 個 Tab 配置
  - "儲存"：保存配置至 `chrome.storage.sync`

**Storage 結構**：
```javascript
// gaiSidebarTabs
[
  { slotIndex: 0, templateId: 'critical_alerts', type: 'preset' },
  { slotIndex: 1, templateId: 'medication_risks', type: 'preset' },
  { slotIndex: 2, templateId: 'abnormal_labs', type: 'preset' },
  { slotIndex: 3, templateId: 'custom', type: 'custom' }
]

// gaiCustomTabConfig
{
  name: '自訂分析',
  icon: 'Star',
  dataTypes: ['medication', 'lab'],
  systemPrompt: '你是專業的醫療AI助理...',
  quickQuestions: ['摘要重點', '列出異常項目'],
  schema: { /* ... */ }
}
```

### 2.0.7 與舊系統的相容性

**向後相容保證**：
1. **自動遷移**：首次使用時自動創建預設配置（對應舊有 4 個固定 Tab）
2. **預設配置**：預設 4 個 Tab 與舊系統的分析類別完全一致
3. **Storage 隔離**：新配置使用獨立的 storage key，不影響現有設定
4. **API 擴充**：`runAnalysisForKey()` 簽名擴充但向下相容

---

## 3. 主要元件說明

### 3.1 GAISettings.jsx - 使用者設定介面

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

#### 3.1.1 雙 API Key 輪流功能

**功能目的**：
為了分擔 API 呼叫流量、避免 Rate Limit，系統支援為每個 Provider 設定兩個 API Key，並在每次呼叫時自動輪流使用。

**Storage 結構**（以 OpenAI 為例）：
```javascript
{
  openaiApiKey: 'sk-xxx',              // 第一個 API Key
  openaiApiKey2: 'sk-yyy',             // 第二個 API Key (選填)
  openaiDualKeyEnabled: false,         // 是否啟用雙 Key 模式
  openaiLastKeyIndex: 0                // 上次使用的 Key 索引 (0 或 1)
}
```

**輪流邏輯**（BaseProvider.js）：
```javascript
async getNextApiKey() {
    // 使用 Mutex 機制確保並發呼叫時的原子性
    // 等待前一個 key rotation 操作完成
    await previousQueue;

    // 讀取 storage
    const { key1, key2, dualEnabled, lastIndex } = await chrome.storage.sync.get(...);

    // 情況 1：未啟用雙 Key → 使用 Key 1
    if (!dualEnabled) return { key: key1, keyIndex: 0 };

    // 情況 2：啟用但 Key 2 為空 → 使用 Key 1
    if (!key2) return { key: key1, keyIndex: 0 };

    // 情況 3：輪流使用
    const nextIndex = lastIndex === 0 ? 1 : 0;
    const nextKey = nextIndex === 0 ? key1 : key2;

    // 先更新 storage，等待完成後才返回（確保原子性）
    await chrome.storage.sync.set({ lastKeyIndex: nextIndex });

    return { key: nextKey, keyIndex: nextIndex };
}
```

**Mutex 機制**：
為了解決並發呼叫時的競態條件（race condition），系統使用 Promise Queue 實作 mutex：

```javascript
// 在 BaseProvider constructor 中初始化
this._keyRotationQueue = Promise.resolve();

// 在 getNextApiKey() 中使用
async getNextApiKey() {
    const previousQueue = this._keyRotationQueue;
    let unlockNext;
    this._keyRotationQueue = new Promise(resolve => { unlockNext = resolve; });

    try {
        await previousQueue;  // 等待前一個操作完成
        // ... 執行 key rotation ...
        return result;
    } finally {
        unlockNext();  // 釋放鎖
    }
}
```

**執行流程範例**（4 個並發 API 呼叫）：
```
T1 (0ms):   危險警示 獲得鎖 → 讀取 lastIndex=0 → 計算 nextIndex=1
T2 (5ms):   危險警示 完成，使用 Key 1，釋放鎖 → 開始 fetch()
T3 (6ms):   用藥風險 獲得鎖 → 讀取 lastIndex=1 → 計算 nextIndex=0
T4 (11ms):  用藥風險 完成，使用 Key 2，釋放鎖 → 開始 fetch()
T5 (12ms):  異常檢驗 獲得鎖 → 讀取 lastIndex=0 → 計算 nextIndex=1
T6 (17ms):  異常檢驗 完成，使用 Key 1，釋放鎖 → 開始 fetch()
T7 (18ms):  影像發現 獲得鎖 → 讀取 lastIndex=1 → 計算 nextIndex=0
T8 (23ms):  影像發現 完成，使用 Key 2，釋放鎖 → 開始 fetch()
T9 (24ms):  四個 API 呼叫並行執行中...
```

**關鍵特性**：
- ✅ **原子性**：Mutex 確保 Key 選擇操作不會衝突
- ✅ **高效能**：只鎖定 Key 選擇（~5ms），API 呼叫仍並行
- ✅ **完美輪流**：Key 1 → Key 2 → Key 1 → Key 2
- ✅ **向後相容**：預設 `dualKeyEnabled: false`，現有用戶不受影響

**UI 顯示**：
- Console 顯示：`🔑 [Provider] 使用 API Key 1 (雙 Key 輪流)`
- Sidebar 顯示：分析結果末尾附加 `[Key 1]` 或 `[Key 2]`

---

### 3.2 Sidebar.jsx - GAI 分析側邊欄（動態 Tab 系統）

**功能**：顯示 GAI 分析結果的可調整大小側邊欄，支援動態 Tab 配置

#### 3.2.1 核心狀態管理（2025-12-31 改版）

**配置狀態**：
```javascript
// 動態 Tab 配置（從 chrome.storage.sync 載入）
const [tabConfigs, setTabConfigs] = useState([]);
// 範例：[
//   { slotIndex: 0, templateId: 'critical_alerts', type: 'preset' },
//   { slotIndex: 1, templateId: 'medication_risks', type: 'preset' },
//   { slotIndex: 2, templateId: 'abnormal_labs', type: 'preset' },
//   { slotIndex: 3, templateId: 'custom', type: 'custom' }
// ]

// 自訂 Tab 配置
const [customTabConfig, setCustomTabConfig] = useState(null);

// Tab 配置對話框狀態
const [configDialogOpen, setConfigDialogOpen] = useState(false);
```

**動態分析狀態**（使用 Map 結構支援任意 Tab 組合）：
```javascript
// 分析結果（動態 key）
const [analysisResults, setAnalysisResults] = useState({});
// 範例：{ 'critical_alerts': [...], 'renal_medication': [...], 'custom': [...] }

// 載入狀態（每個 Tab 獨立）
const [loadingStates, setLoadingStates] = useState({});
// 範例：{ 'critical_alerts': false, 'renal_medication': true, 'custom': false }

// 錯誤狀態（每個 Tab 獨立）
const [errorStates, setErrorStates] = useState({});
// 範例：{ 'critical_alerts': null, 'renal_medication': 'API error', 'custom': null }

const [hasAnalyzed, setHasAnalyzed] = useState(false);  // 避免重複分析
```

**關鍵改變**：
- ✅ 從固定 4 個 key 改為動態 Map 結構
- ✅ 支援任意模板組合（不限於原有 4 種）
- ✅ 自訂 Tab 使用 'custom' 作為 key
- ✅ 狀態在 Tab 配置載入後動態初始化

#### 3.2.2 配置載入流程（2025-12-31 新增）

```javascript
useEffect(() => {
  const loadConfigs = async () => {
    try {
      // 從 chrome.storage.sync 載入配置
      const tabs = await loadSidebarTabs();  // 返回 4 個 tab 配置
      const customConfig = await loadCustomTabConfig();  // 返回自訂 tab 設定

      setTabConfigs(tabs);
      setCustomTabConfig(customConfig);

      // 動態初始化狀態
      const initialResults = {};
      const initialLoadingStates = {};
      const initialErrorStates = {};

      tabs.forEach(tab => {
        const key = tab.type === 'custom' ? 'custom' : tab.templateId;
        initialResults[key] = [];
        initialLoadingStates[key] = false;
        initialErrorStates[key] = null;
      });

      setAnalysisResults(initialResults);
      setLoadingStates(initialLoadingStates);
      setErrorStates(initialErrorStates);
    } catch (error) {
      console.error('[Sidebar] Failed to load tab configs:', error);
    }
  };

  loadConfigs();
}, []);
```

**配置載入特性**：
- 首次使用時自動創建預設配置（向後相容）
- 配置存於 `chrome.storage.sync`（跨裝置同步）
- 載入失敗時使用預設值，確保功能可用

#### 3.2.3 自動分析機制

```javascript
useEffect(() => {
  // 條件：側邊欄開啟 && 資料已載入 && 尚未分析 && 有效資料存在 && 配置已載入
  if (open && isDataLoaded && !isAnalyzing && !hasAnalyzed && hasValidData() && tabConfigs.length > 0) {
    console.log('Sidebar: Auto-analyzing valid patient data...');
    handleAnalyze();
  }
}, [open, isDataLoaded, hasAnalyzed, patientData, tabConfigs]);
```

**自動分析觸發條件**：
- 側邊欄開啟（`open === true`）
- 病患資料已載入（`isDataLoaded === true`）
- 目前沒有進行中的分析（`!isAnalyzing`）
- 尚未執行過分析（`!hasAnalyzed`）
- 病患資料包含有效內容（`hasValidData()` 檢查）
- **Tab 配置已載入**（`tabConfigs.length > 0`）← 新增條件

#### 3.2.4 主要分析流程（2025-12-31 改版）

**handleAnalyze() - 動態啟動所有配置的分析**：
```javascript
const handleAnalyze = () => {
  if (tabConfigs.length === 0) return;  // 防護：配置未載入

  setHasAnalyzed(true);

  // 讀取使用者選擇的 AI 提供者
  chrome.storage.sync.get(['gaiProvider'], (result) => {
    const provider = result.gaiProvider || 'openai';

    // 根據配置動態執行分析
    tabConfigs.forEach(tabConfig => {
      // 1. 取得模板（預設或自訂）
      const template = getTemplate(tabConfig);
      if (!template) return;

      // 2. 生成選擇性 XML（僅包含模板所需資料）
      const xmlData = generateSelectiveXML(patientData, template.dataTypes);

      // 3. 確定分析 key
      const analysisKey = tabConfig.type === 'custom' ? 'custom' : tabConfig.templateId;

      // 4. 執行分析
      runAnalysisForKey(analysisKey, template, xmlData, provider);
    });
  });
};
```

**getTemplate() - 輔助函數**：
```javascript
const getTemplate = (tabConfig) => {
  if (tabConfig.type === 'custom') {
    return customTabConfig;  // 使用自訂 Tab 配置
  } else {
    return tabTemplateManager.getTemplate(tabConfig.templateId);  // 從模板管理器取得
  }
};
```

**關鍵改變**：
- ✅ 不再使用固定的 `GAI_CONFIG`
- ✅ 改用 `tabConfigs.forEach()` 動態迭代
- ✅ 使用 `generateSelectiveXML()` 替代 `generateGAIFormatXML()`
- ✅ 根據模板的 `dataTypes` 選擇性傳送資料
- ✅ 支援自訂 Tab（使用 `customTabConfig`）

**runAnalysisForKey(key, template, xmlData, provider) - 執行單一分析**（簽名已擴充）：
```javascript
const runAnalysisForKey = (key, template, xmlData, provider = 'openai') => {
  // template 包含 systemPrompt 和 schema（不再從 GAI_CONFIG 讀取）

  // 1. 更新載入狀態
  setLoadingStates(prev => ({ ...prev, [key]: true }));
  setErrorStates(prev => ({ ...prev, [key]: null }));

  // 2. 傳送訊息至 background script
  chrome.runtime.sendMessage({
    action: provider === 'gemini' ? 'callGemini' : 'callOpenAI',
    systemPrompt: template.systemPrompt,  // 從 template 讀取
    userPrompt: xmlData,                   // 使用選擇性 XML
    jsonSchema: template.schema,           // 從 template 讀取
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

**簽名變更**：
- 舊：`runAnalysisForKey(key, xmlString, provider)`
- 新：`runAnalysisForKey(key, template, xmlData, provider)`
- 向後相容：可直接傳遞 template 物件，不影響現有呼叫邏輯

#### 3.2.5 動態 UI 渲染（2025-12-31 改版）

**動態 Tab 渲染**：
```javascript
<Tabs value={tabValue} onChange={handleTabChange} variant="fullWidth">
  {tabConfigs && tabConfigs.length > 0 ? tabConfigs.map((tabConfig, index) => {
    const template = getTemplate(tabConfig);
    if (!template) return null;

    const IconComponent = getIconComponent(template.icon);  // 動態載入圖示
    const resultKey = tabConfig.type === 'custom' ? 'custom' : tabConfig.templateId;
    const hasResults = (analysisResults[resultKey] || []).length > 0;

    return (
      <Tab
        key={index}
        icon={
          <Badge variant="dot" invisible={!hasResults}>
            <IconComponent fontSize="small" />
          </Badge>
        }
        label={template.name}
      />
    );
  }) : (
    <Tab icon={<CircularProgress size={20} />} label="載入中..." disabled />
  )}
</Tabs>
```

**動態內容渲染**：
```javascript
{tabConfigs && tabConfigs.length > 0 ? tabConfigs.map((tabConfig, index) => {
  if (tabValue !== index) return null;

  const template = getTemplate(tabConfig);
  const resultKey = tabConfig.type === 'custom' ? 'custom' : tabConfig.templateId;
  const IconComponent = getIconComponent(template.icon);

  return (
    <Box key={index}>
      <Box sx={{ display: 'flex', alignItems: 'center' }}>
        <IconComponent sx={{ mr: 1 }} />
        <Typography variant="subtitle2">{template.name}</Typography>
      </Box>

      {/* 自訂 Tab 的快速提問按鈕 */}
      {tabConfig.type === 'custom' && customTabConfig?.quickQuestions && (
        <Box sx={{ mb: 2 }}>
          {customTabConfig.quickQuestions.map((question, qIndex) => (
            <Chip
              key={qIndex}
              label={question}
              onClick={() => handleQuickQuestion(question, template)}
              sx={{ mr: 1, mb: 1 }}
            />
          ))}
        </Box>
      )}

      {renderContentList(resultKey, listColor, `無${template.name}項目`)}
    </Box>
  );
}) : (
  <Box><CircularProgress /><Typography>正在載入配置...</Typography></Box>
)}
```

**快速提問處理**（替換式）：
```javascript
const handleQuickQuestion = (question, template) => {
  console.log(`[Sidebar] Quick question clicked: "${question}"`);

  // 替換式：用快速提問替換 system prompt
  const modifiedTemplate = {
    ...template,
    systemPrompt: question  // 直接替換
  };

  const xmlData = generateSelectiveXML(patientData, template.dataTypes);

  chrome.storage.sync.get(['gaiProvider'], (result) => {
    const provider = result.gaiProvider || 'openai';
    runAnalysisForKey('custom', modifiedTemplate, xmlData, provider);
  });
};
```

**getIconComponent() - 動態圖示載入**：
```javascript
import * as MuiIcons from '@mui/icons-material';

const getIconComponent = (iconName) => {
  return MuiIcons[iconName] || MuiIcons.Star;  // 預設使用 Star 圖示
};
```

**renderContentList(dataKey, color, emptyMsg) - 渲染分析結果**：
- 載入中：顯示 CircularProgress + "正在分析..."
- 發生錯誤：顯示錯誤訊息 + 重試按鈕
- 無結果：顯示空狀態訊息（使用 template 名稱動態生成）
- 有結果：以列表形式顯示分析項目

**關鍵特性**：
- ✅ Tab 數量、名稱、圖示完全由配置決定
- ✅ 支援任意模板組合（不限於原有 4 種）
- ✅ 自訂 Tab 顯示快速提問按鈕
- ✅ 配置未載入時顯示載入中狀態

---

### 3.3 background.js - 背景服務處理器

**功能**：作為 Chrome Extension 的背景服務，處理 AI API 呼叫

#### 3.3.1 OpenAI API 處理 (callOpenAI)

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

#### 3.3.2 Gemini API 處理 (callGemini)

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

### 3.4 gaiConfig.js - AI 分析配置（已模組化）

**⚠️ 重要變更（2025-12-31）**：此檔案已被模板系統取代，但為了向後相容仍保留。

**原功能**：定義四項分析的 JSON Schema 與 System Prompt

**新系統**：
- 配置已遷移至 `src/services/gai/tabs/presetTemplates.js`
- 使用 TabTemplateManager 統一管理
- `GAI_CONFIG` 仍可用，但建議使用新的模板系統

#### 3.4.1 配置結構（舊系統）

```javascript
export const GAI_CONFIG = {
  critical_alerts: { schema: {...}, systemPrompt: "..." },
  medication_risks: { schema: {...}, systemPrompt: "..." },
  abnormal_labs: { schema: {...}, systemPrompt: "..." },
  imaging_findings: { schema: {...}, systemPrompt: "..." }
};
```

**遷移路徑**：
- `GAI_CONFIG['critical_alerts']` → `tabTemplateManager.getTemplate('critical_alerts')`
- 新系統支援 7 種模板（不只 4 種）
- 舊代碼仍可使用 `GAI_CONFIG`，逐步遷移

#### 3.4.2 四項分析類別（現為 7 種）

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

#### 3.4.3 Schema 結構（以 critical_alerts 為例）

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

### 3.5 gaiCopyFormatter.js - XML 格式化工具（已擴充）

**功能**：將病患資料轉換成結構化 XML 格式供 AI 分析

**⚠️ 重要變更（2025-12-31）**：所有格式化函數已 export，支援選擇性資料傳輸。

#### 3.5.1 主要函數

**generateGAIFormatXML(data) - 生成完整 XML**（向後相容）：
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

**新功能：generateSelectiveXML()** - 見 Section 2.0.5（資料選擇器）

#### 3.5.2 XML 結構範例

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

#### 3.5.3 格式化子函數（已全部 export）

**⚠️ 2025-12-31 變更**：所有格式化函數已改為 export，供資料選擇器使用。

每個資料類型都有對應的格式化函數（現已全部 export）：
- `export const formatPatientSummary()` - 雲端註記資料
- `export const formatAllergy()` - 過敏史
- `export const formatSurgery()` - 開刀史
- `export const formatDischarge()` - 住院史
- `export const formatHBCV()` - B、C 肝炎資料
- `export const formatMedication()` - 近期用藥記錄
- `export const formatLab()` - 近期檢驗記錄
- `export const formatChineseMed()` - 近期中藥記錄
- `export const formatImaging()` - 近期影像學報告

**資料處理特性**：
- 自動過濾無用資訊（如牙科影像提示）
- 清理影像報告格式（移除標記如 "Imaging findings:"）
- 日期格式化（轉換成 zh-TW locale）
- 空資料處理（顯示空標籤）

**用途**：
1. **完整 XML 生成**：`generateGAIFormatXML()` 呼叫所有 formatter
2. **選擇性 XML 生成**：`generateSelectiveXML()` 根據 `dataTypes` 陣列選擇性呼叫 formatter
3. **自訂組合**：開發者可直接 import 需要的 formatter 自由組合

---

## 4. 完整資料流程

### 4.1 初始化流程

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

### 4.2 分析執行流程（2025-12-31 更新）

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

### 4.3 錯誤處理流程

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

## 5. 效能與監控

### 5.1 效能指標追蹤

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

### 5.2 平行處理優勢

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

### 5.3 狀態管理優化

**細緻的載入狀態**：
- 每個分析類別有獨立的 loading/error/result 狀態
- 允許部分成功、部分失敗的情況
- 使用者可看到即時進度（某些已完成，某些仍在載入）

**避免重複分析**：
- `hasAnalyzed` flag 確保自動分析只執行一次
- 手動重新整理時重置 flag
- 資料變更時重置 flag

---

## 6. Token 估算系統

### 6.1 概述

為了在呼叫 AI API 前提供成本預估與配額管理，系統實作了統一的 Token 估算模組（`src/services/gai/tokenCounter.js`），針對繁體中文醫療數據優化。

### 6.2 估算規則

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

### 6.3 核心函數

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

### 6.4 整合方式

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

### 6.5 Console 輸出範例

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

### 6.6 準確度評估

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

### 6.7 使用場景

1. **成本預估**：呼叫前知道大約會消耗多少 tokens
2. **配額管理**：避免超過 Rate Limit（如 Cerebras Free tier 60K TPM）
3. **優化提示詞**：根據 token 用量調整 prompt 長度
4. **除錯分析**：對比估算值與實際用量，找出異常請求

---

## 7. AI 提供者比較

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

## 8. 安全性考量

### 8.1 API Key 儲存
- 儲存位置：`chrome.storage.sync`（用戶本地瀏覽器）
- 不會傳送至伺服器
- 支援 Chrome 同步功能（加密傳輸）

### 8.2 資料隱私
- 病患資料僅在分析時傳送至 AI Provider
- 不儲存於 Extension 伺服器
- XML 格式化後直接傳送，不經過中間伺服器

### 8.3 權限控制
- 需要使用者明確輸入 API Key 才能啟用
- 使用者可隨時關閉 GAI 側邊欄功能
- 支援隱藏/顯示 API Key 功能

---

## 9. 未來擴充性

### 9.1 新增 AI 提供者
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

### 9.2 新增分析類別
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

### 9.3 自訂 System Prompt
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

## 10. 常見問題排查

### 10.1 分析失敗

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

### 10.2 載入無止盡

**症狀**：分析一直顯示 "正在分析..." 不會停止
**解決**：
1. 檢查瀏覽器 Console 是否有錯誤訊息
2. 確認網路連線正常
3. 嘗試手動重新整理（點擊側邊欄重新分析按鈕）

### 10.3 部分分析成功

**症狀**：只有某些類別有結果，其他顯示錯誤
**解決**：
- 這是正常行為（平行處理允許部分失敗）
- 點擊錯誤訊息旁的重試按鈕重新執行該類別分析

### 10.4 Token 估算不準確

**症狀**：估算值與實際用量差異超過 30%
**解決**：
1. 檢查 Console 的 token 估算與實際用量對比
2. 如持續偏高/偏低，可調整 `tokenCounter.js` 中的係數
3. 不同 AI 提供者的 tokenizer 差異可能導致誤差

---

## 11. 開發者注意事項

### 11.1 修改 Schema 時
- 同時更新 `gaiConfig.js` 中的 `schema.schema` 和 `description`
- 確保 `required` 欄位正確設定
- 測試 OpenAI 和 Gemini 兩種提供者

### 11.2 修改 System Prompt 時
- 使用繁體中文醫學術語
- 明確指定輸出格式要求
- 測試不同病患資料的分析結果
- 注意 token 用量，過長的 prompt 會增加成本

### 11.3 新增資料類型至 XML 時
- 在 `gaiCopyFormatter.js` 新增格式化函數
- 在 `generateGAIFormatXML()` 中調用
- 確保使用 XML 標籤包裹（如 `<newdata>...</newdata>`）
- 更新文件說明

### 11.4 新增 AI 提供者時
- 在 `src/services/gai/providers/` 建立新的 Provider 類別
- 繼承 `BaseProvider` 並實作 `callAPI` 方法
- 在 `providerRegistry.js` 註冊新 Provider
- 測試 Token 估算、Rate Limit 處理、錯誤處理
- 無需修改 UI 或其他檔案（自動整合）

---

## 12. 總結

GAI 功能透過以下核心機制運作：

1. **多提供者支援**：支援 4 個 AI 提供者（OpenAI、Gemini、Groq、Cerebras），Provider Registry 自動處理格式轉換
2. **動態 Tab 配置系統**（2025-12-31 新增）：
   - 使用者可配置 4 個分析 Tab（前 3 個從 7 種預設模板選擇，第 4 個為自訂）
   - 支援 7 種預設分析模板（基礎 4 種 + 專科 2 種 + 進階 1 種）
   - 自訂 Tab 支援選擇 9 種資料類型 + 快速提問功能
3. **選擇性資料傳輸**（2025-12-31 新增）：
   - 根據分析模板選擇性傳送所需資料類型
   - 專科分析節省 30-70% token 消耗
   - 提升分析精準度（減少無關資料干擾）
4. **Token 估算**：呼叫前估算 token 用量，針對繁體中文醫療數據優化，誤差範圍 ±20%
5. **平行處理**：所有配置的分析 Tab 同時執行，大幅縮短總處理時間
6. **細緻狀態管理**：每個分析 Tab 獨立的 loading/error/result 狀態（Map 結構支援動態配置）
7. **自動化流程**：側邊欄開啟時自動分析，無需手動觸發
8. **結構化輸出**：透過 JSON Schema 確保 AI 回應格式一致
9. **效能監控**：記錄 Token 用量、執行時間、Rate Limit 狀態，便於成本控制
10. **使用者體驗**：
    - 分析結果可圈選複製
    - 支援多種錯誤重試機制
    - 動態 UI（Tab 名稱、圖示、數量完全由配置決定）
    - 自訂 Tab 快速提問（替換式）

### 12.1 模組化架構優勢

**新模板系統架構**（2025-12-31）：
- **易擴充**：新增分析模板只需在 `presetTemplates.js` 新增一筆資料
- **易維護**：模板集中管理，UI 自動適應
- **使用者友善**：透過 UI 配置，無需修改程式碼
- **向後相容**：預設配置與舊系統完全一致，現有用戶無感升級

**技術特性**：
- ✅ Singleton 模式的 TabTemplateManager
- ✅ Map 結構的動態狀態管理
- ✅ 模板驅動的 UI 生成
- ✅ 選擇性資料格式化（dataSelector + exported formatters）
- ✅ 完整向後相容（GAI_CONFIG 仍可用）

這個模組化架構具有良好的擴充性，可輕鬆：
- 新增 AI 提供者（~80 行程式碼）
- 新增分析模板（~40 行 JSON 配置）
- 自訂資料組合（任意選擇 9 種資料類型）
