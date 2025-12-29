/**
 * Base Provider Class
 *
 * 所有 AI API 提供者必須繼承此抽象類別並實作 callAPI 方法
 */
class BaseProvider {
    constructor(config) {
        if (!config.id) {
            throw new Error('Provider must have an id');
        }
        if (!config.name) {
            throw new Error('Provider must have a name');
        }
        if (!config.apiKeyStorageKey) {
            throw new Error('Provider must have an apiKeyStorageKey');
        }

        this.id = config.id;
        this.name = config.name;
        this.apiKeyStorageKey = config.apiKeyStorageKey;
        this.defaultModel = config.defaultModel || null;
        this.description = config.description || '';
    }

    /**
     * 子類必須實作此方法來呼叫對應的 API
     * @param {string} systemPrompt - System prompt
     * @param {string} userPrompt - User prompt
     * @param {Object} jsonSchema - JSON Schema for structured output
     * @param {Object} options - 額外選項 (model, temperature, etc.)
     * @returns {Promise<Object>} 標準化的回應格式
     */
    async callAPI(systemPrompt, userPrompt, jsonSchema, options = {}) {
        throw new Error('子類必須實作 callAPI 方法');
    }

    /**
     * 標準化回應格式（統一為 OpenAI 格式）
     * 所有提供者應將回應轉換為此格式
     * @param {Object} rawResponse - 原始 API 回應
     * @param {number} duration - 執行時間（毫秒）
     * @returns {Object} 標準化格式
     */
    formatResponse(rawResponse, duration) {
        return {
            choices: [
                {
                    message: {
                        content: rawResponse.content
                    }
                }
            ],
            usage: rawResponse.usage || {},
            duration: duration
        };
    }

    /**
     * 從 Chrome Storage 取得 API Key
     * @returns {Promise<string|null>}
     */
    async getApiKey() {
        return new Promise((resolve) => {
            chrome.storage.sync.get([this.apiKeyStorageKey], (result) => {
                resolve(result[this.apiKeyStorageKey] || null);
            });
        });
    }

    /**
     * 驗證 API Key 是否存在
     * @returns {Promise<boolean>}
     */
    async validateApiKey() {
        const apiKey = await this.getApiKey();
        return !!apiKey;
    }

    /**
     * 取得提供者的基本資訊（用於 UI 顯示）
     * @returns {Object}
     */
    getMetadata() {
        return {
            id: this.id,
            name: this.name,
            apiKeyStorageKey: this.apiKeyStorageKey,
            defaultModel: this.defaultModel,
            description: this.description
        };
    }

    /**
     * 記錄 API 呼叫資訊（供 debug 使用）
     * @param {string} message - 訊息
     * @param {Object} data - 資料
     */
    log(message, data = null) {
        const logData = {
            provider: this.name,
            message,
            timestamp: new Date().toISOString()
        };

        if (data) {
            logData.data = data;
        }

        console.log(`[${this.name} Provider]`, logData);
    }

    /**
     * 記錄錯誤
     * @param {string} message - 錯誤訊息
     * @param {Error} error - 錯誤物件
     */
    logError(message, error) {
        console.error(`[${this.name} Provider Error]`, {
            message,
            error: error.message,
            stack: error.stack,
            timestamp: new Date().toISOString()
        });
    }
}

export default BaseProvider;
