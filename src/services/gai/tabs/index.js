/**
 * GAI Tabs 模組統一匯出
 */

import tabTemplateManager, { TabTemplateManager } from './TabTemplateManager.js';
import { PRESET_TEMPLATES, getAllTemplates, getTemplate, getTemplateMetadata, getTemplatesByCategory } from './presetTemplates.js';

// 匯出單例實例（主要使用）
export default tabTemplateManager;

// 匯出類別（用於測試或特殊用途）
export { TabTemplateManager };

// 匯出預設模板相關
export { PRESET_TEMPLATES, getAllTemplates, getTemplate, getTemplateMetadata, getTemplatesByCategory };
