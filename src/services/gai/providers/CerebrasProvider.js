/**
 * Cerebras Provider
 *
 * 實作 Cerebras API 的呼叫邏輯
 * Cerebras 提供超快速的 LLM 推理服務，API 格式與 OpenAI 相容
 */
import BaseProvider from './BaseProvider.js';

class CerebrasProvider extends BaseProvider {
    constructor() {
        super({
            id: 'cerebras',
            name: 'Cerebras (推薦)',
            apiKeyStorageKey: 'cerebrasApiKey',
            defaultModel: 'gpt-oss-120b',
            description: '呼叫模型：gpt-oss-120b | 取得 API Key：https://cloud.cerebras.ai/'
        });

        this.apiEndpoint = 'https://api.cerebras.ai/v1/chat/completions';
    }

    /**
     * 呼叫 Cerebras API
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

            // Cerebras 不支援 OpenAI 的 response_format，需使用 JSON 模式
            // 如果提供了 jsonSchema，將 schema 資訊加入 system prompt 並要求 JSON 輸出
            let enhancedSystemPrompt = systemPrompt;

            // 計算合理的 max_completion_tokens
            // Free tier 限制: 60K TPM，需考慮 input + output 總和
            // 醫療分析通常輸出 500-2000 tokens，但推理模型 (Reasoning models) 
            // 產生的推理過程非常長，若設太小會導致輸出被截斷而看不到結果。
            const defaultMaxTokens = 32768;

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
                stream: false,
                temperature: options.temperature !== undefined ? options.temperature : 1,
                top_p: options.topP !== undefined ? options.topP : 1,
                max_completion_tokens: options.maxCompletionTokens || defaultMaxTokens,
                seed: options.seed !== undefined ? options.seed : 0
            };

            // 如果有 jsonSchema，將 schema 資訊加入 system prompt
            if (jsonSchema && jsonSchema.schema) {
                enhancedSystemPrompt = `${systemPrompt}\n\n你必須回傳符合以下 JSON schema 的格式，只回傳 JSON，不要有其他文字：\n${JSON.stringify(jsonSchema.schema, null, 2)}`;
                requestBody.messages[0].content = enhancedSystemPrompt;
            }

            // Cerebras 特有參數：reasoning_effort（可選）
            if (options.reasoningEffort) {
                requestBody.reasoning_effort = options.reasoningEffort; // "low", "medium", "high"
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

                // 特別處理 429 Rate Limit 錯誤
                if (response.status === 429) {
                    const retryAfter = response.headers.get('Retry-After');
                    const resetTime = response.headers.get('X-RateLimit-Reset');

                    let errorMsg = 'Rate Limit 超過限制';
                    if (retryAfter) {
                        errorMsg += `，請等待 ${retryAfter} 秒後重試`;
                    } else if (resetTime) {
                        const resetDate = new Date(parseInt(resetTime) * 1000);
                        errorMsg += `，限制將在 ${resetDate.toLocaleTimeString('zh-TW')} 重置`;
                    }

                    console.error(`[${this.name}] Rate Limit Details:`, {
                        status: response.status,
                        retryAfter,
                        resetTime,
                        errorData
                    });

                    throw new Error(errorMsg);
                }

                throw new Error(errorData.error?.message || errorData.message || `HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            const duration = Date.now() - startTime;

            // 提取 Rate Limit Headers
            const rateLimitInfo = {
                requests_day_limit: response.headers.get('x-ratelimit-limit-requests-day'),
                tokens_minute_limit: response.headers.get('x-ratelimit-limit-tokens-minute'),
                requests_day_remaining: response.headers.get('x-ratelimit-remaining-requests-day'),
                tokens_minute_remaining: response.headers.get('x-ratelimit-remaining-tokens-minute'),
                requests_day_reset: response.headers.get('x-ratelimit-reset-requests-day'),
                tokens_minute_reset: response.headers.get('x-ratelimit-reset-tokens-minute')
            };

            // 記錄效能數據
            console.groupCollapsed(`${this.name} API Call (${duration}ms)`);
            console.log("Model:", options.model || this.defaultModel);
            console.log("Token Usage:", data.usage);
            console.log("Rate Limit Status:", {
                'TPM Remaining': `${rateLimitInfo.tokens_minute_remaining} / ${rateLimitInfo.tokens_minute_limit}`,
                'TPM Reset in': `${rateLimitInfo.tokens_minute_reset}s`,
                'RPD Remaining': `${rateLimitInfo.requests_day_remaining} / ${rateLimitInfo.requests_day_limit}`,
                'RPD Reset in': `${rateLimitInfo.requests_day_reset}s`
            });
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
     * 格式化回應（Cerebras 使用 OpenAI 相容格式）
     * @param {Object} rawResponse - Cerebras API 原始回應
     * @param {number} duration - 執行時間（毫秒）
     * @param {number} keyIndex - 使用的 API Key 索引（0 或 1）
     * @returns {Object} 標準化格式
     */
    formatResponse(rawResponse, duration, keyIndex = 0) {
        // 處理特定模型（如 gpt-oss-120b）可能將內容放在 reasoning 或 reasoning_content 的情況
        const choices = rawResponse.choices?.map(choice => {
            if (choice.message && !choice.message.content) {
                // 如果 content 是空的或者 undefined，嘗試從 reasoning 或 reasoning_content 取得
                const extractedContent = choice.message.reasoning || choice.message.reasoning_content;
                if (extractedContent) {
                    return {
                        ...choice,
                        message: {
                            ...choice.message,
                            content: extractedContent,
                            isReasoning: true // 標記為推理內容
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

export default CerebrasProvider;
