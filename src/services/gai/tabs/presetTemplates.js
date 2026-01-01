/**
 * 預設 Tab 模板定義
 *
 * 包含 7 種核心模板：
 * - 基礎分析類 (4 種)
 * - 專科分析類 (2 種)
 * - 進階分析類 (1 種)
 */

export const PRESET_TEMPLATES = {
  // ==================== 基礎分析類 ====================

  critical_alerts: {
    id: 'critical_alerts',
    name: '危險警示',
    icon: 'Warning',
    category: 'basic',
    description: '辨識需要立即注意的危險狀況與緊急警訊',
    dataTypes: ['patientSummary', 'allergy', 'medication', 'lab', 'imaging'],
    systemPrompt: 'You are an expert medical AI assistant. Analyze the provided medical record (XML format) and identify ONLY the most critical, dangerous, or urgent items that require immediate attention. Focus on severe conditions, active risks, and major warnings. Return the result in the specified JSON format. Please output in Traditional Chinese (zh-TW) using medical terminology commonly used by Taiwanese physicians.',
    schema: {
      name: 'critical_alerts_response',
      strict: true,
      schema: {
        type: 'object',
        properties: {
          critical_alerts: {
            type: 'array',
            items: { type: 'string' },
            description: 'List of critical alerts, dangerous conditions, or urgent attention items'
          }
        },
        required: ['critical_alerts'],
        additionalProperties: false
      }
    }
  },

  medication_risks: {
    id: 'medication_risks',
    name: '用藥風險',
    icon: 'Medication',
    category: 'basic',
    description: '辨識用藥交互作用、禁忌與劑量問題',
    dataTypes: ['patientSummary', 'allergy', 'medication', 'lab', 'hbcvdata'],
    systemPrompt: 'You are an expert clinical pharmacist AI. Analyze the provided medical record (XML format) and identify potential medication risks, drug-drug interactions, contraindications, renal dose adjustments (based on eGFR), and other medication-related safety concerns. Return the result in the specified JSON format. Please output in Traditional Chinese (zh-TW) using medical terminology commonly used by Taiwanese physicians.',
    schema: {
      name: 'medication_risks_response',
      strict: true,
      schema: {
        type: 'object',
        properties: {
          medication_risks: {
            type: 'array',
            items: { type: 'string' },
            description: 'List of medication risks, contraindications, drug interactions, or dosage warnings'
          }
        },
        required: ['medication_risks'],
        additionalProperties: false
      }
    }
  },

  abnormal_labs: {
    id: 'abnormal_labs',
    name: '檢驗異常值',
    icon: 'Science',
    category: 'basic',
    description: '列出近期異常檢驗數值並提供解釋',
    dataTypes: ['lab'],
    systemPrompt: 'You are an expert medical AI. Analyze the provided medical record (XML format) and extract RECENT abnormal laboratory results. Focus on values outside normal ranges, significant trends (e.g., rising Creatinine), and critical values. Provide a brief interpretation for each abnormality. Return the result in the specified JSON format. Please output in Traditional Chinese (zh-TW) using medical terminology commonly used by Taiwanese physicians.',
    schema: {
      name: 'abnormal_labs_response',
      strict: true,
      schema: {
        type: 'object',
        properties: {
          abnormal_labs: {
            type: 'array',
            items: { type: 'string' },
            description: 'List of recent abnormal laboratory results with interpretation'
          }
        },
        required: ['abnormal_labs'],
        additionalProperties: false
      }
    }
  },

  imaging_findings: {
    id: 'imaging_findings',
    name: '影像重點',
    icon: 'ImageSearch',
    category: 'basic',
    description: '摘要影像學報告的重要發現',
    dataTypes: ['imaging'],
    systemPrompt: `TL;DR of imaging test. Output format in zh-TW:
- {image exam} 
  - {Date 1}: {summary of report}
  - {Date 2}: {summary of report}`,
    schema: {
      name: 'imaging_findings_response',
      strict: true,
      schema: {
        type: 'object',
        properties: {
          imaging_findings: {
            type: 'array',
            items: { type: 'string' },
            description: 'List of important findings from recent imaging reports'
          }
        },
        required: ['imaging_findings'],
        additionalProperties: false
      }
    }
  },

  // ==================== 專科分析類 ====================

  renal_medication: {
    id: 'renal_medication',
    name: '腎功能用藥',
    icon: 'Vaccines',
    category: 'specialized',
    description: '分析腎功能與用藥安全性、劑量調整',
    dataTypes: ['lab', 'medication', 'patientSummary'],
    systemPrompt: `你是腎臟科專家 AI。分析病歷（XML 格式）中的腎功能相關檢驗與用藥。任務：
1) 計算最新 eGFR (若有 Cr、年齡、性別)
2) 辨識需要腎功能調整劑量的藥物
3) 標示腎毒性藥物
4) 評估是否有 AKI (急性腎損傷) 跡象
5) 提供用藥建議（減量、停藥、替代）

特別注意：Metformin、NSAID、ACEI/ARB、抗生素、顯影劑等。
以繁體中文輸出，使用台灣醫師常用術語。`,
    schema: {
      name: 'renal_medication_response',
      strict: true,
      schema: {
        type: 'object',
        properties: {
          renal_analysis: {
            type: 'array',
            items: { type: 'string' },
            description: 'Renal function analysis and medication recommendations'
          }
        },
        required: ['renal_analysis'],
        additionalProperties: false
      }
    }
  },

  diabetes_management: {
    id: 'diabetes_management',
    name: '糖尿病管理',
    icon: 'MonitorHeart',
    category: 'specialized',
    description: '綜合分析血糖控制與用藥',
    dataTypes: ['lab', 'medication', 'patientSummary'],
    systemPrompt: `你是內分泌專家 AI。分析病歷（XML 格式）中的糖尿病相關資料。任務：
1) 評估血糖控制（HbA1c、飯前/飯後血糖）
2) 列出目前降糖藥物與胰島素
3) 辨識低血糖風險（如腎功能不佳但使用 Sulfonylurea）
4) 評估併發症風險（視網膜、腎臟、神經病變）
5) 提供治療建議

特別注意：腎功能、肝功能、心血管用藥。
以繁體中文輸出，使用台灣醫師常用術語。`,
    schema: {
      name: 'diabetes_management_response',
      strict: true,
      schema: {
        type: 'object',
        properties: {
          diabetes_analysis: {
            type: 'array',
            items: { type: 'string' },
            description: 'Diabetes management analysis and recommendations'
          }
        },
        required: ['diabetes_analysis'],
        additionalProperties: false
      }
    }
  },

  // ==================== 進階分析類 ====================

  comprehensive_summary: {
    id: 'comprehensive_summary',
    name: '綜合摘要',
    icon: 'Summarize',
    category: 'advanced',
    description: '產生完整的門診前病歷摘要',
    dataTypes: ['patientSummary', 'allergy', 'surgery', 'discharge', 'medication', 'lab', 'imaging'],
    systemPrompt: `你是「門診看診前置病歷摘要助理」。目標是讓門診醫師用 30 秒掌握：最危險/最需要注意的點、用藥雷點、近期異常檢驗、重要影像異常。

【你要做的事（請按優先順序）】
1) 抓「立即要注意」：會影響門診處置/用藥安全/是否需急處理的項目（用 ⚠️ 標記）
2) 抓「特殊用藥/高風險用藥」：抗凝血/抗血小板、胰島素與降糖藥、鎮靜安眠、鴉片類止痛、免疫抑制、腎臟相關用藥等
3) 抓「近期異常檢驗」：優先列出會改變處置的（K、Na、Hb、Cr/eGFR、Ca/P、血糖/HbA1c、感染指標等）
4) 抓「影像/重要檢查異常」：只列 Impression/結論等級的重點
5) 釐清「缺漏與矛盾」：年齡/過敏史空白、診斷與用藥不一致、同藥重複開立等

【輸出格式】
A. 一句話總覽（1 行）
B. ⚠️ 立即注意（最多 6 點）
C. 重要用藥與用藥雷點（最多 10 行）
D. 近期異常檢驗（最多 12 行）
E. 重要影像/檢查（最多 8 行）
F. 待確認/缺資料（最多 6 點）

以繁體中文輸出，使用台灣醫師常用術語。`,
    schema: {
      name: 'comprehensive_summary_response',
      strict: true,
      schema: {
        type: 'object',
        properties: {
          summary_sections: {
            type: 'array',
            items: { type: 'string' },
            description: 'Comprehensive summary sections (A-F)'
          }
        },
        required: ['summary_sections'],
        additionalProperties: false
      }
    }
  }
};

/**
 * 取得所有模板
 * @returns {Object} 所有模板的 Map
 */
export const getAllTemplates = () => {
  return PRESET_TEMPLATES;
};

/**
 * 取得單一模板
 * @param {string} templateId - 模板 ID
 * @returns {Object|null} 模板物件或 null
 */
export const getTemplate = (templateId) => {
  return PRESET_TEMPLATES[templateId] || null;
};

/**
 * 取得模板元數據（用於 UI 顯示）
 * @returns {Array} 模板元數據陣列
 */
export const getTemplateMetadata = () => {
  return Object.values(PRESET_TEMPLATES).map(template => ({
    id: template.id,
    name: template.name,
    icon: template.icon,
    category: template.category,
    description: template.description
  }));
};

/**
 * 按分類取得模板
 * @param {string} category - 分類 ('basic', 'specialized', 'advanced')
 * @returns {Array} 該分類的模板陣列
 */
export const getTemplatesByCategory = (category) => {
  return Object.values(PRESET_TEMPLATES).filter(template => template.category === category);
};
