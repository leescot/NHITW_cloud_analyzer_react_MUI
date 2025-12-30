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
            name: 'Cerebras',
            apiKeyStorageKey: 'cerebrasApiKey',
            defaultModel: 'gpt-oss-120b',
            description: 'Cerebras - 超快速 LLM 推理引擎，基於專用硬體加速。建議模型：llama3.3-70b, gpt-oss-120b'
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
        const apiKey = await this.getApiKey();

        if (!apiKey) {
            throw new Error(`${this.name} API Key not found. Please set it in Options.`);
        }

        const startTime = Date.now();

        try {
            console.log(`🚀 [NEW ARCHITECTURE] Using ${this.name} Provider (Modular)`);

            // Cerebras 不支援 OpenAI 的 response_format，需使用 JSON 模式
            // 如果提供了 jsonSchema，將 schema 資訊加入 system prompt 並要求 JSON 輸出
            let enhancedSystemPrompt = systemPrompt;

            // 計算合理的 max_completion_tokens
            // Free tier 限制: 60K TPM，需考慮 input + output 總和
            // 醫療分析通常輸出 500-2000 tokens，設定 4096 作為安全值
            const defaultMaxTokens = 4096;

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

            return this.formatResponse(data, duration);

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

export default CerebrasProvider;
