/**
 * Provider Registry
 *
 * 管理所有 AI Provider 的註冊、查詢與生命週期
 */
import BaseProvider from './BaseProvider.js';
import OpenAIProvider from './OpenAIProvider.js';
import GeminiProvider from './GeminiProvider.js';
import GroqProvider from './GroqProvider.js';
import CerebrasProvider from './CerebrasProvider.js';

// Provider 儲存 Map
const providers = new Map();

/**
 * 註冊提供者
 * @param {BaseProvider} provider - Provider 實例
 * @throws {Error} 如果 provider 不是 BaseProvider 的實例
 */
export function registerProvider(provider) {
    if (!(provider instanceof BaseProvider)) {
        throw new Error('Provider must extend BaseProvider');
    }

    if (providers.has(provider.id)) {
        console.warn(`Provider "${provider.id}" is already registered. Overwriting...`);
    }

    providers.set(provider.id, provider);
    console.log(`[Provider Registry] Registered provider: ${provider.name} (${provider.id})`);
}

/**
 * 註冊所有內建提供者
 */
export function registerBuiltInProviders() {
    console.log('[Provider Registry] Registering built-in providers...');

    // Order: Cerebras > Groq > Gemini > OpenAI
    registerProvider(new CerebrasProvider());
    registerProvider(new GroqProvider());
    registerProvider(new GeminiProvider());
    registerProvider(new OpenAIProvider());

    console.log(`[Provider Registry] ${providers.size} providers registered`);
}

/**
 * 取得單一提供者
 * @param {string} id - Provider ID
 * @returns {BaseProvider|undefined}
 */
export function getProvider(id) {
    const provider = providers.get(id);

    if (!provider) {
        console.warn(`[Provider Registry] Provider not found: ${id}`);
    }

    return provider;
}

/**
 * 取得所有提供者
 * @returns {Array<BaseProvider>}
 */
export function getAllProviders() {
    return Array.from(providers.values());
}

/**
 * 取得所有提供者的 metadata（用於 UI 顯示）
 * @returns {Array<Object>}
 */
export function getProviderMetadata() {
    return getAllProviders().map(provider => provider.getMetadata());
}

/**
 * 檢查提供者是否已註冊
 * @param {string} id - Provider ID
 * @returns {boolean}
 */
export function hasProvider(id) {
    return providers.has(id);
}

/**
 * 取消註冊提供者
 * @param {string} id - Provider ID
 * @returns {boolean} 是否成功取消註冊
 */
export function unregisterProvider(id) {
    const success = providers.delete(id);

    if (success) {
        console.log(`[Provider Registry] Unregistered provider: ${id}`);
    } else {
        console.warn(`[Provider Registry] Failed to unregister provider: ${id}`);
    }

    return success;
}

/**
 * 清除所有提供者（主要用於測試）
 */
export function clearProviders() {
    providers.clear();
    console.log('[Provider Registry] All providers cleared');
}

/**
 * 取得提供者數量
 * @returns {number}
 */
export function getProviderCount() {
    return providers.size;
}

/**
 * 驗證所有提供者的 API Key 是否已設定
 * @returns {Promise<Object>} { providerId: boolean }
 */
export async function validateAllProviders() {
    const validationResults = {};

    for (const [id, provider] of providers) {
        validationResults[id] = await provider.validateApiKey();
    }

    return validationResults;
}
