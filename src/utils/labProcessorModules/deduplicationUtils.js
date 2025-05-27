// 資料去重處理相關函式
import { normalizeValue } from './valueUtils.js';
import { isGFRItem } from './abbreviationUtils.js';

// 新的去重邏輯，處理特殊情況
const deduplicateLabData = (labArray) => {
  // 預處理：針對特定檢驗碼的數值處理
  const preprocessedLabArray = labArray.map(lab => {
    // 複製lab對象，避免直接修改原始數據
    const processedLab = { ...lab };

    // 特殊處理 09005C：只保留 assay_value 中的數字部分
    if (processedLab.order_code === "09005C" && processedLab.assay_value) {
      // 使用正則表達式提取數字
      const numericMatch = processedLab.assay_value.match(/\d+(\.\d+)?/);
      if (numericMatch) {
        processedLab.assay_value = numericMatch[0];
      }
    }

    return processedLab;
  });

  // 特殊處理 09006C 的項目，保留 assay_item_name 包含 HbA1c 的項目
  const labs09006C = preprocessedLabArray.filter(lab => lab.order_code === "09006C");
  let filteredLabsWithout09006C = preprocessedLabArray.filter(lab => lab.order_code !== "09006C");

  // 如果有多個 09006C 的項目
  if (labs09006C.length > 1) {
    // 找出包含 HbA1c 的項目
    const hba1cLabs = labs09006C.filter(lab =>
      lab.assay_item_name && lab.assay_item_name.includes("HbA1c")
    );

    // 如果找到了包含 HbA1c 的項目，只保留這些項目
    if (hba1cLabs.length > 0) {
      filteredLabsWithout09006C = [...filteredLabsWithout09006C, ...hba1cLabs];
    } else {
      // 如果沒有找到包含 HbA1c 的項目，保留所有 09006C 項目
      filteredLabsWithout09006C = [...filteredLabsWithout09006C, ...labs09006C];
    }
  } else {
    // 如果只有一個 09006C 項目，直接保留
    filteredLabsWithout09006C = [...filteredLabsWithout09006C, ...labs09006C];
  }

  // 先過濾掉不需要的檢驗項目
  const filteredLabs = filteredLabsWithout09006C.filter(lab => {
    // 跳過 order_code 09040C 或 12111C 且 assay_item_name 為 "Urine creatinine" 的項目
    if ((lab.order_code === "09040C" || lab.order_code === "12111C") &&
        lab.assay_item_name === "Urine creatinine") {
      return false;
    }
    return true;
  });

  // 處理 12111C 的項目 type
  filteredLabs.forEach(lab => {
    if (lab.order_code === "12111C") {
      lab.assay_tp_cname = "生化學檢查";
    }
  });

  // 特殊處理門諾醫院的重複資料
  let dedupedByHospital = [...filteredLabs];

  // 如果存在門諾醫院的數據，進行特殊處理
  const mennonoLabs = filteredLabs.filter(lab => lab.hosp && lab.hosp.includes("門諾醫院"));

  if (mennonoLabs.length > 0) {
    // 收集所有來自門諾醫院 09040C 和 12111C 的檢驗數據
    const mennonoLabsMap = {};

    mennonoLabs.forEach(lab => {
      // 處理 09040C 和 12111C 代碼
      if (lab.order_code === "09040C" || lab.order_code === "12111C") {
        const date = lab.real_inspect_date?.replace(/\//g, '-') || lab.recipe_date?.replace(/\//g, '-') || '';
        const itemName = lab.assay_item_name || '';
        const value = normalizeValue(lab.assay_value || '');

        // 創建一個唯一標識符
        const key = `${date}_${itemName}_${value}`;
        // 紀錄對應的檢驗代碼，用於調試
        mennonoLabsMap[key] = lab.order_code;
      }
    });

    // 過濾掉與 09040C 或 12111C 重複的 09016C 項目
    dedupedByHospital = filteredLabs.filter(lab => {
      // 如果不是門諾醫院的資料或不是 09016C，保留
      if (!lab.hosp || !lab.hosp.includes("門諾醫院") || lab.order_code !== "09016C") {
        return true;
      }

      // 檢查這個 09016C 項目是否與某個 09040C 或 12111C 項目重複
      const date = lab.real_inspect_date?.replace(/\//g, '-') || lab.recipe_date?.replace(/\//g, '-') || '';
      const itemName = lab.assay_item_name || '';
      const value = normalizeValue(lab.assay_value || '');

      const key = `${date}_${itemName}_${value}`;

      // 如果在 09040C 或 12111C 中找到相同的項目，則刪除這個 09016C 項目
      if (mennonoLabsMap[key]) {
        // 記錄一下替換情況，便於調試
        // console.log(`門諾醫院資料: 刪除 09016C 項目，保留 ${mennonoLabsMap[key]} 項目，項目名稱: ${itemName}, 數值: ${value}`);
        return false;
      }

      return true;
    });
  }

  // 創建兩種分組依據
  const groupsByOrderName = {};
  const groupsByItemName = {};

  // 將資料按兩種方式分組
  dedupedByHospital.forEach(lab => {
    const date = lab.real_inspect_date?.replace(/\//g, '-') || lab.recipe_date?.replace(/\//g, '-') || '';
    const hosp = lab.hosp?.split(';')[0] || '';
    const orderCode = lab.order_code || '';
    const orderName = lab.order_name || '';
    const itemName = lab.assay_item_name || '';
    const normalizedValue = normalizeValue(lab.assay_value || '');

    // 跳過缺少關鍵數據的項目
    if (!date) return;

    // 按 orderName 分組的鍵
    const orderNameKey = `${date}_${hosp}_${orderCode}_${orderName}_${normalizedValue}`;
    if (!groupsByOrderName[orderNameKey]) {
      groupsByOrderName[orderNameKey] = [];
    }
    groupsByOrderName[orderNameKey].push(lab);

    // 按 itemName 分組的鍵
    const itemNameKey = `${date}_${hosp}_${orderCode}_${itemName}_${normalizedValue}`;
    if (!groupsByItemName[itemNameKey]) {
      groupsByItemName[itemNameKey] = [];
    }
    groupsByItemName[itemNameKey].push(lab);
  });

  // 創建一個 Set 來追蹤已處理過的 lab
  const processedLabs = new Set();
  const dedupedLabs = [];

  // 首先，處理按 orderName 分組的項目
  Object.values(groupsByOrderName).forEach(group => {
    if (group.length > 0) {
      const selectedLab = group[0];
      const labId = selectedLab.id || JSON.stringify(selectedLab); // 使用 ID 或序列化物件作為唯一標識
      if (!processedLabs.has(labId)) {
        dedupedLabs.push(selectedLab);
        processedLabs.add(labId);
      }
    }
  });

  // 然後，處理按 itemName 分組的項目
  Object.values(groupsByItemName).forEach(group => {
    if (group.length > 0) {
      const selectedLab = group[0];
      const labId = selectedLab.id || JSON.stringify(selectedLab);
      if (!processedLabs.has(labId)) {
        dedupedLabs.push(selectedLab);
        processedLabs.add(labId);
      }
    }
  });

  // 修改後的處理步驟：按照日期+醫院+檢驗項目名來分組，保留多個數值
  const finalDedupedLabs = [];
  const seenItems = new Map();

  dedupedLabs.forEach(lab => {
    const date = lab.real_inspect_date?.replace(/\//g, '-') || lab.recipe_date?.replace(/\//g, '-') || '';
    const hosp = lab.hosp?.split(';')[0] || '';
    const itemName = lab.assay_item_name || '';
    const orderCode = lab.order_code || '';
    const value = normalizeValue(lab.assay_value || '');

    // 擷取時間點信息
    const timeInfo = lab.real_inspect_date?.split(' ')[1] ||
                   (lab.case_time ? new Date(lab.case_time).toTimeString().split(' ')[0] : '');

    // 創建一個簡化的鍵，只關注日期、醫院、檢驗碼和項目名稱（不含數值）
    const simpleKey = `${date}_${hosp}_${orderCode}_${itemName}`;

    // 如果這個簡化鍵還沒見過，添加這個項目
    if (!seenItems.has(simpleKey)) {
      // 初始化多值數據結構
      lab._multiValueData = {
        values: [value],
        timePoints: [timeInfo]
      };
      finalDedupedLabs.push(lab);
      seenItems.set(simpleKey, lab);
    } else {
      // 如果已經有同樣的檢驗項目，將新的數值添加到現有項目中
      const existingLab = seenItems.get(simpleKey);
      if (!existingLab._multiValueData) {
        existingLab._multiValueData = {
          values: [normalizeValue(existingLab.assay_value || '')],
          timePoints: [existingLab.real_inspect_date?.split(' ')[1] ||
                      (existingLab.case_time ? new Date(existingLab.case_time).toTimeString().split(' ')[0] : '')]
        };
      }
      existingLab._multiValueData.values.push(value);
      existingLab._multiValueData.timePoints.push(timeInfo);
    }
  });

  return finalDedupedLabs;
};

export {
  deduplicateLabData
};