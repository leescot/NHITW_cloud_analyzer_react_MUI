/**
 * Prompt Templates Registry
 *
 * 匯出所有可用的 prompt 模板
 */

import { defaultAnalysisTemplate } from './defaultAnalysis.js';

// 所有可用的模板
export const templates = {
    default_analysis: defaultAnalysisTemplate
    // 未來可以在這裡新增更多模板
    // extended_analysis: extendedAnalysisTemplate,
    // custom_template: customTemplate,
};

// 取得所有模板的 metadata
export function getAllTemplateMetadata() {
    return Object.values(templates).map(template => ({
        id: template.id,
        name: template.name,
        description: template.description,
        version: template.version,
        categoryCount: Object.keys(template.categories).length
    }));
}

// 取得單一模板的 metadata
export function getTemplateMetadata(templateId) {
    const template = templates[templateId];
    if (!template) return null;

    return {
        id: template.id,
        name: template.name,
        description: template.description,
        version: template.version,
        categoryCount: Object.keys(template.categories).length,
        categories: Object.keys(template.categories)
    };
}

export default templates;
