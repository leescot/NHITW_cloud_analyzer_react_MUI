/**
 * Overview Utility Functions
 *
 * This file contains utility functions used by the Overview components
 */

// 检查日期是否在过去90天内
export const isWithinLast90Days = (dateString) => {
  if (!dateString) {
    return false;
  }

  const today = new Date();
  const medicationDate = new Date(dateString);

  // Check if the date is valid
  if (isNaN(medicationDate.getTime())) {
    return false;
  }

  const diffTime = today - medicationDate;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  return diffDays <= 90;
};

// 获取药物颜色分组
export const getMedicationColorGroup = (medication, settings) => {
  // Validate required settings
  if (!settings || !settings.enableATC5Colors || !settings.atc5Groups || !settings.atc5ColorGroups) {
    return null;
  }

  // Extract the ATC5 code from the medication
  const atc5Code = medication.atc_code;

  // FALLBACK MECHANISM FOR MISSING ATC5 CODES
  if (!atc5Code) {
    // Try to match by medication name to common medication categories
    const medNameLower = medication.name ? medication.name.toLowerCase() : '';

    let matchedGroup = null;

    if (matchedGroup) {
      // Find which color this group belongs to
      let colorName = null;
      let colorCode = null;

      Object.entries(settings.atc5ColorGroups).forEach(([color, groups]) => {
        if (groups && Array.isArray(groups) && groups.includes(matchedGroup)) {
          colorName = color;
          colorCode = mapColorNameToColorCode(color);
        }
      });

      if (colorName) {
        return {
          groupName: matchedGroup,
          colorName,
          color: colorCode,
          drugcode: medication.drugcode || medication.drug_code || '' // Preserve drugcode
        };
      }
    }

    // If no match found by name, use a fallback group
    // Check if there's a default group assigned to medications without ATC5
    const defaultGroups = settings.atc5ColorGroups.orange || [];
    if (defaultGroups.includes('OTHER')) {
      return {
        groupName: 'OTHER',
        colorName: 'orange',
        color: 'warning',
        drugcode: medication.drugcode || medication.drug_code || '' // Preserve drugcode
      };
    }

    return null;
  }

  // Normal processing with ATC5 code
  // Find which category group this belongs to
  let groupName = null;
  Object.entries(settings.atc5Groups).forEach(([name, codes]) => {
    if (codes && Array.isArray(codes)) {
      // Check if any code in this group matches our ATC code
      // If the code is 7 characters, do an exact match
      // Otherwise, check if it's a prefix (matching first 5 characters)
      if (codes.some(code => {
        if (code.length === 7) {
          return atc5Code === code; // Exact match for 7-character codes
        } else {
          return atc5Code.startsWith(code); // Prefix match for shorter codes
        }
      })) {
        groupName = name;
      }
    }
  });

  if (!groupName) {
    return null;
  }

  // Find which color this group belongs to
  let colorName = null;
  let colorCode = null;

  Object.entries(settings.atc5ColorGroups).forEach(([color, groups]) => {
    if (groups && Array.isArray(groups) && groups.includes(groupName)) {
      colorName = color;
      colorCode = mapColorNameToColorCode(color);
    }
  });

  if (!colorName) {
    return null;
  }

  return {
    groupName,
    colorName,
    color: colorCode,
    drugcode: medication.drugcode || medication.drug_code || '' // Preserve drugcode
  };
};

// Helper function to map color names to MUI color codes
const mapColorNameToColorCode = (colorName) => {
  // 使用 Map 替代 switch 語句，提高可讀性和效率
  const colorMap = new Map([
    ['red', 'error'],
    ['orange', 'warning'],
    ['green', 'success'],
    // 預設值
    ['default', 'primary']
  ]);
  
  // 如果顏色名稱存在於 Map 中，則返回對應的顏色代碼
  // 否則返回預設值 'primary'
  return colorMap.get(colorName) || colorMap.get('default');
};

// 安全的日期解析函數，避免時區轉換問題
export const parseDateSafely = (dateString) => {
  if (!dateString) return null;

  let dateStr = dateString;
  // 標準化格式為 YYYY/MM/DD
  if (dateStr.includes('-')) {
    dateStr = dateStr.replace(/-/g, '/');
  }

  const parts = dateStr.split('/');
  if (parts.length >= 3) {
    return {
      year: parseInt(parts[0]),
      month: parseInt(parts[1]),
      day: parseInt(parts[2])
    };
  }
  return null;
};

// 将日期格式化为 YYYY/MM/DD
export const formatDate = (dateString) => {
  if (!dateString) return '';

  // 直接處理字符串格式，保持資料來源的原始格式，避免時區轉換問題
  if (typeof dateString === 'string') {
    // 如果已經是 YYYY/MM/DD 或 YYY/MM/DD 格式，直接返回
    if (dateString.includes('/')) {
      return dateString;
    }
    
    // 將 YYYY-MM-DD 格式轉換為 YYYY/MM/DD，避免 Date 物件轉換
    if (dateString.includes('-')) {
      return dateString.replace(/-/g, '/');
    }
  }

  // 如果無法處理，直接返回原始字符串
  return dateString;
};

// Format date to show just MM/DD
export const formatDateShort = (dateString) => {
  if (!dateString) return '';

  // 直接從字符串提取月日，避免 Date 物件的時區轉換
  let dateStr = dateString;
  
  // 處理不同格式的日期字符串
  if (dateStr.includes('-')) {
    dateStr = dateStr.replace(/-/g, '/');
  }
  
  // 提取月日部分 (YYYY/MM/DD -> MM/DD)
  const parts = dateStr.split('/');
  if (parts.length >= 3) {
    const month = parts[1].padStart(2, '0');
    const day = parts[2].padStart(2, '0');
    return `${month}/${day}`;
  }
  
  // 如果無法處理，返回原始字符串
  return dateString;
};

// Filter lab data for important test types and last 90 days
export const getImportantLabTests = (groupedLabs, orderCodes = ['09002C']) => {
  if (!groupedLabs || !Array.isArray(groupedLabs) || groupedLabs.length === 0) {
    return [];
  }

  // Filter labs from the last 90 days
  const recentLabs = groupedLabs.filter(labGroup =>
    isWithinLast90Days(labGroup.date)
  );

  // Extract and flatten important labs
  const importantLabs = recentLabs.flatMap(labGroup => {
    // Check if labs property exists and is an array
    if (!labGroup.labs || !Array.isArray(labGroup.labs)) {
      return [];
    }

    // Find labs with the specified order codes
    const filteredLabs = labGroup.labs.filter(lab => {
      // Safety check if orderCode exists
      if (!lab.orderCode) {
        return false;
      }

      // Check for exact match or partial match
      const exactMatch = orderCodes.includes(lab.orderCode);
      const partialMatch = orderCodes.some(code => lab.orderCode.includes(code));

      return exactMatch || partialMatch;
    });

    // Add date and hospital info to each lab
    return filteredLabs.map(lab => ({
      ...lab,
      date: labGroup.date,
      hospital: labGroup.hosp
    }));
  });

  // Group by test type (orderCode)
  const groupedByTest = importantLabs.reduce((acc, lab) => {
    const orderCode = lab.orderCode;
    if (!acc[orderCode]) {
      acc[orderCode] = {
        name: lab.orderName || lab.itemName || 'BUN', // Try different name properties
        tests: []
      };
    }
    acc[orderCode].tests.push(lab);
    return acc;
  }, {});

  return Object.values(groupedByTest);
};