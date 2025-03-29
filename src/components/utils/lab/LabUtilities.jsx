import React from "react";

// 獲取檢驗結果的顯示顏色
export const getStatusColor = (lab, highlightAbnormal) => {
  if (!lab || !highlightAbnormal) return "inherit";

  if (lab.valueStatus === "high") return "#c62828"; // 紅色
  if (lab.valueStatus === "low") return "#006400";  // 深綠色 (取代 #1b5e20)
  return "inherit"; // 正常值
};

// 格式化參考值範圍
export const formatReferenceRange = (lab, showReference) => {
  if (!showReference) return null;

  if (lab.formattedReference) {
    return (
      <span style={{ color: "gray", fontSize: "0.8em" }}>
        {" "}({lab.formattedReference})
      </span>
    );
  } else if (lab.referenceMin !== null) {
    return (
      <span style={{ color: "gray", fontSize: "0.8em" }}>
        {" "}
        ({lab.referenceMin}
        {lab.referenceMax !== null ? `-${lab.referenceMax}` : ""})
      </span>
    );
  }

  return null;
};

// 格式化檢驗數據用於複製 - 單一項目
export const formatLabItemForCopy = (lab, showUnit, showReference) => {
  // Prefer abbrName over itemName if available
  const displayName = lab.displayName || lab.abbrName || lab.itemName || lab.orderName;
  let labText = `${displayName}: ${lab.value}`;

  if (showUnit && lab.unit) {
    labText += ` ${lab.unit}`;
  }

  if (showReference) {
    if (lab.referenceMin !== null) {
      labText += ` (${lab.referenceMin}${lab.referenceMax !== null ? `-${lab.referenceMax}` : ''})`;
    } else if (lab.consultValue) {
      labText += ` (${lab.consultValue.min}-${lab.consultValue.max})`;
    }
  }

  return labText;
};

// 格式化日期 YYYY-MM-DD 轉 YYYY/MM/DD
export const formatDate = (dateString) => {
  return dateString.replace(/-/g, '/');
};