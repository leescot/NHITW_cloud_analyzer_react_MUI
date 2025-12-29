# GAI 功能模組化重構計畫

## 1. 重構目標

在不改變現有功能的前提下，將 GAI 功能模組化，以支援：
1. 多種 API 提供商（OpenAI, Gemini, Claude, 自訂 API 等）
2. 不同的 system_prompt + user_prompt 組合
3. 使用者可選擇不同的分析模板
4. 易於擴充新的提供者和分析模板

## 2. 新架構設計

### 2.1 目錄結構

```
src/
├── services/
│   └── gai/
│       ├── providers/                       # API 提供者適配器
│       │   ├── BaseProvider.js              # 抽象基礎類別
│       │   ├── OpenAIProvider.js            # OpenAI 實作
│       │   ├── GeminiProvider.js            # Gemini 實作
│       │   ├── providerRegistry.js          # 提供者註冊表
│       │   └── index.js                     # 對外匯出
│       ├── prompts/                         # Prompt 模板管理
│       │   ├── templates/                   # 模板定義
│       │   │   ├── defaultAnalysis.js       # 目前的四項分析
│       │   │   └── index.js                 # 模板註冊表
│       │   ├── PromptManager.js             # Prompt 管理器
│       │   └── index.js
│       ├── AnalysisEngine.js                # 分析執行引擎
│       └── index.js                         # 統一對外介面
└── config/
    └── gaiConfig.js                         # 簡化後的配置檔（向後相容）
```

### 2.2 核心模組說明

#### 2.2.1 Provider 抽象層

**BaseProvider.js** - 定義統一介面
```javascript
class BaseProvider {
  constructor(config) {
    this.id = config.id;
    this.name = config.name;
    this.apiKeyStorageKey = config.apiKeyStorageKey;
  }

  // 子類必須實作
  async callAPI(systemPrompt, userPrompt, jsonSchema, options) {
    throw new Error('Must implement callAPI method');
  }

  // 標準化回應格式
  formatResponse(rawResponse, duration) {
    return {
      choices: [{ message: { content: ... } }],
      usage: { total_tokens: ..., ... },
      duration: duration
    };
  }

  // 取得 API Key
  async getApiKey() {
    return new Promise((resolve) => {
      chrome.storage.sync.get([this.apiKeyStorageKey], (result) => {
        resolve(result[this.apiKeyStorageKey]);
      });
    });
  }
}
```

**OpenAIProvider.js** - OpenAI 實作
```javascript
class OpenAIProvider extends BaseProvider {
  constructor() {
    super({
      id: 'openai',
      name: 'OpenAI',
      apiKeyStorageKey: 'openaiApiKey',
      defaultModel: 'gpt-5-nano'
    });
  }

  async callAPI(systemPrompt, userPrompt, jsonSchema, options = {}) {
    const apiKey = await this.getApiKey();
    if (!apiKey) throw new Error('API Key not found');

    const startTime = Date.now();
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: options.model || this.defaultModel,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        response_format: {
          type: "json_schema",
          json_schema: jsonSchema
        }
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || `HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    const duration = Date.now() - startTime;

    return this.formatResponse(data, duration);
  }

  formatResponse(rawResponse, duration) {
    return {
      choices: rawResponse.choices,
      usage: rawResponse.usage,
      duration: duration
    };
  }
}
```

**GeminiProvider.js** - Gemini 實作（類似結構）

**providerRegistry.js** - 提供者註冊機制
```javascript
import OpenAIProvider from './OpenAIProvider';
import GeminiProvider from './GeminiProvider';

const providers = new Map();

// 註冊內建提供者
export function registerBuiltInProviders() {
  registerProvider(new OpenAIProvider());
  registerProvider(new GeminiProvider());
}

export function registerProvider(provider) {
  if (!(provider instanceof BaseProvider)) {
    throw new Error('Provider must extend BaseProvider');
  }
  providers.set(provider.id, provider);
}

export function getProvider(id) {
  return providers.get(id);
}

export function getAllProviders() {
  return Array.from(providers.values());
}

export function getProviderMetadata() {
  return getAllProviders().map(p => ({
    id: p.id,
    name: p.name,
    apiKeyStorageKey: p.apiKeyStorageKey
  }));
}
```

#### 2.2.2 Prompt 模板系統

**templates/defaultAnalysis.js** - 目前的四項分析模板
```javascript
export const defaultAnalysisTemplate = {
  id: 'default_analysis',
  name: '預設四項分析',
  description: '注意事項、用藥風險、異常檢驗、影像發現',
  categories: {
    critical_alerts: {
      schema: {
        name: "critical_alerts_response",
        strict: true,
        schema: {
          type: "object",
          properties: {
            critical_alerts: {
              type: "array",
              items: { type: "string" }
            }
          },
          required: ["critical_alerts"],
          additionalProperties: false
        }
      },
      systemPrompt: "You are an expert medical AI assistant..."
    },
    medication_risks: { /* ... */ },
    abnormal_labs: { /* ... */ },
    imaging_findings: { /* ... */ }
  }
};
```

**PromptManager.js** - Prompt 管理器
```javascript
class PromptManager {
  constructor() {
    this.templates = new Map();
  }

  registerTemplate(template) {
    this.templates.set(template.id, template);
  }

  getTemplate(id) {
    return this.templates.get(id);
  }

  getAllTemplates() {
    return Array.from(this.templates.values());
  }

  getCategoryConfig(templateId, categoryKey) {
    const template = this.getTemplate(templateId);
    return template?.categories[categoryKey];
  }
}

export const promptManager = new PromptManager();

// 註冊預設模板
import { defaultAnalysisTemplate } from './templates/defaultAnalysis';
promptManager.registerTemplate(defaultAnalysisTemplate);
```

#### 2.2.3 分析執行引擎

**AnalysisEngine.js** - 統一的分析執行邏輯
```javascript
import { getProvider } from './providers/providerRegistry';
import { promptManager } from './prompts/PromptManager';

class AnalysisEngine {
  async runAnalysis(config) {
    const {
      providerId,
      templateId,
      categoryKey,
      userPrompt,
      options = {}
    } = config;

    // 1. 取得提供者
    const provider = getProvider(providerId);
    if (!provider) {
      throw new Error(`Provider not found: ${providerId}`);
    }

    // 2. 取得 prompt 配置
    const categoryConfig = promptManager.getCategoryConfig(templateId, categoryKey);
    if (!categoryConfig) {
      throw new Error(`Category config not found: ${templateId}/${categoryKey}`);
    }

    // 3. 執行 API 呼叫
    try {
      const response = await provider.callAPI(
        categoryConfig.systemPrompt,
        userPrompt,
        categoryConfig.schema,
        options
      );

      return {
        success: true,
        data: response
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  async runBatchAnalysis(config) {
    const {
      providerId,
      templateId,
      userPrompt,
      options = {}
    } = config;

    const template = promptManager.getTemplate(templateId);
    if (!template) {
      throw new Error(`Template not found: ${templateId}`);
    }

    // 平行執行所有類別的分析
    const categoryKeys = Object.keys(template.categories);
    const promises = categoryKeys.map(categoryKey =>
      this.runAnalysis({
        providerId,
        templateId,
        categoryKey,
        userPrompt,
        options
      }).then(result => ({ categoryKey, result }))
    );

    return Promise.all(promises);
  }
}

export const analysisEngine = new AnalysisEngine();
```

#### 2.2.4 統一對外介面

**services/gai/index.js**
```javascript
import { registerBuiltInProviders, getProvider, getAllProviders, getProviderMetadata } from './providers';
import { promptManager } from './prompts/PromptManager';
import { analysisEngine } from './AnalysisEngine';

// 初始化
registerBuiltInProviders();

export {
  // Providers
  getProvider,
  getAllProviders,
  getProviderMetadata,

  // Prompts
  promptManager,

  // Analysis
  analysisEngine
};
```

## 3. 重構步驟

### 3.1 Phase 1: 創建新模組（不影響現有功能）

1. 創建 `src/services/gai/` 目錄結構
2. 實作 `BaseProvider.js`
3. 實作 `OpenAIProvider.js`（將 background.js 的邏輯遷移）
4. 實作 `GeminiProvider.js`（將 background.js 的邏輯遷移）
5. 實作 `providerRegistry.js`
6. 實作 `templates/defaultAnalysis.js`（將 gaiConfig.js 的配置遷移）
7. 實作 `PromptManager.js`
8. 實作 `AnalysisEngine.js`
9. 創建統一對外介面 `services/gai/index.js`

### 3.2 Phase 2: 重構 background.js

1. 引入新的模組化架構
2. 簡化 `callOpenAI` 和 `callGemini` handler
3. 使用 `analysisEngine.runAnalysis()` 替代原有邏輯
4. 保持向後相容（現有的 message action 仍然支援）

**重構後的 background.js**:
```javascript
import { getProvider } from './services/gai';

// 新的統一處理器
['callGAI', async (message, sender, sendResponse) => {
  const { providerId, systemPrompt, userPrompt, jsonSchema, options } = message;

  try {
    const provider = getProvider(providerId);
    if (!provider) {
      sendResponse({ success: false, error: `Provider not found: ${providerId}` });
      return;
    }

    const response = await provider.callAPI(systemPrompt, userPrompt, jsonSchema, options);
    sendResponse({ success: true, data: response });

  } catch (error) {
    sendResponse({ success: false, error: error.message });
  }
}],

// 保留向後相容
['callOpenAI', async (message, sender, sendResponse) => {
  message.providerId = 'openai';
  ACTION_HANDLERS.get('callGAI')(message, sender, sendResponse);
}],

['callGemini', async (message, sender, sendResponse) => {
  message.providerId = 'gemini';
  ACTION_HANDLERS.get('callGAI')(message, sender, sendResponse);
}]
```

### 3.3 Phase 3: 重構 GAISettings.jsx

1. 引入 `getProviderMetadata()` 取得動態提供者列表
2. 動態生成提供者選單
3. 動態生成 API Key 輸入欄位
4. 保持現有 UI/UX 不變

**重構重點**:
```javascript
import { getProviderMetadata } from '../../services/gai';

const GAISettings = () => {
  const [providerMetadata, setProviderMetadata] = useState([]);

  useEffect(() => {
    // 取得所有提供者資訊
    const metadata = getProviderMetadata();
    setProviderMetadata(metadata);
  }, []);

  // 動態生成選單
  <Select value={gaiProvider} onChange={...}>
    {providerMetadata.map(provider => (
      <MenuItem key={provider.id} value={provider.id}>
        {provider.name}
      </MenuItem>
    ))}
  </Select>

  // 動態取得當前 API Key
  const currentProvider = providerMetadata.find(p => p.id === gaiProvider);
  const apiKeyStorageKey = currentProvider?.apiKeyStorageKey;
```

### 3.4 Phase 4: 重構 Sidebar.jsx

1. 引入 `promptManager` 和 `analysisEngine`
2. 支援選擇不同的分析模板（目前先使用預設模板）
3. 使用新的分析引擎執行分析
4. 保持現有 UI/UX 和平行處理機制

**重構重點**:
```javascript
import { promptManager, analysisEngine } from '../../services/gai';

const handleAnalyze = async () => {
  setHasAnalyzed(true);
  const xmlString = generateGAIFormatXML(patientData);

  chrome.storage.sync.get(['gaiProvider'], async (result) => {
    const providerId = result.gaiProvider || 'openai';
    const templateId = 'default_analysis'; // 目前固定使用預設模板

    // 取得模板的所有類別
    const template = promptManager.getTemplate(templateId);
    const categoryKeys = Object.keys(template.categories);

    // 平行執行所有分析
    categoryKeys.forEach(categoryKey => {
      runAnalysisForKey(categoryKey, xmlString, providerId, templateId);
    });
  });
};

const runAnalysisForKey = async (categoryKey, xmlString, providerId, templateId) => {
  setLoadingStates(prev => ({ ...prev, [categoryKey]: true }));
  setErrorStates(prev => ({ ...prev, [categoryKey]: null }));

  const result = await analysisEngine.runAnalysis({
    providerId,
    templateId,
    categoryKey,
    userPrompt: xmlString
  });

  setLoadingStates(prev => ({ ...prev, [categoryKey]: false }));

  if (!result.success) {
    setErrorStates(prev => ({ ...prev, [categoryKey]: result.error }));
  } else {
    // 處理成功回應（與現有邏輯相同）
    // ...
  }
};
```

## 4. 向後相容性保證

### 4.1 保持不變的部分
- 現有的 `gaiConfig.js` 配置檔案（可能標記為 deprecated）
- Chrome storage 的 key 名稱（`openaiApiKey`, `geminiApiKey`, `gaiProvider`）
- UI/UX 完全不變
- API 呼叫的 message action 名稱（`callOpenAI`, `callGemini`）

### 4.2 新增但不影響現有功能
- 新的模組化架構在 `src/services/gai/`
- 新的統一 API handler `callGAI`
- 提供者註冊機制
- Prompt 模板系統

## 5. 未來擴充範例

### 5.1 新增 Claude AI 提供者

```javascript
// src/services/gai/providers/ClaudeProvider.js
import BaseProvider from './BaseProvider';

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
    const apiKey = await this.getApiKey();
    // Claude API 實作...
  }
}

export default ClaudeProvider;

// 在 providerRegistry.js 中註冊
import ClaudeProvider from './ClaudeProvider';
registerProvider(new ClaudeProvider());
```

### 5.2 新增自訂分析模板

```javascript
// src/services/gai/prompts/templates/extendedAnalysis.js
export const extendedAnalysisTemplate = {
  id: 'extended_analysis',
  name: '進階六項分析',
  description: '包含基本四項 + 過敏檢查 + 腎功能評估',
  categories: {
    // 繼承預設的四項
    ...defaultAnalysisTemplate.categories,

    // 新增兩項
    allergy_check: {
      schema: { /* ... */ },
      systemPrompt: "檢查用藥與已知過敏史的潛在衝突..."
    },
    renal_assessment: {
      schema: { /* ... */ },
      systemPrompt: "基於腎功能數值評估用藥劑量調整..."
    }
  }
};

// 註冊模板
promptManager.registerTemplate(extendedAnalysisTemplate);
```

### 5.3 使用者選擇模板（未來功能）

```javascript
// GAISettings.jsx 中新增模板選擇
<FormControl fullWidth size="small">
  <InputLabel>分析模板</InputLabel>
  <Select value={selectedTemplate} onChange={...}>
    {promptManager.getAllTemplates().map(template => (
      <MenuItem key={template.id} value={template.id}>
        {template.name} - {template.description}
      </MenuItem>
    ))}
  </Select>
</FormControl>
```

## 6. 測試計畫

### 6.1 單元測試（可選）
- 測試 `BaseProvider` 的抽象方法強制實作
- 測試 `providerRegistry` 的註冊與查詢
- 測試 `PromptManager` 的模板管理
- 測試 `AnalysisEngine` 的分析執行

### 6.2 整合測試
1. 測試 OpenAI 提供者是否正常運作
2. 測試 Gemini 提供者是否正常運作
3. 測試切換提供者功能
4. 測試四項分析的平行執行
5. 測試錯誤處理機制

### 6.3 回歸測試
- 確保所有現有功能完全正常
- 確保 UI/UX 沒有改變
- 確保資料儲存格式相容
- 確保效能沒有退化

## 7. 重構時程

| 階段 | 工作項目 | 預估工時 |
|------|---------|---------|
| Phase 1 | 創建模組化架構 | 4-6 小時 |
| Phase 2 | 重構 background.js | 1-2 小時 |
| Phase 3 | 重構 GAISettings.jsx | 2-3 小時 |
| Phase 4 | 重構 Sidebar.jsx | 2-3 小時 |
| 測試 | 整合測試與回歸測試 | 2-3 小時 |
| **總計** | | **11-17 小時** |

## 8. 風險評估

### 8.1 技術風險
- **風險**: 模組化過程中可能引入 bug
- **緩解**: 保持向後相容，逐步遷移，充分測試

### 8.2 相容性風險
- **風險**: 舊的設定資料可能不相容
- **緩解**: 保持 storage key 名稱不變，提供遷移機制

### 8.3 效能風險
- **風險**: 新架構可能增加額外開銷
- **緩解**: 使用單例模式，避免重複初始化

## 9. 總結

這個模組化重構計畫將為 GAI 功能帶來：

**優點**:
1. 易於新增新的 API 提供者（只需實作 BaseProvider）
2. 易於新增新的分析模板（只需定義 template 並註冊）
3. 程式碼結構清晰，職責分離
4. 維護性大幅提升
5. 向後完全相容

**實作原則**:
1. 不影響現有功能
2. 保持 UI/UX 不變
3. 保持儲存格式相容
4. 逐步遷移，充分測試
