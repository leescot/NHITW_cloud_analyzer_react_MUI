// 表格數據準備相關函式
import { isMultiItemOrderCode } from './abbreviationUtils.js';

// 修改表格數據準備函式，添加類型過濾
const prepareLabTableData = (groupedLabs, selectedType = null) => {
  if (!groupedLabs || !Array.isArray(groupedLabs) || groupedLabs.length === 0) {
    return { dates: [], items: [] };
  }

  // 先過濾日期和實驗室項目
  const filteredGroups = selectedType
    ? groupedLabs.map(group => ({
        ...group,
        labs: group.labs.filter(lab => !selectedType || lab.type === selectedType)
      })).filter(group => group.labs.length > 0)
    : groupedLabs;

  // 1. 收集所有日期，用於表格的列
  const dates = filteredGroups.map(group => ({
    date: group.date,
    hosp: group.hosp
  }));

  // 2. 識別和分組所有實驗室項目
  const itemMap = new Map();

  // 添加自動檢測多項目的功能: 預先分析每個日期內的 order_code 是否有多個不同 itemName
  const autoDetectedMultiItems = new Set();

  // 先掃描所有數據，找出每個日期中有多個項目的 order code
  filteredGroups.forEach(group => {
    // 對每個日期，記錄每個 order_code 包含的不同 itemName
    const orderItemsMap = new Map();

    group.labs.forEach(lab => {
      const orderCode = lab.orderCode || '';
      const itemName = lab.itemName || '';

      if (!orderCode || !itemName) return;

      if (!orderItemsMap.has(orderCode)) {
        orderItemsMap.set(orderCode, new Set());
      }

      orderItemsMap.get(orderCode).add(itemName);
    });

    // 如果某個 order_code 在同一日期中有多個不同的 itemName，標記為多項目
    orderItemsMap.forEach((itemNames, orderCode) => {
      if (itemNames.size > 1) {
        autoDetectedMultiItems.add(orderCode);
      }
    });
  });

  // 特殊處理項目的策略映射
  const specialItemHandlers = new Map([
    // 特殊情況 1: 處理 09040C 和 12111C 的特殊情況
    ['special-abbr', (lab, group, specialItems) => {
      if ((lab.orderCode === "09040C" || lab.orderCode === "12111C") && lab.abbrName) {
        const abbrKey = lab.abbrName;

        if (!specialItems.has(abbrKey)) {
          specialItems.set(abbrKey, {
            key: abbrKey,
            orderCode: lab.orderCode,
            orderName: lab.orderName || '',
            itemName: lab.itemName,
            abbrName: lab.abbrName,
            type: lab.type || '',
            isMultiItem: false,
            values: {}
          });
        }

        // 儲存日期的值
        const item = specialItems.get(abbrKey);
        const dateKey = `${group.date}_${group.hosp}`;
        item.values[dateKey] = createValueObject(lab);
        
        return true; // 表示已處理
      }
      return false; // 未處理
    }],
    
    // 特殊情況 2: 處理 09043C 和 09044C 中包含 "/HDL" 的項目
    ['hdl-ratio', (lab, group, itemMap) => {
      const orderCode = lab.orderCode || '';
      const itemKey = lab.itemName || lab.orderName || '';
      
      if ((orderCode === "09043C" || orderCode === "09044C") && itemKey.includes("/HDL")) {
        const specialKey = `${orderCode}_HDLRATIO`;

        if (!itemMap.has(specialKey)) {
          itemMap.set(specialKey, {
            key: specialKey,
            orderCode: orderCode,
            orderName: lab.orderName || '',
            itemName: itemKey,
            // 為 HDL 比值創建特殊顯示名稱
            abbrName: "TC/HDL Ratio",
            type: lab.type || '',
            isMultiItem: false,
            values: {}
          });
        }

        // 儲存日期的值
        const item = itemMap.get(specialKey);
        const dateKey = `${group.date}_${group.hosp}`;
        item.values[dateKey] = createValueObject(lab);
        
        return true; // 表示已處理
      }
      return false; // 未處理
    }]
  ]);

  // 創建值對象的輔助函式
  const createValueObject = (lab) => {
    return {
      value: lab.value,
      unit: lab.unit,
      isAbnormal: lab.isAbnormal,
      valueStatus: lab.valueStatus || "normal",
      referenceRange: lab.consultValue,
      referenceMin: lab.referenceMin,
      referenceMax: lab.referenceMax,
      formattedReference: lab.formattedReference,
      hasMultipleValues: lab.hasMultipleValues || false,
      valueRange: lab.valueRange || null
    };
  };

  // 提前處理特殊項目
  const specialItems = new Map();

  // 先收集特殊處理的項目
  filteredGroups.forEach(group => {
    group.labs.forEach(lab => {
      // 嘗試應用第一個特殊處理程序
      specialItemHandlers.get('special-abbr')(lab, group, specialItems);
    });
  });

  // 將預處理的特殊項目添加到 itemMap
  specialItems.forEach((item, key) => {
    itemMap.set(key, item);
  });

  // 處理其他正常項目
  filteredGroups.forEach(group => {
    group.labs.forEach(lab => {
      // 檢查是否是已處理的特殊項目
      if ((lab.orderCode === "09040C" || lab.orderCode === "12111C") && lab.abbrName && specialItems.has(lab.abbrName)) {
        return;
      }

      const orderCode = lab.orderCode || '';

      // 如果指定了類型過濾器，檢查項目是否匹配
      if (selectedType && lab.type !== selectedType) {
        return; // 跳過不匹配的項目
      }

      const itemKey = lab.itemName || lab.orderName || '';
      
      // 使用策略映射處理特殊情況
      let handled = false;
      
      // 檢查 HDL 特殊比例處理
      if (specialItemHandlers.get('hdl-ratio')(lab, group, itemMap)) {
        return; // 如果已處理則跳過後續步驟
      }

      // 判斷處理邏輯: 使用多項目邏輯還是單一項目邏輯
      const isMultiItem = isMultiItemOrderCode(orderCode) || autoDetectedMultiItems.has(orderCode);
      
      if (isMultiItem) {
        // 複合測試特殊處理 - 使用預定義的多項目碼或自動檢測到的多項目碼
        const key = lab.abbrName || (orderCode + '-' + itemKey);

        if (!itemMap.has(key)) {
          itemMap.set(key, {
            key: key,
            orderCode: orderCode,
            orderName: lab.orderName || '',
            itemName: itemKey,
            type: lab.type || '',
            isMultiItem: true,
            values: {},
            abbrName: lab.abbrName || null
          });
        }

        // 儲存日期的值
        const item = itemMap.get(key);
        const dateKey = `${group.date}_${group.hosp}`;
        item.values[dateKey] = createValueObject(lab);
      } else {
        // 對於單一測試項目，用 orderCode 分組
        if (!itemMap.has(orderCode)) {
          itemMap.set(orderCode, {
            key: orderCode,
            orderCode: orderCode,
            orderName: lab.orderName || '',
            itemName: itemKey,
            type: lab.type || '',
            isMultiItem: false,
            values: {},
            abbrName: lab.abbrName || null,  // 添加縮寫屬性
            // 儲存可能的別名
            aliases: new Set([itemKey])
          });
        } else {
          // 添加可能的別名
          const item = itemMap.get(orderCode);
          item.aliases.add(itemKey);
        }

        // 儲存日期的值
        const item = itemMap.get(orderCode);
        const dateKey = `${group.date}_${group.hosp}`;
        item.values[dateKey] = createValueObject(lab);
      }
    });
  });

  // 將 Map 轉換為陣列並排序
  const items = Array.from(itemMap.values()).sort((a, b) => {
    // 按 orderCode 排序
    return a.orderCode.localeCompare(b.orderCode);
  });

  // 使用縮寫名作為顯示名稱（如果有），否則使用 itemName
  items.forEach(item => {
    item.displayName = item.abbrName || item.itemName;
  });

  return { dates, items };
};

export {
  prepareLabTableData
};