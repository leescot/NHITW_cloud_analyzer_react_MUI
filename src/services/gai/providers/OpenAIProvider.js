/**
 * OpenAI Provider
 *
 * 實作 OpenAI API 的呼叫邏輯
 */
import BaseProvider from './BaseProvider.js';

class OpenAIProvider extends BaseProvider {
    constructor() {
        super({
            id: 'openai',
            name: 'OpenAI',
            apiKeyStorageKey: 'openaiApiKey',
            defaultModel: 'gpt-5-nano',
            description: 'OpenAI GPT models with structured output support'
        });

        this.apiEndpoint = 'https://api.openai.com/v1/chat/completions';
    }

    /**
     * 呼叫 OpenAI API
     * @param {string} systemPrompt - System prompt
     * @param {string} userPrompt - User prompt
     * @param {Object} jsonSchema - JSON Schema for structured output
     * @param {Object} options - 額外選項 (model, temperature, etc.)
     * @returns {Promise<Object>} 標準化的回應格式
     */
    async callAPI(systemPrompt, userPrompt, jsonSchema, options = {}) {
        const apiKey = await this.getApiKey();

        if (!apiKey) {
            throw new Error(`${this.name} API Key not found. Please set it in Options.`);
        }

        const startTime = Date.now();

        try {
            console.log(`🚀 [NEW ARCHITECTURE] Using ${this.name} Provider (Modular)`);

            // 估算並記錄 Token 用量（在呼叫 API 前）
            this.logTokenEstimation(systemPrompt, userPrompt, {
                model: options.model || this.defaultModel
            });

            this.log('API Request', {
                model: options.model || this.defaultModel,
                systemPromptLength: systemPrompt.length,
                userPromptLength: userPrompt.length
            });

            const response = await fetch(this.apiEndpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                },
                body: JSON.stringify({
                    model: options.model || this.defaultModel,
                    messages: [
                        {
                            role: "system",
                            content: systemPrompt
                        },
                        {
                            role: "user",
                            content: userPrompt
                        }
                    ],
                    response_format: {
                        type: "json_schema",
                        json_schema: jsonSchema
                    },
                    temperature: options.temperature || 1,
                    ...options.additionalParams
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error?.message || `HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            const duration = Date.now() - startTime;

            // 記錄效能數據
            console.groupCollapsed(`${this.name} API Call (${duration}ms)`);
            console.log("Model:", options.model || this.defaultModel);
            console.log("Token Usage:", data.usage);
            console.log("Full Response:", data);
            console.groupEnd();

            return this.formatResponse(data, duration);

        } catch (error) {
            const duration = Date.now() - startTime;
            this.logError(`API call failed after ${duration}ms`, error);
            throw error;
        }
    }

    /**
     * 格式化回應（OpenAI 原生格式，無需轉換）
     * @param {Object} rawResponse - OpenAI API 原始回應
     * @param {number} duration - 執行時間（毫秒）
     * @returns {Object} 標準化格式
     */
    formatResponse(rawResponse, duration) {
        return {
            choices: rawResponse.choices,
            usage: rawResponse.usage,
            duration: duration,
            model: rawResponse.model,
            provider: this.id
        };
    }
}

export default OpenAIProvider;
