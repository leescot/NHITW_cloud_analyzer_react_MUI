import React from "react";

// 擷取檢驗結果的顯示顏色
export const getStatusColor = (lab, highlightAbnormal) => {
  if (!lab || !highlightAbnormal) return "inherit";

  // 使用 Map 來映射狀態和顏色 - 提高可讀性和效率
  const statusColorMap = new Map([
    ["high", "#c62828"], // 紅色
    ["low", "#006400"],  // 深綠色 (取代 #1b5e20)
    ["default", "inherit"] // 正常值
  ]);

  return statusColorMap.get(lab.valueStatus) || statusColorMap.get("default");
};

// 格式化參考值範圍
export const formatReferenceRange = (lab, showReference) => {
  if (!showReference) return null;

  // 使用 Map 來處理不同的參考值顯示格式
  const referenceFormatMap = new Map([
    // 已格式化的參考值
    [
      () => lab.formattedReference,
      () => (
        <span style={{ color: "gray", fontSize: "0.8em" }}>
          {" "}({lab.formattedReference})
        </span>
      )
    ],
    // 最小參考值存在
    [
      () => lab.referenceMin !== null,
      () => (
        <span style={{ color: "gray", fontSize: "0.8em" }}>
          {" "}
          ({lab.referenceMin}
          {lab.referenceMax !== null ? `-${lab.referenceMax}` : ""})
        </span>
      )
    ],
    // 默認情況 - 沒有參考值
    [
      () => true,
      () => null
    ]
  ]);

  // 找到第一個匹配的格式並渲染
  for (const [condition, renderer] of referenceFormatMap) {
    if (condition()) {
      return renderer();
    }
  }

  return null;
};

// 格式化檢驗數據用於複製 - 單一項目
export const formatLabItemForCopy = (lab, showUnit, showReference) => {
  // Prefer abbrName over itemName if available
  const displayName = lab.displayName || lab.abbrName || lab.itemName || lab.orderName;
  let labText = `${displayName}: ${lab.value}`;

  // 添加單位
  if (showUnit && lab.unit) {
    labText += ` ${lab.unit}`;
  }

  // 使用 Map 來處理參考值格式的添加
  if (showReference) {
    const referenceHandlers = new Map([
      // 有參考最小值的情況
      [
        () => lab.referenceMin !== null,
        () => ` (${lab.referenceMin}${lab.referenceMax !== null ? `-${lab.referenceMax}` : ''})`
      ],
      // 有諮詢值的情況
      [
        () => lab.consultValue,
        () => ` (${lab.consultValue.min}-${lab.consultValue.max})`
      ],
      // 默認情況 - 無參考值可添加
      [
        () => true,
        () => ''
      ]
    ]);

    // 找到第一個匹配的處理方式
    for (const [condition, formatter] of referenceHandlers) {
      if (condition()) {
        labText += formatter();
        break;
      }
    }
  }

  return labText;
};

// 格式化日期 YYYY-MM-DD 轉 YYYY/MM/DD
export const formatDate = (dateString) => {
  return dateString.replace(/-/g, '/');
};