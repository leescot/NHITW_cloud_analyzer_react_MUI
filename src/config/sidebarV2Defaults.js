/**
 * GAI Sidebar V2 預設配置
 *
 * 定義 3 個 Tab 的預設配置：
 * 1. Tab 1 - 自動分析
 * 2. Tab 2 - 快速按鈕（6 個）
 * 3. Tab 3 - Chat 對話
 */

// ==================== Tab 1: 自動分析配置 ====================

export const DEFAULT_AUTO_ANALYSIS_CONFIG = {
  templateId: 'comprehensive_summary',  // 預設使用「綜合摘要」模板
  enabled: false                        // 預設停用自動分析（用戶可在設定中啟用）
};

// ==================== Tab 2: 快速按鈕配置 ====================

export const DEFAULT_QUICK_BUTTONS_CONFIG = [
  // 按鈕 1: 用藥風險
  {
    slotIndex: 0,
    type: 'preset',
    templateId: 'medication_risks',
    customConfig: null,
    label: '用藥風險',
    icon: 'Medication',
    enabled: true
  },

  // 按鈕 2: 檢驗異常
  {
    slotIndex: 1,
    type: 'preset',
    templateId: 'abnormal_labs',
    customConfig: null,
    label: '檢驗異常',
    icon: 'Science',
    enabled: true
  },

  // 按鈕 3: 影像重點
  {
    slotIndex: 2,
    type: 'preset',
    templateId: 'imaging_findings',
    customConfig: null,
    label: '影像重點',
    icon: 'ImageSearch',
    enabled: true
  },

  // 按鈕 4: 腎功能用藥
  {
    slotIndex: 3,
    type: 'preset',
    templateId: 'renal_medication',
    customConfig: null,
    label: '腎功能',
    icon: 'Vaccines',
    enabled: true
  },

  // 按鈕 5: 糖尿病管理
  {
    slotIndex: 4,
    type: 'preset',
    templateId: 'diabetes_management',
    customConfig: null,
    label: '糖尿病',
    icon: 'MonitorHeart',
    enabled: true
  },

  // 按鈕 6: 自訂分析（預設停用）
  {
    slotIndex: 5,
    type: 'custom',
    templateId: null,
    customConfig: {
      name: '自訂分析',
      dataTypes: ['medication', 'lab'],
      systemPrompt: '你是專業的醫療AI助理。請分析以下病歷資料，提供有用的臨床見解。使用台灣醫師常用的繁體中文醫學術語。',
      schema: {
        name: 'custom_button_response',
        strict: true,
        schema: {
          type: 'object',
          properties: {
            analysis_results: {
              type: 'array',
              items: {
                type: 'string',
                description: 'Individual analysis result'
              },
              description: 'List of analysis results'
            }
          },
          required: ['analysis_results'],
          additionalProperties: false
        }
      }
    },
    label: '自訂',
    icon: 'Star',
    enabled: false  // 預設停用，需使用者手動啟用
  }
];

// ==================== Tab 3: Chat 對話配置 ====================

export const DEFAULT_CHAT_CONFIG = {
  enabled: true,  // 預設停用 Chat 功能（用戶可在設定中啟用）

  // System Prompt（繁體中文醫療助理）
  systemPrompt: '你是專業的醫療AI助理。請用台灣醫師常用的繁體中文醫學術語回答問題。提供準確且精簡的臨床見解。',

  // 固定傳送全部 9 種醫療資料
  dataTypes: [
    'patientSummary',  // 備註資料
    'diagnosis',       // 診斷/收案
    'allergy',         // 過敏史
    'surgery',         // 手術
    'discharge',       // 住院
    'hbcvdata',        // BC肝
    'medication',      // 西藥
    'lab',             // 檢驗
    'chinesemed',      // 中藥
    'imaging'          // 影像
  ],

  // 快速提問按鈕（預設 2 個）
  quickQuestions: [
    '一段話精簡病史：',
    '一句話形容這位病人：'
  ],

  // 對話歷史設定
  enableHistory: true,      // 啟用對話歷史
  maxHistoryLength: 5       // 最多保存 5 輪對話
};

// ==================== 工具函數 ====================

/**
 * 取得所有預設配置
 */
export const getAllDefaults = () => ({
  autoAnalysis: DEFAULT_AUTO_ANALYSIS_CONFIG,
  quickButtons: DEFAULT_QUICK_BUTTONS_CONFIG,
  chat: DEFAULT_CHAT_CONFIG
});

/**
 * 驗證自動分析配置
 */
export const validateAutoAnalysisConfig = (config) => {
  if (!config || typeof config !== 'object') return false;
  if (typeof config.templateId !== 'string') return false;
  if (typeof config.enabled !== 'boolean') return false;
  return true;
};

/**
 * 驗證快速按鈕配置
 */
export const validateQuickButtonsConfig = (config) => {
  if (!Array.isArray(config)) return false;
  if (config.length === 0 || config.length > 6) return false;

  return config.every(btn => {
    if (!btn || typeof btn !== 'object') return false;
    if (typeof btn.slotIndex !== 'number' || btn.slotIndex < 0 || btn.slotIndex > 5) return false;
    if (btn.type !== 'preset' && btn.type !== 'custom') return false;
    if (typeof btn.label !== 'string') return false;
    if (typeof btn.icon !== 'string') return false;
    if (typeof btn.enabled !== 'boolean') return false;

    // Preset 類型必須有 templateId
    if (btn.type === 'preset' && typeof btn.templateId !== 'string') return false;

    // Custom 類型必須有 customConfig
    if (btn.type === 'custom' && !btn.customConfig) return false;

    return true;
  });
};

/**
 * 驗證 Chat 配置
 */
export const validateChatConfig = (config) => {
  if (!config || typeof config !== 'object') return false;
  if (typeof config.enabled !== 'boolean') return false;
  if (typeof config.systemPrompt !== 'string') return false;
  if (!Array.isArray(config.dataTypes) || config.dataTypes.length === 0) return false;
  if (!Array.isArray(config.quickQuestions)) return false;
  if (typeof config.enableHistory !== 'boolean') return false;
  if (typeof config.maxHistoryLength !== 'number' || config.maxHistoryLength < 1) return false;
  return true;
};
