/**
 * Tab Template Manager
 *
 * 管理所有 Tab 模板（預設與自訂）
 */

import { PRESET_TEMPLATES } from './presetTemplates.js';

class TabTemplateManager {
  constructor() {
    // 預設模板（從 presetTemplates 載入）
    this.templates = new Map();

    // 載入預設模板
    this.loadPresetTemplates();
  }

  /**
   * 載入預設模板
   */
  loadPresetTemplates() {
    Object.values(PRESET_TEMPLATES).forEach(template => {
      this.templates.set(template.id, template);
    });

    console.log(`[TabTemplateManager] Loaded ${this.templates.size} preset templates`);
  }

  /**
   * 取得單一模板
   * @param {string} id - 模板 ID
   * @returns {Object|null} 模板物件或 null
   */
  getTemplate(id) {
    return this.templates.get(id) || null;
  }

  /**
   * 取得所有模板
   * @returns {Array} 模板陣列
   */
  getAllTemplates() {
    return Array.from(this.templates.values());
  }

  /**
   * 取得模板元數據（用於 UI 顯示）
   * @returns {Array} 模板元數據陣列
   */
  getTemplateMetadata() {
    return this.getAllTemplates().map(template => ({
      id: template.id,
      name: template.name,
      icon: template.icon,
      category: template.category,
      description: template.description
    }));
  }

  /**
   * 按分類取得模板
   * @param {string} category - 分類 ('basic', 'specialized', 'advanced')
   * @returns {Array} 該分類的模板陣列
   */
  getTemplatesByCategory(category) {
    return this.getAllTemplates().filter(template => template.category === category);
  }

  /**
   * 檢查模板是否存在
   * @param {string} id - 模板 ID
   * @returns {boolean}
   */
  hasTemplate(id) {
    return this.templates.has(id);
  }

  /**
   * 取得模板數量
   * @returns {number}
   */
  getTemplateCount() {
    return this.templates.size;
  }

  /**
   * 驗證模板配置
   * @param {string} id - 模板 ID
   * @returns {Object} 驗證結果 { valid: boolean, errors: string[] }
   */
  validateTemplate(id) {
    const template = this.getTemplate(id);

    if (!template) {
      return {
        valid: false,
        errors: [`Template not found: ${id}`]
      };
    }

    const errors = [];

    // 檢查必要欄位
    if (!template.id) errors.push('Missing template.id');
    if (!template.name) errors.push('Missing template.name');
    if (!template.systemPrompt) errors.push('Missing template.systemPrompt');
    if (!template.dataTypes || !Array.isArray(template.dataTypes)) {
      errors.push('Missing or invalid template.dataTypes');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * 註冊新模板（用於未來擴充）
   * @param {Object} template - 模板物件
   * @returns {boolean} 是否成功註冊
   */
  registerTemplate(template) {
    if (!template || !template.id) {
      console.error('[TabTemplateManager] Invalid template:', template);
      return false;
    }

    if (this.templates.has(template.id)) {
      console.warn(`[TabTemplateManager] Template ${template.id} already exists. Overwriting.`);
    }

    this.templates.set(template.id, template);
    console.log(`[TabTemplateManager] Registered template: ${template.id}`);
    return true;
  }

  /**
   * 取消註冊模板
   * @param {string} id - 模板 ID
   * @returns {boolean} 是否成功取消註冊
   */
  unregisterTemplate(id) {
    if (!this.templates.has(id)) {
      console.warn(`[TabTemplateManager] Template ${id} not found`);
      return false;
    }

    this.templates.delete(id);
    console.log(`[TabTemplateManager] Unregistered template: ${id}`);
    return true;
  }
}

// 建立單例實例
const tabTemplateManager = new TabTemplateManager();

// 匯出單例
export default tabTemplateManager;

// 匯出類別（用於測試或特殊用途）
export { TabTemplateManager };
