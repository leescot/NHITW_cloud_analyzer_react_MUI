/**
 * Sidebar Tab 預設配置
 *
 * 定義 Sidebar Tab 的預設值與自訂 Tab 的預設配置
 */

/**
 * 預設的 4 個 Tab 配置
 * 對應現有的 4 個分析類別，確保向後相容
 */
export const DEFAULT_SIDEBAR_TABS = [
  { slotIndex: 0, templateId: 'critical_alerts', type: 'preset' },
  { slotIndex: 1, templateId: 'medication_risks', type: 'preset' },
  { slotIndex: 2, templateId: 'abnormal_labs', type: 'preset' },
  { slotIndex: 3, templateId: 'imaging_findings', type: 'preset' }
];

/**
 * 預設的自訂 Tab 配置
 */
export const DEFAULT_CUSTOM_TAB_CONFIG = {
  name: '自訂分析',
  icon: 'Star',
  description: '我的自訂分析',
  dataTypes: ['medication', 'lab'],  // 預設選擇用藥與檢驗
  systemPrompt: '你是專業的醫療AI助理。請分析以下病歷資料，提供有用的臨床見解。使用台灣醫師常用的繁體中文醫學術語。',
  quickQuestions: [
    '摘要重點',
    '列出異常項目',
    '分析用藥安全'
  ],
  schema: {
    name: 'custom_analysis_response',
    strict: true,
    schema: {
      type: 'object',
      properties: {
        analysis_results: {
          type: 'array',
          items: { type: 'string' },
          description: 'List of analysis results'
        }
      },
      required: ['analysis_results'],
      additionalProperties: false
    }
  },
  version: '1.0.0'
};
