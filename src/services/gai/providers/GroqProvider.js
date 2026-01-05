/**
 * Groq Provider
 *
 * 實作 Groq API 的呼叫邏輯
 * Groq 提供超快速的 LLM 推理服務，API 格式與 OpenAI 相容
 */
import BaseProvider from './BaseProvider.js';

class GroqProvider extends BaseProvider {
    constructor() {
        super({
            id: 'groq',
            name: 'Groq',
            apiKeyStorageKey: 'groqApiKey',
            defaultModel: 'llama-3.3-70b-versatile',
            description: '呼叫模型：llama-3.3-70b-versatile | 取得 API Key：https://console.groq.com/'
        });

        this.apiEndpoint = 'https://api.groq.com/openai/v1/chat/completions';
    }

    /**
     * 呼叫 Groq API
     * @param {string} systemPrompt - System prompt
     * @param {string} userPrompt - User prompt
     * @param {Object} jsonSchema - JSON Schema for structured output
     * @param {Object} options - 額外選項 (model, temperature, etc.)
     * @returns {Promise<Object>} 標準化的回應格式
     */
    async callAPI(systemPrompt, userPrompt, jsonSchema, options = {}) {
        // 使用新的 getNextApiKey() 支援雙 Key 輪流
        const { key: apiKey, keyIndex, message } = await this.getNextApiKey();

        if (!apiKey) {
            throw new Error(`${this.name} API Key not found. Please set it in Options.`);
        }

        const startTime = Date.now();

        try {
            console.log(`🚀 [NEW ARCHITECTURE] Using ${this.name} Provider (Modular)`);
            console.log(`🔑 [${this.name}] ${message}`);  // 顯示使用哪個 Key

            // Groq 支援 OpenAI 相容的 response_format，但使用簡化版本
            // 如果提供了 jsonSchema，將 schema 資訊加入 system prompt 並啟用 JSON 模式
            let enhancedSystemPrompt = systemPrompt;
            const requestBody = {
                model: options.model || this.defaultModel,
                messages: [
                    {
                        role: "system",
                        content: enhancedSystemPrompt
                    },
                    {
                        role: "user",
                        content: userPrompt
                    }
                ],
                temperature: options.temperature || 1,
                max_completion_tokens: options.maxTokens || 16384,
                top_p: options.topP || 1
            };

            // 如果有 jsonSchema，啟用 JSON 模式
            if (jsonSchema && jsonSchema.schema) {
                requestBody.response_format = {
                    type: "json_object"
                };

                // 將 schema 資訊加入 system prompt 以提高 JSON 結構準確性
                enhancedSystemPrompt = `${systemPrompt}\n\n你必須回傳符合以下 JSON schema 的格式：\n${JSON.stringify(jsonSchema.schema, null, 2)}`;
                requestBody.messages[0].content = enhancedSystemPrompt;
            }

            // 加入其他額外參數
            if (options.additionalParams) {
                Object.assign(requestBody, options.additionalParams);
            }

            // 估算並記錄 Token 用量（在呼叫 API 前，使用最終的 enhancedSystemPrompt）
            this.logTokenEstimation(enhancedSystemPrompt, userPrompt, {
                model: options.model || this.defaultModel
            });

            this.log('API Request', {
                model: options.model || this.defaultModel,
                systemPromptLength: enhancedSystemPrompt.length,
                userPromptLength: userPrompt.length
            });

            const response = await fetch(this.apiEndpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                },
                body: JSON.stringify(requestBody)
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
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

            return this.formatResponse(data, duration, keyIndex);

        } catch (error) {
            const duration = Date.now() - startTime;
            this.logError(`API call failed after ${duration}ms`, error);
            throw error;
        }
    }

    /**
     * 格式化回應（Groq 使用 OpenAI 相容格式）
     * @param {Object} rawResponse - Groq API 原始回應
     * @param {number} duration - 執行時間（毫秒）
     * @param {number} keyIndex - 使用的 API Key 索引（0 或 1）
     * @returns {Object} 標準化格式
     */
    formatResponse(rawResponse, duration, keyIndex = 0) {
        // 處理推理模型可能將內容放在 reasoning 或 reasoning_content 的情況
        const choices = rawResponse.choices?.map(choice => {
            if (choice.message && !choice.message.content) {
                const extractedContent = choice.message.reasoning || choice.message.reasoning_content;
                if (extractedContent) {
                    return {
                        ...choice,
                        message: {
                            ...choice.message,
                            content: extractedContent,
                            isReasoning: true
                        }
                    };
                }
            }
            return choice;
        });

        return {
            choices: choices || rawResponse.choices,
            usage: rawResponse.usage,
            duration: duration,
            model: rawResponse.model,
            provider: this.id,
            keyUsed: `Key ${keyIndex + 1}`
        };
    }
}

export default GroqProvider;
