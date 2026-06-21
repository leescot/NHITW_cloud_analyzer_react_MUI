// CKM (Cardiovascular-Kidney-Metabolic) syndrome 篩選定義

// ICD 碼前綴 → 分類
export const CKM_ICD_PREFIXES = {
  cardiovascular: [
    { prefix: 'I10', desc: '高血壓' },
    { prefix: 'I11', desc: '高血壓性心臟病' },
    { prefix: 'I12', desc: '高血壓性腎臟病' },
    { prefix: 'I13', desc: '高血壓性心腎病' },
    { prefix: 'I15', desc: '續發性高血壓' },
    { prefix: 'I20', desc: '心絞痛' },
    { prefix: 'I21', desc: '急性心肌梗塞' },
    { prefix: 'I22', desc: '再發性心肌梗塞' },
    { prefix: 'I23', desc: '急性心肌梗塞後併發症' },
    { prefix: 'I24', desc: '其他急性缺血性心臟病' },
    { prefix: 'I25', desc: '慢性缺血性心臟病' },
    { prefix: 'I26', desc: '肺栓塞' },
    { prefix: 'I27', desc: '其他肺心病' },
    { prefix: 'I28', desc: '其他肺血管疾病' },
    { prefix: 'I30', desc: '急性心包膜炎' },
    { prefix: 'I31', desc: '其他心包膜疾病' },
    { prefix: 'I33', desc: '急性心內膜炎' },
    { prefix: 'I34', desc: '非風濕性二尖瓣疾病' },
    { prefix: 'I35', desc: '非風濕性主動脈瓣疾病' },
    { prefix: 'I38', desc: '心內膜炎瓣膜未明示' },
    { prefix: 'I42', desc: '心肌病變' },
    { prefix: 'I43', desc: '其他疾病引起的心肌病變' },
    { prefix: 'I44', desc: '房室及左乳突傳導阻滯' },
    { prefix: 'I45', desc: '其他傳導障礙' },
    { prefix: 'I46', desc: '心臟停止' },
    { prefix: 'I47', desc: '陣發性心搏過速' },
    { prefix: 'I48', desc: '心房撲動及心房顫動' },
    { prefix: 'I49', desc: '其他心律不整' },
    { prefix: 'I50', desc: '心衰竭' },
    { prefix: 'I60', desc: '蜘蛛膜下腔出血' },
    { prefix: 'I61', desc: '腦內出血' },
    { prefix: 'I62', desc: '其他非外傷性顱內出血' },
    { prefix: 'I63', desc: '腦梗塞' },
    { prefix: 'I64', desc: '中風未明示' },
    { prefix: 'I65', desc: '腦前動脈阻塞及狹窄' },
    { prefix: 'I66', desc: '腦動脈阻塞及狹窄' },
    { prefix: 'I67', desc: '其他腦血管疾病' },
    { prefix: 'I69', desc: '腦血管疾病後遺症' },
    { prefix: 'I70', desc: '動脈粥狀硬化' },
    { prefix: 'I71', desc: '主動脈瘤及剝離' },
    { prefix: 'I72', desc: '其他動脈瘤' },
    { prefix: 'I73', desc: '其他週邊血管疾病' },
    { prefix: 'I74', desc: '動脈栓塞及血栓' },
    { prefix: 'I77', desc: '其他動脈及小動脈疾病' },
    { prefix: 'I79', desc: '動脈疾病（分類於他處）' },
  ],
  kidney: [
    { prefix: 'N17', desc: '急性腎衰竭' },
    { prefix: 'N18', desc: '慢性腎臟病' },
    { prefix: 'N19', desc: '未明示腎衰竭' },
    { prefix: 'E112', desc: '第二型糖尿病伴腎臟病變' },
  ],
  metabolic: [
    { prefix: 'E10', desc: '第一型糖尿病' },
    { prefix: 'E11', desc: '第二型糖尿病' },
    { prefix: 'E12', desc: '營養不良相關糖尿病' },
    { prefix: 'E13', desc: '其他明示糖尿病' },
    { prefix: 'E14', desc: '未明示糖尿病' },
    { prefix: 'E66', desc: '過重及肥胖' },
    { prefix: 'E78', desc: '脂蛋白代謝異常及脂質血症' },
    { prefix: 'E79', desc: '嘌呤及嘧啶代謝異常' },
    { prefix: 'M10', desc: '痛風' },
    { prefix: 'K760', desc: '脂肪肝' },
    { prefix: 'E87', desc: '體液電解質酸鹼異常' },
  ],
};

// ATC 藥物碼前綴 → 類別
export const CKM_ATC_PREFIXES = {
  antidiabetic:     { prefixes: ['A10'], label: '血糖' },
  antihypertensive: { prefixes: ['C02', 'C07', 'C08', 'C09'], label: '血壓' },
  diuretic:         { prefixes: ['C03'], label: '利尿' },
  lipidLowering:    { prefixes: ['C10'], label: '血脂' },
  antithrombotic:   { prefixes: ['B01'], label: '血栓' },
  cardiac:          { prefixes: ['C01'], label: '心臟' },
};

// Lab 檢驗碼 → 分組
export const CKM_LAB_CODES = {
  renal: [
    { code: '09015C', name: 'Cr / eGFR' },
    { code: '09002C', name: 'BUN' },
    { code: '12111C', name: 'UACR' },
    { code: '09040C', name: 'UPCR' },
    { code: '09016C', name: 'Urine Cr' },
    { code: '08133B', name: 'Cystatin C' },
    { code: 'A00142', name: 'UACR' },
    { code: 'Y00001', name: 'eGFR (成健)' },
    { code: 'Y00002', name: 'UACR/UPCR (成健)' },
  ],
  glycemic: [
    { code: '09005C', name: 'Glucose' },
    { code: '09006C', name: 'HbA1c' },
    { code: '09140C', name: 'Glucose PC' },
    { code: '09086B', name: 'Insulin' },
    { code: '09087B', name: 'C-peptide' },
  ],
  lipid: [
    { code: '09001C', name: 'Cholesterol' },
    { code: '09004C', name: 'TG' },
    { code: '09043C', name: 'HDL' },
    { code: '09044C', name: 'LDL' },
  ],
  cardiac: [
    { code: '09098B', name: 'Troponin-T' },
    { code: '09099C', name: 'Troponin-I' },
    { code: '12193C', name: 'NT-proBNP' },
    { code: '09071C', name: 'CK-MB' },
    { code: '09032C', name: 'CK' },
    { code: '08079B', name: 'D-dimer' },
    { code: '09033C', name: 'LDH' },
  ],
  electrolyte: [
    { code: '09021C', name: 'Na' },
    { code: '09022C', name: 'K' },
    { code: '09011C', name: 'Ca' },
    { code: '09012C', name: 'P' },
    { code: '09046B', name: 'Mg' },
    { code: '09122C', name: 'iPTH' },
  ],
  other: [
    { code: '09013C', name: 'Uric acid' },
    { code: '09025C', name: 'GOT' },
    { code: '09026C', name: 'GPT' },
    { code: '09038C', name: 'Albumin' },
    { code: '12015C', name: 'CRP' },
    { code: '12114C', name: 'Homocysteine' },
    { code: '08011C', name: 'Hb' },
    { code: '12116C', name: 'Ferritin' },
    { code: '09020C', name: 'Iron' },
    { code: 'Y00006', name: '血壓' },
    { code: 'Y00005', name: '體重' },
  ],
};

// 所有 CKM Lab codes 的 flat set（快速查詢用）
export const CKM_LAB_CODE_SET = new Set(
  Object.values(CKM_LAB_CODES).flatMap(group => group.map(item => item.code))
);

// 趨勢圖用的 assay_item_name 匹配規則
export const TREND_ITEM_PATTERNS = {
  egfr: {
    codes: ['09015C', 'Y00001'],
    namePattern: /eGFR|GFR|腎絲球/i,
  },
  uacr: {
    codes: ['12111C', '09016C', 'A00142', 'Y00002'],
    namePattern: /ACR|白蛋白.*肌酸酐比|Albumin.*Creatinine|微白蛋白\/肌酸酐/i,
  },
  upcr: {
    codes: ['09040C', 'Y00002'],
    namePattern: /PCR|蛋白.*肌酸酐|Protein.*Creatinine/i,
  },
  hba1c: {
    codes: ['09006C'],
    namePattern: /HbA1c|糖化血色素|糖化血紅素|醣化/i,
  },
  glucose: {
    codes: ['09005C', '09140C'],
    namePattern: /Glucose|Sugar|血糖|葡萄糖/i,
  },
  ldl: {
    codes: ['09044C'],
    namePattern: /LDL|低密度/i,
  },
};

// 影像關鍵字（不區分大小寫）
export const CKM_IMAGING_KEYWORDS = [
  '心臟', 'cardiac', 'heart',
  '超音波', 'echo', 'echocardiography', 'echocardiogram',
  '心電圖', 'ECG', 'EKG',
  '頸動脈', 'carotid',
  '腎臟', 'renal', 'kidney',
  '冠狀動脈', 'coronary',
  '心導管', 'catheterization',
  '主動脈', 'aorta', 'aortic',
  '週邊血管', 'peripheral vascular',
  '胃鏡', 'gastroscopy', 'panendoscopy', '上消化道',
  '大腸鏡', 'colonoscopy', '結腸鏡',
];

export const CKM_IMAGING_REGEX = new RegExp(
  CKM_IMAGING_KEYWORDS.map(k => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|'),
  'i'
);
