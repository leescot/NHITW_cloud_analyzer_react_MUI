/**
 * Analysis Engine
 *
 * 統一的分析執行引擎，協調 Provider 和 Prompt 的使用
 */
import { getProvider } from './providers/index.js';
import { promptManager } from './prompts/index.js';

class AnalysisEngine {
    constructor() {
        this.runningAnalyses = new Map(); // 追蹤進行中的分析
    }

    /**
     * 執行單一分析
     * @param {Object} config - 分析配置
     * @param {string} config.providerId - Provider ID
     * @param {string} config.templateId - Template ID
     * @param {string} config.categoryKey - Category key
     * @param {string} config.userPrompt - User prompt (XML formatted patient data)
     * @param {Object} config.options - 額外選項 (model, temperature, etc.)
     * @returns {Promise<Object>} { success: boolean, data?: Object, error?: string }
     */
    async runAnalysis(config) {
        const {
            providerId,
            templateId,
            categoryKey,
            userPrompt,
            options = {}
        } = config;

        // 生成分析 ID
        const analysisId = `${providerId}_${templateId}_${categoryKey}_${Date.now()}`;

        try {
            console.log(`[Analysis Engine] Starting analysis: ${analysisId}`);

            // 1. 取得提供者
            const provider = getProvider(providerId);
            if (!provider) {
                throw new Error(`Provider not found: ${providerId}`);
            }

            // 2. 取得 prompt 配置
            const categoryConfig = promptManager.getCategoryConfig(templateId, categoryKey);
            if (!categoryConfig) {
                throw new Error(`Category config not found: ${templateId}/${categoryKey}`);
            }

            // 3. 驗證配置
            const validation = promptManager.validateCategoryConfig(templateId, categoryKey);
            if (!validation.valid) {
                throw new Error(`Invalid category config: ${validation.errors.join(', ')}`);
            }

            // 4. 記錄開始狀態
            this.runningAnalyses.set(analysisId, {
                providerId,
                templateId,
                categoryKey,
                startTime: Date.now(),
                status: 'running'
            });

            // 5. 執行 API 呼叫
            const response = await provider.callAPI(
                categoryConfig.systemPrompt,
                userPrompt,
                categoryConfig.schema,
                options
            );

            // 6. 更新狀態
            this.runningAnalyses.set(analysisId, {
                ...this.runningAnalyses.get(analysisId),
                status: 'completed',
                endTime: Date.now()
            });

            console.log(`[Analysis Engine] Completed analysis: ${analysisId} (${response.duration}ms)`);

            return {
                success: true,
                data: response,
                analysisId
            };

        } catch (error) {
            console.error(`[Analysis Engine] Failed analysis: ${analysisId}`, error);

            // 更新狀態
            if (this.runningAnalyses.has(analysisId)) {
                this.runningAnalyses.set(analysisId, {
                    ...this.runningAnalyses.get(analysisId),
                    status: 'failed',
                    endTime: Date.now(),
                    error: error.message
                });
            }

            return {
                success: false,
                error: error.message,
                analysisId
            };
        } finally {
            // 清理舊的分析記錄（保留最近 100 筆）
            if (this.runningAnalyses.size > 100) {
                const entries = Array.from(this.runningAnalyses.entries());
                const toDelete = entries.slice(0, entries.length - 100);
                toDelete.forEach(([id]) => this.runningAnalyses.delete(id));
            }
        }
    }

    /**
     * 批次執行分析（平行處理所有類別）
     * @param {Object} config - 分析配置
     * @param {string} config.providerId - Provider ID
     * @param {string} config.templateId - Template ID
     * @param {string} config.userPrompt - User prompt (XML formatted patient data)
     * @param {Object} config.options - 額外選項
     * @returns {Promise<Array<Object>>} Array of { categoryKey, result }
     */
    async runBatchAnalysis(config) {
        const {
            providerId,
            templateId,
            userPrompt,
            options = {}
        } = config;

        console.log(`[Analysis Engine] Starting batch analysis: ${providerId}/${templateId}`);

        // 取得模板
        const template = promptManager.getTemplate(templateId);
        if (!template) {
            throw new Error(`Template not found: ${templateId}`);
        }

        // 取得所有類別 keys
        const categoryKeys = Object.keys(template.categories);

        console.log(`[Analysis Engine] Batch analysis categories: ${categoryKeys.join(', ')}`);

        // 平行執行所有類別的分析
        const promises = categoryKeys.map(categoryKey =>
            this.runAnalysis({
                providerId,
                templateId,
                categoryKey,
                userPrompt,
                options
            }).then(result => ({ categoryKey, result }))
        );

        const results = await Promise.all(promises);

        const successCount = results.filter(r => r.result.success).length;
        console.log(`[Analysis Engine] Batch analysis completed: ${successCount}/${categoryKeys.length} successful`);

        return results;
    }

    /**
     * 取得進行中的分析狀態
     * @param {string} analysisId - Analysis ID
     * @returns {Object|undefined}
     */
    getAnalysisStatus(analysisId) {
        return this.runningAnalyses.get(analysisId);
    }

    /**
     * 取得所有進行中的分析
     * @returns {Array<Object>}
     */
    getAllRunningAnalyses() {
        return Array.from(this.runningAnalyses.entries())
            .filter(([_, analysis]) => analysis.status === 'running')
            .map(([id, analysis]) => ({ id, ...analysis }));
    }

    /**
     * 取得分析統計
     * @returns {Object}
     */
    getStatistics() {
        const analyses = Array.from(this.runningAnalyses.values());

        return {
            total: analyses.length,
            running: analyses.filter(a => a.status === 'running').length,
            completed: analyses.filter(a => a.status === 'completed').length,
            failed: analyses.filter(a => a.status === 'failed').length,
            averageDuration: this._calculateAverageDuration(analyses)
        };
    }

    /**
     * 計算平均執行時間
     * @private
     */
    _calculateAverageDuration(analyses) {
        const completed = analyses.filter(a => a.status === 'completed' && a.endTime);

        if (completed.length === 0) {
            return 0;
        }

        const totalDuration = completed.reduce((sum, a) => sum + (a.endTime - a.startTime), 0);
        return Math.round(totalDuration / completed.length);
    }

    /**
     * 清除分析歷史
     */
    clearHistory() {
        this.runningAnalyses.clear();
        console.log('[Analysis Engine] Analysis history cleared');
    }
}

// 創建單例實例
export const analysisEngine = new AnalysisEngine();

export default AnalysisEngine;
