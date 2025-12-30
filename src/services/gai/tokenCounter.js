/**
 * Token Counter Module
 *
 * 使用統一估算法計算 AI API 的 token 用量
 * 針對繁體中文醫療數據優化
 */

/**
 * 估算文本的 token 數量
 *
 * 估算規則（基於 OpenAI tokenizer 的觀察）：
 * - 繁體中文字符：約 2.5 tokens/字
 * - 英文單詞：約 1.3 tokens/詞
 * - 數字和標點：約 1.0 tokens/字符
 * - 空白字符：約 0.5 tokens/字符
 *
 * @param {string} text - 要計算的文本
 * @returns {number} 估算的 token 數量
 */
export function estimateTokens(text) {
    if (!text || typeof text !== 'string') {
        return 0;
    }

    // 計算繁體中文字符（包括常用漢字、擴展A區、擴展B區等）
    const chineseChars = (text.match(/[\u4e00-\u9fff\u3400-\u4dbf]/g) || []).length;

    // 計算英文單詞（連續的字母）
    const englishWords = (text.match(/[a-zA-Z]+/g) || []).length;

    // 計算數字（連續的數字視為一個單位）
    const numberGroups = (text.match(/\d+(\.\d+)?/g) || []).length;

    // 計算標點符號和特殊字符
    const punctuation = (text.match(/[^\w\s\u4e00-\u9fff\u3400-\u4dbf]/g) || []).length;

    // 計算空白字符
    const whitespace = (text.match(/\s+/g) || []).length;

    // 加權計算
    const estimatedTokens = Math.ceil(
        chineseChars * 2.5 +      // 中文字
        englishWords * 1.3 +      // 英文詞
        numberGroups * 1.2 +      // 數字組
        punctuation * 1.0 +       // 標點符號
        whitespace * 0.5          // 空白
    );

    return estimatedTokens;
}

/**
 * 估算多個文本的總 token 數量
 * @param {...string} texts - 多個文本參數
 * @returns {number} 總 token 數量
 */
export function estimateTotalTokens(...texts) {
    return texts.reduce((total, text) => total + estimateTokens(text), 0);
}

/**
 * 估算 prompt 的 token 數量（包含 system + user prompts）
 * @param {string} systemPrompt - System prompt
 * @param {string} userPrompt - User prompt
 * @returns {Object} { systemTokens, userTokens, totalTokens }
 */
export function estimatePromptTokens(systemPrompt, userPrompt) {
    const systemTokens = estimateTokens(systemPrompt);
    const userTokens = estimateTokens(userPrompt);
    const totalTokens = systemTokens + userTokens;

    return {
        systemTokens,
        userTokens,
        totalTokens
    };
}

/**
 * 取得詳細的 token 估算資訊（用於 debug）
 * @param {string} text - 要分析的文本
 * @returns {Object} 詳細的統計資訊
 */
export function getTokenEstimationDetails(text) {
    if (!text || typeof text !== 'string') {
        return {
            totalChars: 0,
            chineseChars: 0,
            englishWords: 0,
            numberGroups: 0,
            punctuation: 0,
            whitespace: 0,
            estimatedTokens: 0
        };
    }

    const chineseChars = (text.match(/[\u4e00-\u9fff\u3400-\u4dbf]/g) || []).length;
    const englishWords = (text.match(/[a-zA-Z]+/g) || []).length;
    const numberGroups = (text.match(/\d+(\.\d+)?/g) || []).length;
    const punctuation = (text.match(/[^\w\s\u4e00-\u9fff\u3400-\u4dbf]/g) || []).length;
    const whitespace = (text.match(/\s+/g) || []).length;

    return {
        totalChars: text.length,
        chineseChars,
        englishWords,
        numberGroups,
        punctuation,
        whitespace,
        estimatedTokens: estimateTokens(text)
    };
}

/**
 * 格式化 token 數量為易讀字串
 * @param {number} tokens - Token 數量
 * @returns {string} 格式化後的字串
 */
export function formatTokenCount(tokens) {
    if (tokens < 1000) {
        return `${tokens} tokens`;
    } else if (tokens < 1000000) {
        return `${(tokens / 1000).toFixed(2)}K tokens`;
    } else {
        return `${(tokens / 1000000).toFixed(2)}M tokens`;
    }
}
