/**
 * 疫苗適用性判定工具
 * 基於台灣 ACIP（預防接種諮詢委員會）建議及公費疫苗接種政策
 *
 * 此模組包含：
 * - 疫苗比對邏輯（透過 ATC 碼和藥名關鍵字辨識已接種疫苗）
 * - 慢性病偵測（透過 ICD 碼辨識高風險族群）
 * - 各疫苗適用性規則與公費/自費判定
 */

// ============================================================
// 慢性病偵測 - 用於判定高風險族群疫苗資格
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
// 疫苗比對邏輯 - 從用藥紀錄中辨識已接種疫苗
// ============================================================

/**
 * 疫苗比對器定義
 * 每個比對器包含 ATC 碼前綴和藥名關鍵字
 */
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
      return name.includes('PCV13') ||
             (name.includes('PREVNAR') && name.includes('13')) ||
             (name.includes('PREVENAR') && name.includes('13'));
    }
  },
  {
    id: 'ppv23',
    match: (med) => {
      if (!med.atc_code) return false;
      // ATC7: J07AL01 = pneumococcal polysaccharide
      if (med.atc_code === 'J07AL01' || med.atc_code.startsWith('J07AL01')) return true;
      if (!med.atc_code.startsWith('J07AL')) return false;
      const name = (med.name || '').toUpperCase();
      return name.includes('PNEUMOVAX') || name.includes('PPV23') ||
             name.includes('PNEUMO 23') || name.includes('PPSV23');
    }
  },
  {
    // 通用肺炎鏈球菌疫苗（無法區分 PCV/PPV 時）
    id: 'pneumococcal_unknown',
    match: (med) => {
      if (!med.atc_code || !med.atc_code.startsWith('J07AL')) return false;
      // 如果之前的 matchers 都沒匹配到，歸入此類
      const name = (med.name || '').toUpperCase();
      return !name.includes('APEXXNAR') && !name.includes('PCV20') &&
             !name.includes('PCV13') && !name.includes('PREVNAR') &&
             !name.includes('PREVENAR') && !name.includes('PNEUMOVAX') &&
             !name.includes('PPV23') && !name.includes('PNEUMO 23');
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

/**
 * 從用藥紀錄中擷取疫苗接種歷史
 * @param {Array} groupedMedications - 分組後的用藥資料
 * @returns {Map<string, {dates: string[], medications: string[]}>} 疫苗接種歷史
 */
export const extractVaccinationHistory = (groupedMedications = []) => {
  const history = new Map();

  for (const group of groupedMedications) {
    const medications = group.medications || [];

    for (const med of medications) {
      // 只處理 J07 開頭的疫苗藥物
      if (!med.atc_code || !med.atc_code.startsWith('J07')) {
        // 也嘗試用藥名匹配
        let matched = false;
        for (const matcher of VACCINE_MATCHERS) {
          if (matcher.match(med)) {
            matched = true;
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
        if (!matched) continue;
      } else {
        // 有 J07 ATC 碼的藥物，用 matchers 辨識具體疫苗類型
        let matchFound = false;
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
            matchFound = true;
            break;
          }
        }
        // 如果沒有任何 matcher 匹配，記錄為未知疫苗
        if (!matchFound) {
          const record = history.get('unknown') || { dates: [], medications: [] };
          if (group.date && !record.dates.includes(group.date)) {
            record.dates.push(group.date);
          }
          const medName = med.name || med.ingredient || '';
          if (medName && !record.medications.includes(medName)) {
            record.medications.push(medName);
          }
          history.set('unknown', record);
        }
      }
    }
  }

  // 對每個疫苗的日期進行排序（最新在前）
  for (const [, record] of history) {
    record.dates.sort((a, b) => b.localeCompare(a));
  }

  return history;
};

// ============================================================
// 疫苗規則定義 - 台灣 ACIP 建議與公費標準
// ============================================================

/**
 * 檢查是否在指定月數內接種過
 */
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

/**
 * 疫苗規則清單
 * 每個規則定義：
 * - id: 唯一識別碼
 * - name: 疫苗中文名
 * - isEligible(ctx): 是否建議接種
 * - isVaccinated(ctx): 是否已接種（考量接種頻率）
 * - getFundingStatus(ctx): 公費/自費判定
 * - getNote(ctx): 補充說明
 */
const VACCINE_RULES = [
  {
    id: 'influenza',
    name: '流感疫苗',
    isEligible: (ctx) => ctx.age >= 50 || ctx.hasChronicCondition,
    isVaccinated: (ctx) => {
      const record = ctx.vaccinationHistory.get('influenza');
      if (!record) return false;
      // 流感疫苗每年一劑，檢查 12 個月內是否接種
      return isVaccinatedWithinMonths(record.dates, 12);
    },
    getLatestDate: (ctx) => {
      const record = ctx.vaccinationHistory.get('influenza');
      return record?.dates?.[0] || null;
    },
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
  {
    id: 'pcv20',
    name: 'PCV20 肺炎鏈球菌疫苗',
    isEligible: (ctx) => ctx.age >= 65,
    isVaccinated: (ctx) => {
      // 檢查是否曾接種 PCV20
      return ctx.vaccinationHistory.has('pcv20');
    },
    getLatestDate: (ctx) => {
      const record = ctx.vaccinationHistory.get('pcv20');
      return record?.dates?.[0] || null;
    },
    getFundingStatus: (ctx) => {
      if (ctx.age >= 65) {
        // 若未曾接種 PCV13 或 PCV20，公費
        const hasPCV13 = ctx.vaccinationHistory.has('pcv13');
        const hasPCV20 = ctx.vaccinationHistory.has('pcv20');
        if (!hasPCV13 && !hasPCV20) return '公費';
        return '自費';
      }
      return '自費';
    },
    getNote: (ctx) => {
      const hasPCV13 = ctx.vaccinationHistory.has('pcv13');
      if (ctx.age >= 65 && !hasPCV13) return '65歲以上未曾接種PCV者公費';
      if (hasPCV13) return '已接種PCV13，可考慮補打PCV20';
      return '終身一劑';
    }
  },
  {
    id: 'ppv23',
    name: 'PPV23 肺炎鏈球菌疫苗',
    isEligible: (ctx) => {
      if (ctx.age < 65) return false;
      // PPV23 建議接種情境：已打 PCV13 但尚未打 PPV23，且未打 PCV20
      const hasPCV13 = ctx.vaccinationHistory.has('pcv13');
      const hasPCV20 = ctx.vaccinationHistory.has('pcv20');
      const hasPPV23 = ctx.vaccinationHistory.has('ppv23');
      // 若已打 PCV20，不需要 PPV23
      if (hasPCV20) return false;
      // 若已打 PCV13 且未打 PPV23，建議接種
      if (hasPCV13 && !hasPPV23) return true;
      // 高風險族群即使未打 PCV13 也可考慮
      if (ctx.hasChronicCondition && !hasPPV23) return true;
      return false;
    },
    isVaccinated: (ctx) => {
      return ctx.vaccinationHistory.has('ppv23');
    },
    getLatestDate: (ctx) => {
      const record = ctx.vaccinationHistory.get('ppv23');
      return record?.dates?.[0] || null;
    },
    getFundingStatus: (ctx) => {
      if (ctx.age >= 65) {
        const hasPCV13 = ctx.vaccinationHistory.has('pcv13');
        if (hasPCV13) return '公費';
        if (ctx.hasChronicCondition) return '公費';
      }
      return '自費';
    },
    getNote: (ctx) => {
      const hasPCV13 = ctx.vaccinationHistory.has('pcv13');
      if (hasPCV13) return 'PCV13接種後滿1年可接種';
      return '高風險族群建議接種';
    }
  },
  {
    id: 'shingles',
    name: '帶狀疱疹疫苗',
    isEligible: (ctx) => ctx.age >= 50,
    isVaccinated: (ctx) => {
      return ctx.vaccinationHistory.has('shingles');
    },
    getLatestDate: (ctx) => {
      const record = ctx.vaccinationHistory.get('shingles');
      return record?.dates?.[0] || null;
    },
    getFundingStatus: () => '自費',
    getNote: (ctx) => {
      if (ctx.age >= 50) return 'Shingrix需接種2劑(間隔2-6個月)';
      return '';
    }
  },
  {
    id: 'tdap',
    name: 'Tdap 百日咳/破傷風/白喉',
    isEligible: (ctx) => ctx.age >= 19,
    isVaccinated: (ctx) => {
      const record = ctx.vaccinationHistory.get('tdap');
      if (!record) return false;
      // 每 10 年需追加一劑
      return isVaccinatedWithinMonths(record.dates, 120);
    },
    getLatestDate: (ctx) => {
      const record = ctx.vaccinationHistory.get('tdap');
      return record?.dates?.[0] || null;
    },
    getFundingStatus: () => '自費',
    getNote: () => '每10年追加1劑'
  },
  {
    id: 'hepb',
    name: 'B型肝炎疫苗',
    isEligible: (ctx) => {
      // CKD 患者、慢性肝病、免疫不全等高風險族群
      if (ctx.ckdStage && ctx.ckdStage >= 3) return true;
      if (ctx.chronicConditions.has('liverDisease')) return true;
      if (ctx.chronicConditions.has('immunodeficiency')) return true;
      if (ctx.chronicConditions.has('diabetes')) return true;
      return false;
    },
    isVaccinated: (ctx) => {
      return ctx.vaccinationHistory.has('hepb');
    },
    getLatestDate: (ctx) => {
      const record = ctx.vaccinationHistory.get('hepb');
      return record?.dates?.[0] || null;
    },
    getFundingStatus: () => '自費',
    getNote: (ctx) => {
      if (ctx.ckdStage && ctx.ckdStage >= 4) return 'CKD高風險，建議檢測抗體';
      return '高風險族群建議接種3劑';
    }
  },
  {
    id: 'covid19',
    name: 'COVID-19 疫苗',
    isEligible: (ctx) => ctx.age >= 6,
    isVaccinated: (ctx) => {
      const record = ctx.vaccinationHistory.get('covid19');
      if (!record) return false;
      // 每年追加接種
      return isVaccinatedWithinMonths(record.dates, 12);
    },
    getLatestDate: (ctx) => {
      const record = ctx.vaccinationHistory.get('covid19');
      return record?.dates?.[0] || null;
    },
    getFundingStatus: () => '公費',
    getNote: () => '建議每年追加接種'
  },
  {
    id: 'hpv',
    name: 'HPV 人類乳突病毒疫苗',
    isEligible: (ctx) => ctx.age >= 9 && ctx.age <= 45,
    isVaccinated: (ctx) => {
      return ctx.vaccinationHistory.has('hpv');
    },
    getLatestDate: (ctx) => {
      const record = ctx.vaccinationHistory.get('hpv');
      return record?.dates?.[0] || null;
    },
    getFundingStatus: (ctx) => {
      // 國中女生（約 12-14 歲）公費
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
// 主要評估函數
// ============================================================

/**
 * 評估患者的疫苗適用性
 *
 * @param {Object} params
 * @param {Object} params.userInfo - 患者資料 { age, gender }
 * @param {Array} params.groupedMedications - 分組後的用藥資料
 * @param {number|null} params.ckdStage - CKD 分期
 * @param {Object|null} params.hbcvData - BC 肝資料
 * @returns {Array<{id, name, isEligible, isVaccinated, latestDate, fundingStatus, note}>}
 */
export const evaluateVaccineEligibility = ({
  userInfo,
  groupedMedications = [],
  ckdStage = null,
  hbcvData = null
}) => {
  // 如果沒有患者資料，無法判定
  if (!userInfo || userInfo.age === null || userInfo.age === undefined) {
    return [];
  }

  // 建立評估上下文
  const vaccinationHistory = extractVaccinationHistory(groupedMedications);
  const chronicConditions = detectChronicConditions(groupedMedications);

  const context = {
    age: userInfo.age,
    gender: userInfo.gender || '',
    vaccinationHistory,
    chronicConditions,
    hasChronicCondition: chronicConditions.size > 0,
    ckdStage,
    hbcvData,
  };

  // 評估每個疫苗規則
  const results = [];

  for (const rule of VACCINE_RULES) {
    const eligible = rule.isEligible(context);
    if (!eligible) continue;

    const vaccinated = rule.isVaccinated(context);
    const latestDate = rule.getLatestDate(context);
    const fundingStatus = rule.getFundingStatus(context);
    const note = rule.getNote(context);

    results.push({
      id: rule.id,
      name: rule.name,
      isVaccinated: vaccinated,
      latestDate,
      fundingStatus,
      note,
    });
  }

  return results;
};
