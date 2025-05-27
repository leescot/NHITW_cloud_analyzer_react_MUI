// 資料分組相關函式
import { formatLabData } from './formattingUtils.js';

// 將檢驗資料依照日期分組
const groupLabsByDate = (labs) => {
  return labs.reduce((acc, lab) => {
    if (!lab.recipe_date) {
      return acc;
    }

    const key = lab.recipe_date;

    if (!acc[key]) {
      acc[key] = {
        date: lab.recipe_date,
        hosp: lab.hosp.split(';')[0],
        labs: []
      };
    }

    acc[key].labs.push(formatLabData(lab));
    return acc;
  }, {});
};

// 排序分組後的資料
const sortGroupedData = (grouped) => {
  return Object.values(grouped)
    .sort((a, b) => {
      const dateA = new Date(a.date.replace(/\//g, '-'));
      const dateB = new Date(b.date.replace(/\//g, '-'));
      return dateB - dateA;
    });
};

// 新增函式：收集所有檢驗類型
const getAllLabTypes = (groupedLabs) => {
  if (!groupedLabs || !Array.isArray(groupedLabs)) {
    return [];
  }

  const typeSet = new Set();

  // 遍歷所有檢驗資料收集類型
  groupedLabs.forEach(group => {
    group.labs.forEach(lab => {
      if (lab.type) {
        typeSet.add(lab.type);
      }
    });
  });

  // 轉換為陣列並排序
  return Array.from(typeSet).sort();
};

export {
  groupLabsByDate,
  sortGroupedData,
  getAllLabTypes
};