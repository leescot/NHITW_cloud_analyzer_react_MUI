/**
 * 針灸適應症檢查工具
 *
 * 這個輕量化模組用於檢查患者診斷是否符合中醫針灸的申報條件：
 * 1. 高度複雜性針灸
 * 2. 中度複雜性針灸
 *
 * 使用智慧前綴比對而非完整展開的 ICD-10 清單，以減少 bundle 大小
 */

// ============================================================================
// 高度複雜性針灸適應症 ICD-10 碼
// ============================================================================
const HIGHLY_COMPLEX_CODES = [
  'A80',
  { range: ['C00', 'C96'] },  // 惡性腫瘤
  'D32', 'D33', 'D48', 'D49',
  { multiple: ['F02', 'F04', 'F09'] },
  { range: ['F03', 'F05'] },
  'F05',
  { multiple: ['F20', 'F21', 'F25'] },
  { multiple: ['F22', 'F23', 'F24'] },
  { range: ['F30', 'F39'] },
  'F84', 'F80', 'F82',
  { multiple: ['G11', 'G94'] },
  'G12',
  { multiple: ['G20', 'G21'] },
  'G35', 'G36', 'G40',
  { multiple: ['G45', 'G46', 'I67'] },
  'G70', 'G71', 'G80', 'G81',
  { multiple: ['G82', 'G83', 'B91'] },
  'G91',
  'G93.0', 'G93.1', 'G93.2', 'G93.3', 'G93.4', 'G93.5', 'G93.6', 'G93.7',
  { range: ['H30', 'H31'] },
  'H33', 'H34', 'H35', 'H36', 'H40', 'H42', 'H43', 'H46', 'H47', 'H49', 'H50', 'H51', 'H53', 'H54', 'H55',
  'I60',
  { multiple: ['I61', 'I62'] },
  { multiple: ['I65', 'I66', 'I63'] },
  'M45', 'M62.3',
  { range: ['M99.0', 'M99.7'] },
  { range: ['Q11', 'Q15'] },
  { multiple: ['S01.9', 'S06.3'] },
  { multiple: ['S01.9', 'S06.4', 'S06.5', 'S06.6'] },
  { range: ['S04.01', 'S04.04'] },
  { multiple: ['S14.1', 'S24.1', 'S34.1'] },
  { complex: ['S14.1+S12.0-S12.6', 'S24.1+S22.0', 'S34.1+S22.0-S32.0'] },
  { multiple: ['S14.2', 'S14.3', 'S24.2', 'S34.2', 'S34.4'] },
  { multiple: ['S14.5', 'S24.3'] },
  { multiple: ['S24.4', 'S24.8', 'S24.9', 'S34.5', 'S34.6', 'S34.8', 'S34.9'] },
  { range: ['S44.0', 'S44.9'] },
  { range: ['S54.0', 'S54.9'] },
  { range: ['S64.0', 'S64.9'] },
  { range: ['S74.0', 'S74.9'] },
  { range: ['S84.0', 'S84.9'] },
  { range: ['S94.0', 'S94.9'] },
  'P91'
];

// ============================================================================
// 中度複雜性針灸適應症 ICD-10 碼
// ============================================================================
const MODERATE_COMPLEX_CODES = [
  'G43', 'G50', 'G51', 'G52', 'G90', 'G54', 'G61', 'G62', 'G63', 'G65',
  'M13.0', 'M15', 'M20', 'M21', 'M66',
  'H02', 'H04', 'H05', 'H52', 'H10', 'H20', 'H25', 'H26'
];

// ============================================================================
// 特殊疾病 ICD-10 碼
// ============================================================================
const SPECIAL_DISEASE_CODES = [
  'A15',
  'B01', 'B02', 'B05', 'B06', 'B20', 'B97.2', 'B97.3',
  { range: ['D65', 'D70'] },
  { range: ['D82', 'D84'] },
  { range: ['E04', 'E06'] },
  { range: ['E10', 'E11'] },
  'E13', 'E15', 'E28',
  'F90', 'F95',
  { range: ['I20', 'I28'] },
  'I42', 'I50', 'I71', 'I73', 'I74', 'I80', 'I82', 'I89',
  'J44', 'J45', 'J93', 'J96', 'J98',
  'K72', 'K74', 'K80',
  { range: ['L10', 'L12'] },
  'L40', 'L51', 'L52', 'L89', 'L94', 'L97',
  { range: ['M33', 'M35'] },
  'M35.0', 'M35.00',
  'N18', 'N19',
  { range: ['O10', 'O16'] },
  { range: ['O20', 'O29'] },
  'R64'
];

// ============================================================================
// ICD-10 碼比對輔助函數
// ============================================================================

/**
 * 將 ICD-10 碼標準化（轉大寫並去除空格）
 */
const normalizeICD10 = (code) => {
  if (!code) return '';
  return code.toUpperCase().trim();
};

/**
 * 提取 ICD-10 碼的字母部分和數字部分
 * 例如：'G80.1' -> { letter: 'G', number: 80.1 }
 */
const parseICD10 = (code) => {
  const normalized = normalizeICD10(code);
  const match = normalized.match(/^([A-Z]+)(\d+(?:\.\d+)?)/);

  if (!match) return null;

  return {
    letter: match[1],
    number: parseFloat(match[2]),
    full: normalized
  };
};

/**
 * 檢查 ICD-10 碼是否在範圍內
 * 例如：checkRange('C50.1', 'C00', 'C96') -> true
 * 例如：checkRange('E11.22', 'E10', 'E11') -> true (E11.22 屬於 E11 的子分類)
 */
const checkRange = (code, start, end) => {
  const parsedCode = parseICD10(code);
  const parsedStart = parseICD10(start);
  const parsedEnd = parseICD10(end);

  if (!parsedCode || !parsedStart || !parsedEnd) return false;

  // 字母必須相同
  if (parsedCode.letter !== parsedStart.letter || parsedCode.letter !== parsedEnd.letter) {
    return false;
  }

  // 提取主要類別碼（小數點前的整數部分）
  const codeMainCategory = Math.floor(parsedCode.number);
  const startMainCategory = Math.floor(parsedStart.number);
  const endMainCategory = Math.floor(parsedEnd.number);

  // 檢查主要類別碼是否在範圍內
  // 例如：E11.22 的主類別是 11，應該在 E10(10) 到 E11(11) 的範圍內
  return codeMainCategory >= startMainCategory && codeMainCategory <= endMainCategory;
};

/**
 * 檢查 ICD-10 碼是否以指定前綴開頭
 * 例如：checkPrefix('G80.1', 'G80') -> true
 */
const checkPrefix = (code, prefix) => {
  const normalized = normalizeICD10(code);
  const normalizedPrefix = normalizeICD10(prefix);

  return normalized.startsWith(normalizedPrefix);
};

/**
 * 檢查 ICD-10 碼是否符合指定的比對規則
 */
const matchesRule = (icdCode, rule) => {
  // 如果規則是字串，使用前綴比對
  if (typeof rule === 'string') {
    return checkPrefix(icdCode, rule);
  }

  // 如果規則是範圍
  if (rule.range && Array.isArray(rule.range) && rule.range.length === 2) {
    return checkRange(icdCode, rule.range[0], rule.range[1]);
  }

  // 如果規則是多個選項
  if (rule.multiple && Array.isArray(rule.multiple)) {
    return rule.multiple.some(code => checkPrefix(icdCode, code));
  }

  // 如果規則是複合條件（暫時使用簡化處理）
  if (rule.complex && Array.isArray(rule.complex)) {
    // 對於複雜規則，檢查是否符合任一條件
    return rule.complex.some(complexCode => {
      // 處理如 'S14.1+S12.0-S12.6' 這樣的複合碼
      const parts = complexCode.split('+');
      return parts.some(part => {
        if (part.includes('-')) {
          const [start, end] = part.split('-');
          return checkRange(icdCode, start, end);
        }
        return checkPrefix(icdCode, part);
      });
    });
  }

  return false;
};

/**
 * 檢查 ICD-10 碼是否符合指定的碼列表
 */
const matchesCodeList = (icdCode, codeList) => {
  return codeList.some(rule => matchesRule(icdCode, rule));
};

// ============================================================================
// 主要檢查函數
// ============================================================================

/**
 * 檢查診斷資料中是否有符合高度複雜性針灸的病名
 * @param {Object} diagnosisData - 診斷資料（來自 Overview_RecentDiagnosis 的 useMemo）
 * @returns {Object} { isEligible: boolean, matchedDiagnoses: Array }
 */
export const checkHighlyComplexAcupuncture = (diagnosisData) => {
  if (!diagnosisData) {
    return { isEligible: false, matchedDiagnoses: [] };
  }

  const matchedDiagnoses = [];

  // 檢查門診診斷
  if (diagnosisData.outpatient && Array.isArray(diagnosisData.outpatient)) {
    diagnosisData.outpatient.forEach(diagnosis => {
      if (matchesCodeList(diagnosis.code, HIGHLY_COMPLEX_CODES)) {
        matchedDiagnoses.push({
          code: diagnosis.code,
          name: diagnosis.name,
          type: '門診',
          count: diagnosis.count
        });
      }
    });
  }

  // 檢查急診診斷
  if (diagnosisData.emergency && Array.isArray(diagnosisData.emergency)) {
    diagnosisData.emergency.forEach(diagnosis => {
      if (matchesCodeList(diagnosis.code, HIGHLY_COMPLEX_CODES)) {
        matchedDiagnoses.push({
          code: diagnosis.code,
          name: diagnosis.name,
          type: '急診',
          date: diagnosis.date
        });
      }
    });
  }

  // 檢查住診診斷
  if (diagnosisData.inpatient && Array.isArray(diagnosisData.inpatient)) {
    diagnosisData.inpatient.forEach(diagnosis => {
      if (matchesCodeList(diagnosis.code, HIGHLY_COMPLEX_CODES)) {
        matchedDiagnoses.push({
          code: diagnosis.code,
          name: diagnosis.name,
          type: '住診',
          date: diagnosis.date
        });
      }
    });
  }

  return {
    isEligible: matchedDiagnoses.length > 0,
    matchedDiagnoses
  };
};

/**
 * 檢查是否同時符合中度複雜性針灸和特殊疾病
 * @param {Object} diagnosisData - 診斷資料
 * @returns {Object} { isEligible: boolean, moderateMatches: Array, specialMatches: Array }
 */
export const checkModerateWithSpecialDisease = (diagnosisData) => {
  if (!diagnosisData) {
    return { isEligible: false, moderateMatches: [], specialMatches: [] };
  }

  const moderateMatches = [];
  const specialMatches = [];

  const allDiagnoses = [
    ...(diagnosisData.outpatient || []).map(d => ({ ...d, type: '門診' })),
    ...(diagnosisData.emergency || []).map(d => ({ ...d, type: '急診' })),
    ...(diagnosisData.inpatient || []).map(d => ({ ...d, type: '住診' }))
  ];

  allDiagnoses.forEach(diagnosis => {
    if (matchesCodeList(diagnosis.code, MODERATE_COMPLEX_CODES)) {
      moderateMatches.push({
        code: diagnosis.code,
        name: diagnosis.name,
        type: diagnosis.type,
        count: diagnosis.count,
        date: diagnosis.date
      });
    }

    if (matchesCodeList(diagnosis.code, SPECIAL_DISEASE_CODES)) {
      specialMatches.push({
        code: diagnosis.code,
        name: diagnosis.name,
        type: diagnosis.type,
        count: diagnosis.count,
        date: diagnosis.date
      });
    }
  });

  // 必須同時符合中度複雜性針灸和特殊疾病
  return {
    isEligible: moderateMatches.length > 0 && specialMatches.length > 0,
    moderateMatches,
    specialMatches
  };
};

/**
 * 檢查診斷資料中是否有符合中度複雜性針灸的病名
 * @param {Object} diagnosisData - 診斷資料
 * @returns {Object} { isEligible: boolean, matchedDiagnoses: Array }
 */
export const checkModerateComplexAcupuncture = (diagnosisData) => {
  if (!diagnosisData) {
    return { isEligible: false, matchedDiagnoses: [] };
  }

  const matchedDiagnoses = [];

  const allDiagnoses = [
    ...(diagnosisData.outpatient || []).map(d => ({ ...d, type: '門診' })),
    ...(diagnosisData.emergency || []).map(d => ({ ...d, type: '急診' })),
    ...(diagnosisData.inpatient || []).map(d => ({ ...d, type: '住診' }))
  ];

  allDiagnoses.forEach(diagnosis => {
    if (matchesCodeList(diagnosis.code, MODERATE_COMPLEX_CODES)) {
      matchedDiagnoses.push({
        code: diagnosis.code,
        name: diagnosis.name,
        type: diagnosis.type,
        count: diagnosis.count,
        date: diagnosis.date
      });
    }
  });

  return {
    isEligible: matchedDiagnoses.length > 0,
    matchedDiagnoses
  };
};

/**
 * 檢查診斷資料中是否有符合特殊疾病的病名
 * @param {Object} diagnosisData - 診斷資料
 * @returns {Object} { isEligible: boolean, matchedDiagnoses: Array }
 */
export const checkSpecialDisease = (diagnosisData) => {
  if (!diagnosisData) {
    return { isEligible: false, matchedDiagnoses: [] };
  }

  const matchedDiagnoses = [];

  const allDiagnoses = [
    ...(diagnosisData.outpatient || []).map(d => ({ ...d, type: '門診' })),
    ...(diagnosisData.emergency || []).map(d => ({ ...d, type: '急診' })),
    ...(diagnosisData.inpatient || []).map(d => ({ ...d, type: '住診' }))
  ];

  allDiagnoses.forEach(diagnosis => {
    if (matchesCodeList(diagnosis.code, SPECIAL_DISEASE_CODES)) {
      matchedDiagnoses.push({
        code: diagnosis.code,
        name: diagnosis.name,
        type: diagnosis.type,
        count: diagnosis.count,
        date: diagnosis.date
      });
    }
  });

  return {
    isEligible: matchedDiagnoses.length > 0,
    matchedDiagnoses
  };
};

/**
 * 檢查患者的針灸申報資格（整合所有檢查）
 * @param {Object} diagnosisData - 診斷資料
 * @returns {Object} 完整的檢查結果
 */
export const checkAcupunctureEligibility = (diagnosisData) => {
  // 檢查高度複雜性針灸適應症
  const highlyComplexResult = checkHighlyComplexAcupuncture(diagnosisData);

  // 檢查中度複雜性針灸適應症
  const moderateResult = checkModerateComplexAcupuncture(diagnosisData);

  // 檢查特殊疾病
  const specialDiseaseResult = checkSpecialDisease(diagnosisData);

  // 建立診斷碼的 Set 以便快速查找
  const highlyComplexCodes = new Set(highlyComplexResult.matchedDiagnoses.map(d => d.code));

  // === 高度複雜性針灸 ===
  // 1. 直接符合高度複雜性針灸適應症的病名
  const highlyComplexDiagnoses = [...highlyComplexResult.matchedDiagnoses];

  // 2. 同時符合中度複雜性和特殊疾病的病名（這些病名也算高度複雜性）
  const moderateCodes = new Set(moderateResult.matchedDiagnoses.map(d => d.code));
  const specialCodes = new Set(specialDiseaseResult.matchedDiagnoses.map(d => d.code));

  // 找出同時符合中度和特殊疾病的病名
  const moderateAndSpecialDiagnoses = [
    ...moderateResult.matchedDiagnoses.filter(d => specialCodes.has(d.code)),
    ...specialDiseaseResult.matchedDiagnoses.filter(d => moderateCodes.has(d.code) && !highlyComplexCodes.has(d.code))
  ];

  // 去除重複的診斷
  const uniqueModerateAndSpecial = Array.from(
    new Map(moderateAndSpecialDiagnoses.map(d => [d.code, d])).values()
  );

  highlyComplexDiagnoses.push(...uniqueModerateAndSpecial);

  // === 中度複雜性針灸（僅包含不符合高度複雜性的病名）===
  const moderateOnlyDiagnoses = [];

  // 加入符合中度但不符合高度的病名
  moderateResult.matchedDiagnoses.forEach(d => {
    if (!highlyComplexCodes.has(d.code) && !specialCodes.has(d.code)) {
      moderateOnlyDiagnoses.push(d);
    }
  });

  // 加入符合特殊疾病但不符合高度、也不符合中度的病名
  specialDiseaseResult.matchedDiagnoses.forEach(d => {
    if (!highlyComplexCodes.has(d.code) && !moderateCodes.has(d.code)) {
      moderateOnlyDiagnoses.push(d);
    }
  });

  // 去除重複的診斷
  const uniqueModerateOnly = Array.from(
    new Map(moderateOnlyDiagnoses.map(d => [d.code, d])).values()
  );

  return {
    highlyComplex: {
      isEligible: highlyComplexDiagnoses.length > 0,
      matchedDiagnoses: highlyComplexDiagnoses
    },
    moderateComplex: {
      isEligible: uniqueModerateOnly.length > 0,
      matchedDiagnoses: uniqueModerateOnly
    }
  };
};
