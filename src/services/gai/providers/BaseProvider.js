import { estimatePromptTokens, formatTokenCount } from '../tokenCounter.js';

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

        // 雙 API Key 輪流功能相關的 storage keys
        this.apiKey2StorageKey = `${config.apiKeyStorageKey}2`;
        this.dualKeyEnabledStorageKey = config.apiKeyStorageKey.replace('ApiKey', 'DualKeyEnabled');
        this.lastKeyIndexStorageKey = config.apiKeyStorageKey.replace('ApiKey', 'LastKeyIndex');

        // Key rotation mutex - 確保並發呼叫時的原子性
        this._keyRotationQueue = Promise.resolve();
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
     * @param {number} keyIndex - 使用的 API Key 索引（0 或 1），預設為 0
     * @returns {Object} 標準化格式
     */
    formatResponse(rawResponse, duration, keyIndex = 0) {
        return {
            choices: [
                {
                    message: {
                        content: rawResponse.content
                    }
                }
            ],
            usage: rawResponse.usage || {},
            duration: duration,
            keyUsed: `Key ${keyIndex + 1}`  // 新增：記錄使用的 API Key
        };
    }

    /**
     * 從 Chrome Storage 取得 API Key
     * @deprecated 請使用 getNextApiKey() 以支援雙 Key 輪流功能
     * @returns {Promise<string|null>}
     */
    async getApiKey() {
        const result = await this.getNextApiKey();
        return result.key;
    }

    /**
     * 取得下一個可用的 API Key（支援雙 Key 輪流）
     * 使用 mutex 確保並發呼叫時的原子性
     * @returns {Promise<{key: string|null, keyIndex: number, message: string}>}
     */
    async getNextApiKey() {
        // 等待前一個 key rotation 操作完成
        const previousQueue = this._keyRotationQueue;

        // 建立新的 promise 作為下一個操作的等待點
        let unlockNext;
        this._keyRotationQueue = new Promise(resolve => {
            unlockNext = resolve;
        });

        try {
            // 等待前一個操作完成
            await previousQueue;

            // 執行 key rotation（加鎖保護）
            return await new Promise((resolve) => {
                chrome.storage.sync.get([
                    this.apiKeyStorageKey,
                    this.apiKey2StorageKey,
                    this.dualKeyEnabledStorageKey,
                    this.lastKeyIndexStorageKey
                ], (result) => {
                    const key1 = result[this.apiKeyStorageKey] || null;
                    const key2 = result[this.apiKey2StorageKey] || null;
                    const dualEnabled = result[this.dualKeyEnabledStorageKey] || false;
                    const lastIndex = result[this.lastKeyIndexStorageKey] || 0;

                    // 情況 1：雙 Key 未啟用，直接返回 Key1
                    if (!dualEnabled) {
                        resolve({
                            key: key1,
                            keyIndex: 0,
                            message: '使用 API Key 1'
                        });
                        return;
                    }

                    // 情況 2：雙 Key 已啟用，但 Key2 為空
                    if (!key2) {
                        console.warn(`[${this.name}] 雙 Key 已啟用但 Key2 為空，退回使用 Key1`);
                        resolve({
                            key: key1,
                            keyIndex: 0,
                            message: '使用 API Key 1 (Key2 為空)'
                        });
                        return;
                    }

                    // 情況 3：雙 Key 都有效，執行輪流
                    const nextIndex = lastIndex === 0 ? 1 : 0;
                    const nextKey = nextIndex === 0 ? key1 : key2;

                    // 先更新索引，等待寫入完成後再返回（確保原子性）
                    chrome.storage.sync.set({ [this.lastKeyIndexStorageKey]: nextIndex }, () => {
                        resolve({
                            key: nextKey,
                            keyIndex: nextIndex,
                            message: `使用 API Key ${nextIndex + 1} (雙 Key 輪流)`
                        });
                    });
                });
            });
        } finally {
            // 釋放鎖，允許下一個操作執行
            unlockNext();
        }
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
            apiKey2StorageKey: this.apiKey2StorageKey,              // 新增：第二個 API Key storage key
            dualKeyEnabledStorageKey: this.dualKeyEnabledStorageKey, // 新增：雙 Key 啟用狀態 storage key
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
     * 記錄 Token 估算資訊（在呼叫 API 前）
     * @param {string} systemPrompt - System prompt
     * @param {string} userPrompt - User prompt
     * @param {Object} options - 額外選項（如 model）
     */
    logTokenEstimation(systemPrompt, userPrompt, options = {}) {
        const estimation = estimatePromptTokens(systemPrompt, userPrompt);

        console.log(`\n${'='.repeat(80)}`);
        console.log(`🔢 [${this.name} Token Estimation]`);
        console.log(`${'='.repeat(80)}`);
        console.log(`📊 Model: ${options.model || this.defaultModel || 'default'}`);
        console.log(`📝 System Prompt: ${formatTokenCount(estimation.systemTokens)}`);
        console.log(`💬 User Prompt: ${formatTokenCount(estimation.userTokens)}`);
        console.log(`📈 Total (System + User): ${formatTokenCount(estimation.totalTokens)}`);
        console.log(`⚠️  Note: 此為估算值，實際用量可能有 ±20% 誤差`);
        console.log(`${'='.repeat(80)}\n`);

        return estimation;
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
