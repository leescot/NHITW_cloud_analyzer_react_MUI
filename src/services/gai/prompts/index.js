/**
 * Prompts Module
 *
 * 統一匯出所有 Prompt 相關的類別與函數
 */

// Prompt Manager
export { promptManager, default as PromptManager } from './PromptManager.js';

// Templates
export { templates, getAllTemplateMetadata, getTemplateMetadata } from './templates/index.js';
export { defaultAnalysisTemplate } from './templates/defaultAnalysis.js';
