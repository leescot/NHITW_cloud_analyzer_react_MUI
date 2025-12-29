/**
 * Google Gemini Provider
 *
 * 實作 Google Gemini API 的呼叫邏輯
 */
import BaseProvider from './BaseProvider.js';

class GeminiProvider extends BaseProvider {
    constructor() {
        super({
            id: 'gemini',
            name: 'Google Gemini',
            apiKeyStorageKey: 'geminiApiKey',
            defaultModel: 'gemini-3-flash-preview',
            description: 'Google Gemini models with fast inference'
        });

        this.apiEndpoint = 'https://generativelanguage.googleapis.com/v1beta/models';
    }

    /**
     * 呼叫 Gemini API
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
        const model = options.model || this.defaultModel;

        try {
            console.log(`🚀 [NEW ARCHITECTURE] Using ${this.name} Provider (Modular)`);
            this.log('API Request', {
                model: model,
                systemPromptLength: systemPrompt.length,
                userPromptLength: userPrompt.length
            });

            const response = await fetch(
                `${this.apiEndpoint}/${model}:generateContent?key=${apiKey}`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        systemInstruction: {
                            parts: [
                                { text: systemPrompt }
                            ]
                        },
                        contents: [{
                            parts: [
                                { text: userPrompt }
                            ]
                        }],
                        generationConfig: {
                            responseMimeType: "application/json",
                            responseJsonSchema: jsonSchema.schema, // Gemini 使用 schema 屬性
                            temperature: options.temperature || 1,
                            ...options.additionalParams
                        }
                    })
                }
            );

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error?.message || `HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            const duration = Date.now() - startTime;

            // 記錄效能數據
            console.groupCollapsed(`${this.name} API Call (${duration}ms)`);
            console.log("Model:", model);
            console.log("Token Usage:", data.usageMetadata);
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
     * 格式化回應（轉換為 OpenAI 相容格式）
     * @param {Object} rawResponse - Gemini API 原始回應
     * @param {number} duration - 執行時間（毫秒）
     * @returns {Object} 標準化格式
     */
    formatResponse(rawResponse, duration) {
        // 提取 Gemini 回應文字
        const contentText = rawResponse.candidates?.[0]?.content?.parts?.[0]?.text;

        if (!contentText) {
            throw new Error("Empty response from Gemini");
        }

        // 轉換 Token 用量格式（Gemini 使用 usageMetadata）
        const usage = {
            prompt_tokens: rawResponse.usageMetadata?.promptTokenCount || 0,
            completion_tokens: rawResponse.usageMetadata?.candidatesTokenCount || 0,
            total_tokens: rawResponse.usageMetadata?.totalTokenCount || 0,
            totalTokenCount: rawResponse.usageMetadata?.totalTokenCount || 0 // 保留原始欄位
        };

        // 模擬 OpenAI 回應結構
        return {
            choices: [{
                message: {
                    content: contentText,
                    role: 'assistant'
                },
                finish_reason: rawResponse.candidates?.[0]?.finishReason || 'stop'
            }],
            usage: usage,
            duration: duration,
            model: this.defaultModel,
            provider: this.id
        };
    }
}

export default GeminiProvider;
