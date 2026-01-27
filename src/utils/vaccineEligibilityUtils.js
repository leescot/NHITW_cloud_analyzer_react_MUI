/**
 * 疫苗適用性判定工具
 * 基於台灣 ACIP（預防接種諮詢委員會）建議及公費疫苗接種政策
 * 政策更新日期：115年1月15日（2026年）
 *
 * 此模組包含：
 * - 慢性病偵測（透過 ICD 碼辨識）
 * - IPD 高風險對象偵測（脾臟功能缺損、免疫不全、人工耳植入、
 *   腦脊髓液滲漏、惡性腫瘤+免疫抑制治療、器官移植）
 * - 疫苗比對邏輯（透過 ATC 碼和藥名關鍵字辨識已接種疫苗）
 * - 各疫苗適用性規則與公費/自費判定
 * - 肺炎鏈球菌疫苗 115 年新政策（PCV20 單劑取代 PCV13+PPV23）
 */

// ============================================================
// 1. 慢性病偵測 - 用於判定流感等疫苗高風險族群資格
// ============================================================

const CHRONIC_CONDITION_PATTERNS = [
  { id: 'diabetes', name: '糖尿病', patterns: [/^E0[89]/, /^E1[0-4]/] },
  { id: 'heartDisease', name: '心血管疾病', patterns: [/^I1[0-5]/, /^I2[0-5]/, /^I50/] },
  { id: 'lungDisease', name: '慢性肺病', patterns: [/^J4[0-7]/] },
  { id: 'kidneyDisease', name: '慢性腎病', patterns: [/^N18/] },
  { id: 'liverDisease', name: '慢性肝病', patterns: [/^K7[0-7]/, /^B18/] },
  { id: 'cancer', name: '癌症', patterns: [/^C[0-9]/] },
  { id: 'immunodeficiency', name: '免疫不全', patterns: [/^D8[0-9]/, /^B20/] },
  { id: 'stroke', name: '腦血管疾病', patterns: [/^I6[0-9]/] },
  { id: 'obesity', name: '肥胖', patterns: [/^E66/] },
];

/**
 * 從用藥紀錄中偵測慢性病
 * @param {Array} groupedMedications - 分組後的用藥資料
 * @returns {Set<string>} 偵測到的慢性病 ID 集合
 */
export const detectChronicConditions = (groupedMedications = []) => {
  const conditions = new Set();

  for (const group of groupedMedications) {
    if (!group.icd_code) continue;
    const code = group.icd_code.toUpperCase();

    for (const condition of CHRONIC_CONDITION_PATTERNS) {
      if (conditions.has(condition.id)) continue;
      for (const pattern of condition.patterns) {
        if (pattern.test(code)) {
          conditions.add(condition.id);
          break;
        }
      }
    }
  }

  return conditions;
};

// ============================================================
// 2. IPD 高風險對象偵測
//    定義：脾臟功能缺損、先天或後天免疫功能不全、人工耳植入、
//    腦脊髓液滲漏、一年內接受免疫抑制劑或放射治療的惡性腫瘤者
//    及器官移植者
// ============================================================

/** IPD 高風險 ICD 碼對應 */
const IPD_HIGH_RISK_ICD_PATTERNS = [
  { id: 'asplenia', name: '脾臟功能缺損', patterns: [/^D73/, /^Z90\.81/] },
  { id: 'immunodeficiency', name: '免疫功能不全', patterns: [/^D8[0-4]/, /^D89/, /^B20/] },
  { id: 'cochlearImplant', name: '人工耳植入', patterns: [/^Z96\.21/] },
  { id: 'csfLeak', name: '腦脊髓液滲漏', patterns: [/^G96\.0/] },
  { id: 'organTransplant', name: '器官移植', patterns: [/^Z94/] },
];

/**
 * 偵測 IPD 高風險對象
 * @param {Array} groupedMedications - 分組後的用藥資料
 * @returns {{ isHighRisk: boolean, conditions: Set<string> }}
 */
export const detectIPDHighRisk = (groupedMedications = []) => {
  const conditions = new Set();
  let hasCancerDiagnosis = false;
  let hasRecentImmunosuppressiveTherapy = false;

  const oneYearAgo = new Date();
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

  for (const group of groupedMedications) {
    const code = (group.icd_code || '').toUpperCase();
    const groupDate = group.date ? new Date(group.date.replace(/\//g, '-')) : null;

    // 比對 ICD 碼
    for (const condition of IPD_HIGH_RISK_ICD_PATTERNS) {
      for (const pattern of condition.patterns) {
        if (pattern.test(code)) {
          conditions.add(condition.id);
          break;
        }
      }
    }

    // 偵測惡性腫瘤
    if (/^C[0-9]/.test(code)) {
      hasCancerDiagnosis = true;
    }

    // 偵測一年內的免疫抑制劑或抗腫瘤藥物（ATC: L01 抗腫瘤, L04 免疫抑制劑）
    const medications = group.medications || [];
    for (const med of medications) {
      if (med.atc_code && (med.atc_code.startsWith('L01') || med.atc_code.startsWith('L04'))) {
        if (groupDate && groupDate >= oneYearAgo) {
          hasRecentImmunosuppressiveTherapy = true;
        }
      }
    }
  }

  // 惡性腫瘤 + 一年內免疫抑制/放射治療
  if (hasCancerDiagnosis && hasRecentImmunosuppressiveTherapy) {
    conditions.add('cancerWithTherapy');
  }

  return {
    isHighRisk: conditions.size > 0,
    conditions,
  };
};

// ============================================================
// 3. 疫苗比對邏輯 - 從用藥紀錄中辨識已接種疫苗
// ============================================================

const VACCINE_MATCHERS = [
  {
    id: 'influenza',
    match: (med) => {
      if (med.atc_code && med.atc_code.startsWith('J07BB')) return true;
      const name = (med.name || '').toUpperCase();
      return name.includes('INFLUENZA') || name.includes('FLU VACCINE') ||
             name.includes('FLUCELVAX') || name.includes('FLUARIX');
    }
  },
  {
    id: 'pcv20',
    match: (med) => {
      if (!med.atc_code || !med.atc_code.startsWith('J07AL')) return false;
      const name = (med.name || '').toUpperCase();
      return name.includes('APEXXNAR') || name.includes('PCV20') ||
             (name.includes('PREVNAR') && name.includes('20')) ||
             (name.includes('PREVENAR') && name.includes('20'));
    }
  },
  {
    id: 'pcv13',
    match: (med) => {
      if (!med.atc_code || !med.atc_code.startsWith('J07AL')) return false;
      const name = (med.name || '').toUpperCase();
      return name.includes('PCV13') || name.includes('PCV15') ||
             (name.includes('PREVNAR') && (name.includes('13') || name.includes('15'))) ||
             (name.includes('PREVENAR') && (name.includes('13') || name.includes('15'))) ||
             name.includes('VAXNEUVANCE');
    }
  },
  {
    id: 'ppv23',
    match: (med) => {
      if (!med.atc_code) return false;
      if (med.atc_code === 'J07AL01' || med.atc_code.startsWith('J07AL01')) return true;
      if (!med.atc_code.startsWith('J07AL')) return false;
      const name = (med.name || '').toUpperCase();
      return name.includes('PNEUMOVAX') || name.includes('PPV23') ||
             name.includes('PNEUMO 23') || name.includes('PPSV23');
    }
  },
  {
    id: 'pneumococcal_unknown',
    match: (med) => {
      if (!med.atc_code || !med.atc_code.startsWith('J07AL')) return false;
      const name = (med.name || '').toUpperCase();
      return !name.includes('APEXXNAR') && !name.includes('PCV20') &&
             !name.includes('PCV13') && !name.includes('PCV15') &&
             !name.includes('PREVNAR') && !name.includes('PREVENAR') &&
             !name.includes('VAXNEUVANCE') &&
             !name.includes('PNEUMOVAX') && !name.includes('PPV23') &&
             !name.includes('PNEUMO 23') && !name.includes('PPSV23');
    }
  },
  {
    id: 'shingles',
    match: (med) => {
      if (med.atc_code && med.atc_code.startsWith('J07BK')) return true;
      const name = (med.name || '').toUpperCase();
      return name.includes('SHINGRIX') || name.includes('ZOSTAVAX');
    }
  },
  {
    id: 'tdap',
    match: (med) => {
      if (med.atc_code && (med.atc_code.startsWith('J07AJ') || med.atc_code.startsWith('J07CA'))) return true;
      const name = (med.name || '').toUpperCase();
      return name.includes('ADACEL') || name.includes('BOOSTRIX') || name.includes('TDAP');
    }
  },
  {
    id: 'hepb',
    match: (med) => {
      if (med.atc_code && med.atc_code.startsWith('J07BC01')) return true;
      if (med.atc_code && med.atc_code.startsWith('J07BC') && !med.atc_code.startsWith('J07BC02')) {
        const name = (med.name || '').toUpperCase();
        if (name.includes('ENGERIX') || name.includes('HEPLISAV') || name.includes('RECOMBIVAX')) return true;
      }
      const name = (med.name || '').toUpperCase();
      return name.includes('ENGERIX') || name.includes('HEPLISAV') || name.includes('RECOMBIVAX');
    }
  },
  {
    id: 'covid19',
    match: (med) => {
      if (med.atc_code && (med.atc_code.startsWith('J07BN') || med.atc_code.startsWith('J07BX03'))) return true;
      const name = (med.name || '').toUpperCase();
      return name.includes('COMIRNATY') || name.includes('MODERNA') ||
             name.includes('NOVAVAX') || name.includes('COVID') ||
             name.includes('SPIKEVAX');
    }
  },
  {
    id: 'hpv',
    match: (med) => {
      if (med.atc_code && med.atc_code.startsWith('J07BM')) return true;
      const name = (med.name || '').toUpperCase();
      return name.includes('GARDASIL') || name.includes('CERVARIX') || name.includes('HPV');
    }
  }
];

// ============================================================
// 4. 疫苗接種歷史擷取
// ============================================================

/**
 * 從用藥紀錄中擷取疫苗接種歷史
 * @param {Array} groupedMedications - 分組後的用藥資料
 * @returns {Map<string, {dates: string[], medications: string[]}>}
 */
export const extractVaccinationHistory = (groupedMedications = []) => {
  const history = new Map();

  for (const group of groupedMedications) {
    const medications = group.medications || [];

    for (const med of medications) {
      for (const matcher of VACCINE_MATCHERS) {
        if (matcher.match(med)) {
          const record = history.get(matcher.id) || { dates: [], medications: [] };
          if (group.date && !record.dates.includes(group.date)) {
            record.dates.push(group.date);
          }
          const medName = med.name || med.ingredient || '';
          if (medName && !record.medications.includes(medName)) {
            record.medications.push(medName);
          }
          history.set(matcher.id, record);
          break;
        }
      }
    }
  }

  // 排序（最新在前）
  for (const [, record] of history) {
    record.dates.sort((a, b) => b.localeCompare(a));
  }

  return history;
};

// ============================================================
// 5. 時間間隔工具
// ============================================================

/** 計算距離最近接種日的月數 */
const getMonthsSinceLatest = (dates) => {
  if (!dates || dates.length === 0) return Infinity;
  const latest = new Date(dates[0].replace(/\//g, '-'));
  if (isNaN(latest.getTime())) return Infinity;
  const now = new Date();
  return (now.getFullYear() - latest.getFullYear()) * 12 +
         (now.getMonth() - latest.getMonth());
};

/** 檢查是否在指定月數內接種過 */
const isVaccinatedWithinMonths = (dates, months) => {
  if (!dates || dates.length === 0) return false;
  const now = new Date();
  const cutoff = new Date();
  cutoff.setMonth(cutoff.getMonth() - months);
  return dates.some(dateStr => {
    const d = new Date(dateStr.replace(/\//g, '-'));
    return !isNaN(d.getTime()) && d >= cutoff;
  });
};

// ============================================================
// 6. 肺炎鏈球菌疫苗分析（115年新政策）
//
// 公費對象：≥65歲、55-64歲原住民、19-64歲 IPD 高風險
//
// 接種史判定：
//   從未接種           → PCV20（1劑）
//   僅接種過 PPV23     → PCV20（間隔≥1年）
//   僅接種過 PCV13/15  → PPV23 過渡期銜接（間隔≥1年，高風險≥8週）
//   PCV13/15 + PPV23   → 已完成
//   PCV20              → 已完成
//   65歲前完整接種之IPD高風險者 → 滿65歲且間隔≥5年可追加PCV20
// ============================================================

/**
 * 分析肺炎鏈球菌疫苗接種狀態與建議
 * @param {Object} ctx - 評估上下文
 * @returns {{ name, isVaccinated, latestDate, fundingStatus, note }}
 */
const analyzePneumococcal = (ctx) => {
  const hasPCV13 = ctx.vaccinationHistory.has('pcv13');
  const hasPCV20 = ctx.vaccinationHistory.has('pcv20');
  const hasPPV23 = ctx.vaccinationHistory.has('ppv23');

  const pcv13Record = ctx.vaccinationHistory.get('pcv13');
  const pcv20Record = ctx.vaccinationHistory.get('pcv20');
  const ppv23Record = ctx.vaccinationHistory.get('ppv23');

  const monthsSincePCV13 = pcv13Record ? getMonthsSinceLatest(pcv13Record.dates) : Infinity;
  const monthsSincePPV23 = ppv23Record ? getMonthsSinceLatest(ppv23Record.dates) : Infinity;

  // 公費資格判定
  const isFunded = ctx.age >= 65 || ctx.isIPDHighRisk || (ctx.age >= 55 && ctx.age <= 64);
  // 55-64 歲需原住民身分才有公費（系統無法判定，以提示處理）
  const needsAboriginalCheck = ctx.age >= 55 && ctx.age <= 64 && !ctx.isIPDHighRisk;

  const fundingNote = needsAboriginalCheck ? '（55-64歲需具原住民身分，請確認身分證明）' : '';

  // ── 情形一：已完成接種 ──
  if (hasPCV20) {
    return {
      name: '肺炎鏈球菌疫苗',
      isVaccinated: true,
      latestDate: pcv20Record?.dates?.[0] || null,
      fundingStatus: '—',
      note: '已接種PCV20，肺炎鏈球菌疫苗接種完成',
    };
  }

  if (hasPCV13 && hasPPV23) {
    const latestDate = (pcv13Record?.dates?.[0] || '') > (ppv23Record?.dates?.[0] || '')
      ? pcv13Record.dates[0]
      : ppv23Record.dates[0];
    return {
      name: '肺炎鏈球菌疫苗',
      isVaccinated: true,
      latestDate,
      fundingStatus: '—',
      note: '已接種PCV13+PPV23，肺炎鏈球菌疫苗接種完成',
    };
  }

  // ── 情形二：從未接種 → PCV20 ──
  if (!hasPCV13 && !hasPCV20 && !hasPPV23) {
    return {
      name: '肺炎鏈球菌疫苗 — PCV20',
      isVaccinated: false,
      latestDate: null,
      fundingStatus: isFunded ? '公費' : '自費',
      note: `從未接種，建議接種1劑PCV20${fundingNote}`,
    };
  }

  // ── 情形三：僅接種過 PPV23 → PCV20（間隔≥1年）──
  if (hasPPV23 && !hasPCV13 && !hasPCV20) {
    const intervalMet = monthsSincePPV23 >= 12;
    return {
      name: '肺炎鏈球菌疫苗 — PCV20',
      isVaccinated: false,
      latestDate: ppv23Record?.dates?.[0] || null,
      fundingStatus: isFunded ? '公費' : '自費',
      note: intervalMet
        ? `曾接種PPV23，間隔已滿1年，建議接種PCV20${fundingNote}`
        : `曾接種PPV23(${ppv23Record?.dates?.[0]})，需間隔滿1年後接種PCV20${fundingNote}`,
    };
  }

  // ── 情形四：僅接種過 PCV13/15 → PPV23 過渡期銜接（間隔≥1年，高風險≥8週）──
  if (hasPCV13 && !hasPPV23 && !hasPCV20) {
    const requiredMonths = ctx.isIPDHighRisk ? 2 : 12; // 高風險 8 週 ≈ 2 個月
    const intervalMet = monthsSincePCV13 >= requiredMonths;
    const intervalText = ctx.isIPDHighRisk ? '8週' : '1年';

    return {
      name: '肺炎鏈球菌疫苗 — PPV23（過渡期銜接）',
      isVaccinated: false,
      latestDate: pcv13Record?.dates?.[0] || null,
      fundingStatus: isFunded ? '公費' : '自費',
      note: intervalMet
        ? `曾接種PCV13，間隔已滿${intervalText}，建議接種PPV23銜接${fundingNote}`
        : `曾接種PCV13(${pcv13Record?.dates?.[0]})，需間隔滿${intervalText}後接種PPV23${fundingNote}`,
    };
  }

  // 其他未知狀態
  return {
    name: '肺炎鏈球菌疫苗',
    isVaccinated: false,
    latestDate: null,
    fundingStatus: isFunded ? '公費' : '自費',
    note: `請確認過去肺炎鏈球菌疫苗接種史${fundingNote}`,
  };
};

// ============================================================
// 7. 疫苗規則定義
// ============================================================

const VACCINE_RULES = [
  // ── 流感疫苗 ──
  {
    id: 'influenza',
    name: '流感疫苗',
    isEligible: (ctx) => ctx.age >= 50 || ctx.hasChronicCondition,
    isVaccinated: (ctx) => {
      const record = ctx.vaccinationHistory.get('influenza');
      if (!record) return false;
      return isVaccinatedWithinMonths(record.dates, 12);
    },
    getLatestDate: (ctx) => ctx.vaccinationHistory.get('influenza')?.dates?.[0] || null,
    getFundingStatus: (ctx) => {
      if (ctx.age >= 65) return '公費';
      if (ctx.age >= 50 && ctx.hasChronicCondition) return '公費';
      return '自費';
    },
    getNote: (ctx) => {
      if (ctx.age >= 65) return '每年10月開放接種';
      if (ctx.age >= 50 && ctx.hasChronicCondition) return '慢性病患者公費資格';
      return '建議每年接種';
    }
  },

  // ── 肺炎鏈球菌疫苗（使用獨立分析邏輯）──
  {
    id: 'pneumococcal',
    name: null, // 由 analyzePneumococcal 動態決定
    isEligible: (ctx) => {
      // ≥65 歲、55-64 歲（原住民需現場確認）、19-64 歲 IPD 高風險
      if (ctx.age >= 65) return true;
      if (ctx.age >= 55) return true; // 55-64 含原住民提示
      if (ctx.age >= 19 && ctx.isIPDHighRisk) return true;
      return false;
    },
    // 以下欄位由 analyzePneumococcal 覆蓋，此處僅為佔位
    isVaccinated: () => false,
    getLatestDate: () => null,
    getFundingStatus: () => '公費',
    getNote: () => '',
  },

  // ── 帶狀疱疹疫苗 ──
  {
    id: 'shingles',
    name: '帶狀疱疹疫苗',
    isEligible: (ctx) => ctx.age >= 50,
    isVaccinated: (ctx) => ctx.vaccinationHistory.has('shingles'),
    getLatestDate: (ctx) => ctx.vaccinationHistory.get('shingles')?.dates?.[0] || null,
    getFundingStatus: () => '自費',
    getNote: () => 'Shingrix需接種2劑(間隔2-6個月)',
  },

  // ── Tdap 百日咳/破傷風/白喉 ──
  {
    id: 'tdap',
    name: 'Tdap 百日咳/破傷風/白喉',
    isEligible: (ctx) => ctx.age >= 19,
    isVaccinated: (ctx) => {
      const record = ctx.vaccinationHistory.get('tdap');
      if (!record) return false;
      return isVaccinatedWithinMonths(record.dates, 120);
    },
    getLatestDate: (ctx) => ctx.vaccinationHistory.get('tdap')?.dates?.[0] || null,
    getFundingStatus: () => '自費',
    getNote: () => '每10年追加1劑',
  },

  // ── B 型肝炎疫苗 ──
  {
    id: 'hepb',
    name: 'B型肝炎疫苗',
    isEligible: (ctx) => {
      if (ctx.ckdStage && ctx.ckdStage >= 3) return true;
      if (ctx.chronicConditions.has('liverDisease')) return true;
      if (ctx.chronicConditions.has('immunodeficiency')) return true;
      if (ctx.chronicConditions.has('diabetes')) return true;
      return false;
    },
    isVaccinated: (ctx) => ctx.vaccinationHistory.has('hepb'),
    getLatestDate: (ctx) => ctx.vaccinationHistory.get('hepb')?.dates?.[0] || null,
    getFundingStatus: () => '自費',
    getNote: (ctx) => {
      if (ctx.ckdStage && ctx.ckdStage >= 4) return 'CKD高風險，建議檢測抗體';
      return '高風險族群建議接種3劑';
    }
  },

  // ── COVID-19 疫苗 ──
  {
    id: 'covid19',
    name: 'COVID-19 疫苗',
    isEligible: (ctx) => ctx.age >= 6,
    isVaccinated: (ctx) => {
      const record = ctx.vaccinationHistory.get('covid19');
      if (!record) return false;
      return isVaccinatedWithinMonths(record.dates, 12);
    },
    getLatestDate: (ctx) => ctx.vaccinationHistory.get('covid19')?.dates?.[0] || null,
    getFundingStatus: () => '公費',
    getNote: () => '建議每年追加接種',
  },

  // ── HPV 人類乳突病毒疫苗 ──
  {
    id: 'hpv',
    name: 'HPV 人類乳突病毒疫苗',
    isEligible: (ctx) => ctx.age >= 9 && ctx.age <= 45,
    isVaccinated: (ctx) => ctx.vaccinationHistory.has('hpv'),
    getLatestDate: (ctx) => ctx.vaccinationHistory.get('hpv')?.dates?.[0] || null,
    getFundingStatus: (ctx) => {
      if (ctx.gender === 'F' && ctx.age >= 12 && ctx.age <= 14) return '公費';
      return '自費';
    },
    getNote: (ctx) => {
      if (ctx.gender === 'F' && ctx.age >= 12 && ctx.age <= 14) return '國中女生公費接種';
      return '9-45歲建議接種2-3劑';
    }
  }
];

// ============================================================
// 8. 主要評估函數
// ============================================================

/**
 * 評估患者的疫苗適用性
 *
 * @param {Object} params
 * @param {Object} params.userInfo - 患者資料 { age, gender }
 * @param {Array} params.groupedMedications - 分組後的用藥資料
 * @param {number|null} params.ckdStage - CKD 分期
 * @param {Object|null} params.hbcvData - BC 肝資料
 * @returns {Array<{id, name, isVaccinated, latestDate, fundingStatus, note}>}
 */
export const evaluateVaccineEligibility = ({
  userInfo,
  groupedMedications = [],
  ckdStage = null,
  hbcvData = null
}) => {
  if (!userInfo || userInfo.age === null || userInfo.age === undefined) {
    return [];
  }

  // 建立評估上下文
  const vaccinationHistory = extractVaccinationHistory(groupedMedications);
  const chronicConditions = detectChronicConditions(groupedMedications);
  const ipdResult = detectIPDHighRisk(groupedMedications);

  const context = {
    age: userInfo.age,
    gender: userInfo.gender || '',
    vaccinationHistory,
    chronicConditions,
    hasChronicCondition: chronicConditions.size > 0,
    isIPDHighRisk: ipdResult.isHighRisk,
    ipdConditions: ipdResult.conditions,
    ckdStage,
    hbcvData,
  };

  const results = [];

  for (const rule of VACCINE_RULES) {
    const eligible = rule.isEligible(context);
    if (!eligible) continue;

    // 肺炎鏈球菌疫苗使用獨立分析邏輯
    if (rule.id === 'pneumococcal') {
      const pneumoResult = analyzePneumococcal(context);
      results.push({
        id: rule.id,
        ...pneumoResult,
      });
      continue;
    }

    results.push({
      id: rule.id,
      name: rule.name,
      isVaccinated: rule.isVaccinated(context),
      latestDate: rule.getLatestDate(context),
      fundingStatus: rule.getFundingStatus(context),
      note: rule.getNote(context),
    });
  }

  return results;
};
