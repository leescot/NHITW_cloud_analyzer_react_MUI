export const dashboardProcessor = {
  processDashboardData({ medicationData, chineseMedData }) {
    // console.log('Starting to process dashboard data');

    const now = new Date();
    const ninetyDaysAgo = new Date(now.getTime() - (90 * 24 * 60 * 60 * 1000));
    const thirtyDaysAgo = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000));

    try {
      return {
        diagnoses: this.getRecentDiagnoses(medicationData, chineseMedData, ninetyDaysAgo),
        recentMedications: this.getRecentMedications(medicationData, chineseMedData, thirtyDaysAgo),
        labSummary: this.getLabSummary()
      };
    } catch (error) {
      console.error('Error processing dashboard data:', error);
      return {
        diagnoses: [],
        recentMedications: { western: [], chinese: [] },
        labSummary: {}
      };
    }
  },

  calculateVisitCount(medicationData, chineseMedData, startDate) {
    const visits = new Set();

    // 處理西藥資料
    medicationData?.rObject?.forEach(med => {
      const date = new Date(med.func_date);
      if (date >= startDate) {
        visits.add(`${med.func_date}_${med.icd_code}`);
      }
    });

    // 處理中藥資料
    chineseMedData?.rObject?.forEach(med => {
      const date = new Date(med.func_date);
      if (date >= startDate) {
        visits.add(`${med.func_date}_${med.icd_code}`);
      }
    });

    return visits.size;
  },

  getRecentDiagnoses(medicationData, chineseMedData, startDate) {
    const diagnosesMap = new Map();

    // 處理西藥資料
    medicationData?.rObject?.forEach(med => {
      const date = new Date(med.drug_date);
      if (date >= startDate && med.icd_code && med.icd_cname) {
        const key = `${med.drug_date}_${med.icd_code}`;
        if (!diagnosesMap.has(key)) {
          const hospName = med.hosp?.split(';')[0] || '西醫';

          diagnosesMap.set(key, {
            date: med.drug_date,
            icdCode: med.icd_code,
            diagnosis: med.icd_cname,
            type: hospName
          });
        }
      }
    });

    // 處理中藥資料 (使用 func_date)
    chineseMedData?.rObject?.forEach(med => {
      // 將 func_date 轉換為 YYYY/MM/DD 格式
      const date = new Date(med.func_date);
      const formattedDate = date.toLocaleDateString('zh-TW', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      }).replace(/\//g, '/');

      if (date >= startDate && med.icd_code && med.icd_cname) {
        const key = `${formattedDate}_${med.icd_code}`;
        if (!diagnosesMap.has(key)) {
          const hospName = med.hosp?.split(';')[0] || '中醫';

          diagnosesMap.set(key, {
            date: formattedDate,
            icdCode: med.icd_code,
            diagnosis: med.icd_cname,
            type: hospName
          });
        }
      }
    });

    // 轉換成陣列並排序
    return Array.from(diagnosesMap.values())
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .map(item => ({
        ...item,
        // 將日期格式化為 MM/DD
        date: new Date(item.date).toLocaleDateString('zh-TW', {
          month: '2-digit',
          day: '2-digit'
        }),
        // 組合診斷和院所
        formattedDiagnosis: `${item.diagnosis} (${item.type})`
      }));
  },

  getRecentMedications(medicationData, chineseMedData, startDate) {
    // 使用 Map 儲存資料處理邏輯
    const dataProcessors = new Map([
      ['western', {
        extractData: () => {
          const western = new Set();
          medicationData?.rObject?.forEach(med => {
            const date = new Date(med.drug_date);
            if (date >= startDate && med.drug_ename) {
              const formattedDate = date.toLocaleDateString('zh-TW', {
                month: '2-digit',
                day: '2-digit'
              });
              const drugName = med.drug_ing_name
                ? `${med.drug_ename} (${med.drug_ing_name})`
                : med.drug_ename;
              western.add(`${formattedDate} ${drugName}`);
            }
          });
          return Array.from(western).sort().reverse();
        }
      }],
      ['chinese', {
        extractData: () => {
          const chinese = new Set();
          chineseMedData?.rObject?.forEach(med => {
            const date = new Date(med.func_date);
            if (date >= startDate) {
              const formattedDate = date.toLocaleDateString('zh-TW', {
                month: '2-digit',
                day: '2-digit'
              });
              const drugName = med.cdrug_name || med.drug_perscrn_name;
              if (drugName) {
                const isMulti = med.drug_multi_mark === 'Y';
                const formattedName = isMulti
                  ? `${drugName.trim()} (複方)`
                  : drugName.trim();
                chinese.add(`${formattedDate} ${formattedName}`);
              }
            }
          });
          return Array.from(chinese).sort().reverse();
        }
      }]
    ]);

    // 使用 Map 中的處理邏輯擷取結果
    return {
      western: dataProcessors.get('western').extractData(),
      chinese: dataProcessors.get('chinese').extractData()
    };
  },

  getLabSummary() {
    // 使用 Map 定義不同類型的檢驗項目
    const labCategories = new Map([
      ['lipid', []], // 血脂
      ['glucose', []], // 血糖
      ['kidney', []], // 腎功能
      ['liver', []], // 肝功能
      ['protein', []] // 尿蛋白
    ]);

    // 將 Map 轉換為物件並返回
    return Object.fromEntries(labCategories);
  }
};