/**
 * GAI Service Module
 *
 * 統一對外介面，匯出所有 GAI 相關的功能
 *
 * 使用範例：
 *
 * import { getProvider, promptManager, analysisEngine } from '@/services/gai';
 *
 * // 取得提供者
 * const provider = getProvider('openai');
 *
 * // 取得 prompt 配置
 * const config = promptManager.getCategoryConfig('default_analysis', 'critical_alerts');
 *
 * // 執行分析
 * const result = await analysisEngine.runAnalysis({
 *   providerId: 'openai',
 *   templateId: 'default_analysis',
 *   categoryKey: 'critical_alerts',
 *   userPrompt: xmlString
 * });
 */

// ============ Providers ============
export {
    // Classes
    BaseProvider,
    OpenAIProvider,
    GeminiProvider,

    // Registry functions
    registerProvider,
    registerBuiltInProviders,
    getProvider,
    getAllProviders,
    getProviderMetadata,
    hasProvider,
    unregisterProvider,
    clearProviders,
    getProviderCount,
    validateAllProviders
} from './providers/index.js';

// ============ Prompts ============
export {
    // Prompt Manager
    promptManager,
    PromptManager,

    // Templates
    templates,
    getAllTemplateMetadata,
    getTemplateMetadata,
    defaultAnalysisTemplate
} from './prompts/index.js';

// ============ Analysis Engine ============
import AnalysisEngineClass, { analysisEngine } from './AnalysisEngine.js';
export { analysisEngine };
export { AnalysisEngineClass as AnalysisEngine };

// ============ Initialization ============
import { registerBuiltInProviders } from './providers/index.js';

// 自動初始化內建提供者
registerBuiltInProviders();

console.log('[GAI Service] Initialized');
