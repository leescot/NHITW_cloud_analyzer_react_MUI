/**
 * 預設 Tab 模板定義
 *
 * 包含 10 種核心模板：
 * - 基礎分析類 (3 種)
 * - 專科分析類 (4 種)
 * - 進階分析類 (3 種)
 */

export const PRESET_TEMPLATES = {
  // ==================== 基礎分析類 ====================

  medication_risks: {
    id: 'medication_risks',
    name: '藥物交互作用',
    icon: 'Medication',
    category: 'basic',
    description: '辨識藥物與藥物間的交互作用、禁忌與安全風險',
    dataTypes: ['diagnosis', 'medication', 'chinesemed'],
    systemPrompt: 'You are an expert clinical pharmacist AI. Analyze the provided medical record (XML format) and identify MAJOR drug-drug interactions, contraindications, and other medication-related safety concerns. Focus ONLY on interactions between the listed medications. Use Markdown LIST formatting for clarity. DO NOT USE TABLES. Please output in Traditional Chinese (zh-TW) using medical terminology commonly used by Taiwanese physicians.'
  },

  abnormal_labs: {
    id: 'abnormal_labs',
    name: '檢驗異常值',
    icon: 'Science',
    category: 'basic',
    description: '列出近期異常檢驗數值並提供精簡解釋 (TL;DR)',
    dataTypes: ['lab'],
    systemPrompt: 'You are an expert medical AI. Analyze the provided medical record (XML format) and extract RECENT abnormal laboratory results. Focus on values outside normal ranges and critical values. Provide a VERY CONCISE, TL;DR interpretation for each abnormality. Use Markdown LIST formatting for clarity. DO NOT USE TABLES. Please output in Traditional Chinese (zh-TW) using medical terminology commonly used by Taiwanese physicians.'
  },

  imaging_findings: {
    id: 'imaging_findings',
    name: '影像重點',
    icon: 'ImageSearch',
    category: 'basic',
    description: '摘要影像學報告的重要發現',
    dataTypes: ['imaging'],
    systemPrompt: `TL;DR of imaging report. Use Markdown LIST formatting. 臨床有重要性的異常報告請用粗體標記。 Output format in zh-TW:
- {image exam} 
  - {Date 1}: {summary of report}
  - {Date 2}: {summary of report}`
  },

  // ==================== 專科分析類 ====================

  renal_medication: {
    id: 'renal_medication',
    name: '腎功能用藥',
    icon: 'Vaccines',
    category: 'specialized',
    description: '分析腎功能與用藥安全性、劑量調整',
    dataTypes: ['lab', 'medication', 'patientSummary'],
    systemPrompt: `腎臟科專家 AI。分析腎功能與用藥安全。

【檢驗數據 - 最近 3 次】Cr, eGFR, BUN, K, Na, Ca, P, Albumin

【需關注藥物】
- 腎毒性：NSAID, Aminoglycoside, 顯影劑
- 需調劑量：Metformin (eGFR<30停用), Gabapentin, 抗生素

【輸出格式】
A. **腎功能趨勢表**（最近 3 次 Cr/eGFR/K，Markdown TABLE）
B. **⚠️ 需注意藥物**（需調整/禁用/腎毒性，Markdown LIST）

TL;DR 風格，以繁體中文輸出。`
  },

  diabetes_management: {
    id: 'diabetes_management',
    name: '糖尿病管理',
    icon: 'MonitorHeart',
    category: 'specialized',
    description: '綜合分析血糖控制與用藥',
    dataTypes: ['lab', 'medication', 'patientSummary'],
    systemPrompt: `內分泌專家 AI。分析糖尿病控制與用藥。

【檢驗數據 - 最近 3 次】HbA1c, 飯前血糖, Cr/eGFR, ALT

【降糖藥物識別 - ATC A10】
- A10A: 胰島素
- A10BA: Metformin
- A10BB: Sulfonylurea（低血糖風險）
- A10BH: DPP-4i
- A10BK: SGLT2i（心腎保護）
- A10BJ: GLP-1 RA

【輸出格式】
A. **血糖控制趨勢表**（最近 3 次 HbA1c/FG/eGFR，Markdown TABLE）
B. **目前降糖藥物**（藥名、劑量、頻次，Markdown LIST）
C. **⚠️ 風險警示**（低血糖風險、腎功能需調整藥物）

TL;DR 風格，以繁體中文輸出。`
  },

  anticoagulation_management: {
    id: 'anticoagulation_management',
    name: '抗凝血管理',
    icon: 'Bloodtype',
    category: 'specialized',
    description: '評估抗凝血/抗血小板藥物使用與出血風險',
    dataTypes: ['diagnosis', 'medication', 'lab'],
    systemPrompt: `你是心臟內科/血液科專家 AI。分析病歷（XML 格式）中的抗凝血與抗血小板藥物使用情況。

【識別 B01A 類藥物】
請特別關注 ATC 碼開頭為 B01A 的藥物，包括：
- B01AA: Vitamin K 拮抗劑（Warfarin）
- B01AB: Heparin 類
- B01AC: 抗血小板藥物（Aspirin, Clopidogrel, Ticagrelor, Dipyridamole）
- B01AE: 直接凝血酶抑制劑（Dabigatran）
- B01AF: 直接 Xa 因子抑制劑（Rivaroxaban, Apixaban, Edoxaban）

【分析任務】
1) **藥物盤點**：列出所有 B01A 類藥物，精簡標示藥名、劑量、頻次，最近一次使用日期
2) **檢驗報告**：簡易表格列出最近三次 PT(INR)、APTT、LDL、Cr(GFR)、Hb、PLT 報告值
3) **藥物交互作用**：**精簡**描述抗凝血/抗血小板藥物與其它服用藥物的交互作用

【輸出格式】
A. 抗凝血/抗血小板藥物清單 (TL;DR use Markdown LIST format)
B. 檢驗報告表格 (不呈現檢驗單位; TL;DR use Markdown TABLE format)
C. 藥物交互作用 (TL;DR use Markdown LIST format)

請使用 Markdown 格式輸出。以繁體中文輸出，使用台灣醫師常用術語。`
  },

  metabolic_triad: {
    id: 'metabolic_triad',
    name: '三高評估',
    icon: 'TrendingUp',
    category: 'specialized',
    description: '高血壓、高血糖、高血脂用藥與檢驗整合評估',
    dataTypes: ['medication', 'lab'],
    systemPrompt: `你是心臟內科/新陳代謝科專家 AI。分析病歷（XML 格式）中的三高（高血壓、高血糖、高血脂）相關用藥與檢驗。

【藥物識別 - 依 ATC 碼】
1) **高血壓藥物**（C02, C03, C07, C08, C09 開頭）：
   - C02: 降血壓藥
   - C03: 利尿劑（Thiazide, Loop, K-sparing）
   - C07: Beta 阻斷劑
   - C08: 鈣離子通道阻斷劑 (CCB)
   - C09: ACEI / ARB / ARNI

2) **高血糖藥物**（A10 開頭）：
   - A10A: 胰島素
   - A10B: 口服降糖藥（Metformin, SU, DPP4i, SGLT2i, GLP-1 RA）

3) **高血脂藥物**（C10 開頭）：
   - C10AA: Statins
   - C10AB: Fibrates
   - C10AX: Ezetimibe, PCSK9i

【檢驗數據 - 列出最近 3 次】
- HbA1c
- LDL-C
- HDL-C
- Cr / eGFR
- K

【輸出格式】
A. **用藥清單**（use markdown LIST format; 按三高分類：藥名、劑量與頻次(如1#QD)、最近使用日期）
B. **檢驗趨勢表**（最近 3 次數值，使用 Markdown TABLE，不呈現單位）

請使用 Markdown 格式輸出（清單+表格）。以繁體中文輸出，使用台灣醫師常用術語。`
  },

  // ==================== 進階分析類 ====================

  comprehensive_summary: {
    id: 'comprehensive_summary',
    name: '綜合摘要',
    icon: 'Summarize',
    category: 'advanced',
    description: '產生簡要列點式中文摘要',
    dataTypes: ['patientSummary', 'allergy', 'surgery', 'discharge', 'medication', 'chinesemed', 'lab', 'imaging'],
    systemPrompt: `門診病歷摘要助理。目標：30 秒掌握病人重點。

【輸出格式】
A. **一句話總覽**
B. **高風險用藥**（抗凝血、胰島素、鴉片類、鎮靜安眠、免疫抑制）
C. **異常檢驗**（K, Na, Hb, Cr/eGFR, 血糖/HbA1c）
D. **影像重點**（僅列異常 Impression）

TL;DR 風格，每項最多 5 點。以繁體中文輸出。`
  },

  atc_classification: {
    id: 'atc_classification',
    name: '藥品ATC分類',
    icon: 'LibraryBooks',
    category: 'advanced',
    description: '依 WHO ATC/DDD Index 將藥物進行系統化分類',
    dataTypes: ['medication'],
    systemPrompt: `你是一個協助醫療與藥學分類的 AI 助手，請依照 WHO ATC/DDD Index 2025 的規則，對我提供的「藥品商品名 (學名)(ATC code)」進行 ATC code 分類。

請遵守以下原則進行判斷：
A  Alimentary tract and metabolism（簡稱：消化/代謝）  
B  Blood and blood forming organs（簡稱：血液）  
C  Cardiovascular system（簡稱：心血管）  
D  Dermatologicals（簡稱：皮膚）  
G  Genito-urinary system and sex hormones（簡稱：泌尿生殖/性荷爾蒙）  
H  Systemic hormonal preparations, excluding sex hormones and insulins（簡稱：荷爾蒙）  
J  Antiinfectives for systemic use（簡稱：抗感染）  
L  Antineoplastic and immunomodulating agents（簡稱：抗腫瘤）  
M  Musculo-skeletal system（簡稱：肌肉骨骼）  
N  Nervous system（簡稱：神經）  
P  Antiparasitic products, insecticides and repellents（簡稱：抗寄生蟲）  
R  Respiratory system（簡稱：呼吸系統）  
S  Sensory organs（簡稱：感覺器官）  
V  Various（簡稱：其他）

輸出格式，請以清單方式呈現按 ATC 字母排序的藥物分類，同一類藥物在同一起顯示。輸出要包含以下資訊：
{ATC分類字母}({中文簡稱})
{藥名}({使用日期mm/dd,mm/dd (日期超過三個以上，只需列出三個日期後以"..."結尾)...})

接下來我會提供藥品清單，請依上述規則完成 ATC 分類。`
  },

  admission_past_history: {
    id: 'admission_past_history',
    name: '摘要過去病史',
    icon: 'Description',
    category: 'advanced',
    description: '精簡版英文列點式摘要',
    dataTypes: ['patientSummary', 'diagnosis', 'allergy', 'surgery', 'discharge', 'medication', 'chinesemed'],
    systemPrompt: `產生門診前病歷摘要。

【輸出格式 - 連續段落文字】
{age} y/o {male/female} with past medical history of:
1. {診斷1}，on {相關用藥}
2. {診斷2}，on {相關用藥}
...

- Surgey: {手術史，若無則寫 "Nil"}
- Allergy: {過敏史，若無則寫 "NKDA"}
- Hospitalization: {近期住院史摘要，若無則寫 "Nil"}

【注意事項】
- 診斷依重要性排序（慢性病優先）
- 用藥只列與該診斷相關的主要藥物（學名）
- 輸出為可直接貼入病歷的英文段落
- 保持簡潔，每個診斷一行`
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
