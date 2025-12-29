/**
 * Prompt Manager
 *
 * 管理所有 prompt 模板的註冊、查詢與使用
 */

class PromptManager {
    constructor() {
        this.templates = new Map();
    }

    /**
     * 註冊模板
     * @param {Object} template - Prompt 模板
     * @throws {Error} 如果模板格式不正確
     */
    registerTemplate(template) {
        // 驗證模板格式
        if (!template.id) {
            throw new Error('Template must have an id');
        }
        if (!template.name) {
            throw new Error('Template must have a name');
        }
        if (!template.categories || typeof template.categories !== 'object') {
            throw new Error('Template must have categories object');
        }

        if (this.templates.has(template.id)) {
            console.warn(`[Prompt Manager] Template "${template.id}" is already registered. Overwriting...`);
        }

        this.templates.set(template.id, template);
        console.log(`[Prompt Manager] Registered template: ${template.name} (${template.id})`);
    }

    /**
     * 註冊多個模板
     * @param {Array<Object>} templates - 模板陣列
     */
    registerTemplates(templates) {
        templates.forEach(template => this.registerTemplate(template));
    }

    /**
     * 取得單一模板
     * @param {string} id - Template ID
     * @returns {Object|undefined}
     */
    getTemplate(id) {
        const template = this.templates.get(id);

        if (!template) {
            console.warn(`[Prompt Manager] Template not found: ${id}`);
        }

        return template;
    }

    /**
     * 取得所有模板
     * @returns {Array<Object>}
     */
    getAllTemplates() {
        return Array.from(this.templates.values());
    }

    /**
     * 取得模板的 metadata（用於 UI 顯示）
     * @returns {Array<Object>}
     */
    getTemplateMetadata() {
        return this.getAllTemplates().map(template => ({
            id: template.id,
            name: template.name,
            description: template.description,
            version: template.version,
            categoryCount: Object.keys(template.categories).length,
            categories: Object.keys(template.categories)
        }));
    }

    /**
     * 取得單一類別的配置
     * @param {string} templateId - Template ID
     * @param {string} categoryKey - Category key
     * @returns {Object|undefined}
     */
    getCategoryConfig(templateId, categoryKey) {
        const template = this.getTemplate(templateId);

        if (!template) {
            return undefined;
        }

        const config = template.categories[categoryKey];

        if (!config) {
            console.warn(`[Prompt Manager] Category not found: ${templateId}/${categoryKey}`);
        }

        return config;
    }

    /**
     * 取得模板的所有類別 keys
     * @param {string} templateId - Template ID
     * @returns {Array<string>}
     */
    getCategoryKeys(templateId) {
        const template = this.getTemplate(templateId);

        if (!template) {
            return [];
        }

        return Object.keys(template.categories);
    }

    /**
     * 檢查模板是否存在
     * @param {string} id - Template ID
     * @returns {boolean}
     */
    hasTemplate(id) {
        return this.templates.has(id);
    }

    /**
     * 檢查類別是否存在
     * @param {string} templateId - Template ID
     * @param {string} categoryKey - Category key
     * @returns {boolean}
     */
    hasCategory(templateId, categoryKey) {
        const template = this.getTemplate(templateId);

        if (!template) {
            return false;
        }

        return categoryKey in template.categories;
    }

    /**
     * 取消註冊模板
     * @param {string} id - Template ID
     * @returns {boolean} 是否成功取消註冊
     */
    unregisterTemplate(id) {
        const success = this.templates.delete(id);

        if (success) {
            console.log(`[Prompt Manager] Unregistered template: ${id}`);
        } else {
            console.warn(`[Prompt Manager] Failed to unregister template: ${id}`);
        }

        return success;
    }

    /**
     * 清除所有模板（主要用於測試）
     */
    clearTemplates() {
        this.templates.clear();
        console.log('[Prompt Manager] All templates cleared');
    }

    /**
     * 取得模板數量
     * @returns {number}
     */
    getTemplateCount() {
        return this.templates.size;
    }

    /**
     * 驗證類別配置的完整性
     * @param {string} templateId - Template ID
     * @param {string} categoryKey - Category key
     * @returns {Object} { valid: boolean, errors: string[] }
     */
    validateCategoryConfig(templateId, categoryKey) {
        const errors = [];
        const config = this.getCategoryConfig(templateId, categoryKey);

        if (!config) {
            return { valid: false, errors: ['Category not found'] };
        }

        if (!config.schema) {
            errors.push('Missing schema');
        } else {
            if (!config.schema.name) {
                errors.push('Schema missing name');
            }
            if (!config.schema.schema) {
                errors.push('Schema missing schema object');
            }
        }

        if (!config.systemPrompt || typeof config.systemPrompt !== 'string') {
            errors.push('Missing or invalid systemPrompt');
        }

        return {
            valid: errors.length === 0,
            errors
        };
    }
}

// 創建單例實例
export const promptManager = new PromptManager();

// 自動註冊內建模板
import templates from './templates/index.js';

Object.values(templates).forEach(template => {
    promptManager.registerTemplate(template);
});

console.log(`[Prompt Manager] Initialized with ${promptManager.getTemplateCount()} template(s)`);

export default PromptManager;
