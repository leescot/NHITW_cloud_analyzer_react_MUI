// 檢驗項目縮寫對照表和縮寫處理相關函數

// 檢驗項目縮寫對照表 - 簡單對應
const labCodeAbbreviations = {
  "09001C": "Chol",
  "09002C": "BUN",
  "09004C": "TG",
  "09005C": "Glu",
  "09006C": "HbA1c",
  "09011C": "Ca",
  "09012C": "P",
  "09013C": "U.A",
  "09016C": "Cr(Urine)",
  "09020C": "Fe",
  "09021C": "Na",
  "09022C": "K",
  "09023C": "Cl",
  "09025C": "GOT",
  "09026C": "GPT",
  "09027C": "Alk-P",
  "09029C": "Bil(T)",
  "09030C": "Bil(D)",
  "09031C": "r-GT",
  "09032C": "CPK",
  "09033C": "LDH",
  "09035C": "TIBC",
  "09038C": "Alb",
  "09043C": "HDL",
  "09044C": "LDL",
  "09046B": "Mg",
  "09064C": "Lipase",
  "09071C": "CK-MB"
};

// 需要依單位區分的特殊檢驗項目 - 已不使用基於單位的判斷
const specialLabCodeAbbreviations = {};

// 特殊處理邏輯映射表
const specialHandlers = new Map([
  // 特殊處理 HDL/LDL 比值
  ["tc_hdl_ratio", (orderCode, itemName) => {
    return (orderCode === "09043C" || orderCode === "09044C") && itemName.includes("/HDL") ? "TC/HDL Ratio" : null;
  }],
  
  // 特殊處理 09015C (肌酐/GFR)
  ["09015C", (_, itemName) => {
    if (!itemName) return null;
    const gfrKeywords = ["GFR", "腎絲球過濾率", "Ccr"];
    return gfrKeywords.some(keyword => itemName.includes(keyword)) ? "GFR" : "Cr";
  }],
  
  // 特殊處理 09040C（尿液總蛋白相關）
  ["09040C", (_, itemName) => {
    if (!itemName) return null;
    
    // UPCR 相關判斷
    if (itemName === "Urine protein/Creatinine ratio(UPCR)" ||
        itemName.includes("UPCR") ||
        (itemName.includes("protein") && itemName.includes("Creatinine") && itemName.includes("ratio")) ||
        itemName === "TP/CRE" ||
        itemName === "總蛋白/肌酸酐比值") {
      return "UPCR";
    }
    
    // 尿液肌酐相關判斷
    if (itemName === "Urine creatinine" ||
        (itemName.includes("creatinine") && itemName.includes("Urine"))) {
      return "Cr(Urine)";
    }
    
    // 尿液總蛋白相關判斷
    if (itemName === "Micro Total Protein_Urine" ||
        itemName.includes("Total Protein") ||
        (itemName.includes("Micro") && itemName.includes("Protein")) ||
        itemName === "TP-Urine" ||
        itemName === "尿液總蛋白" ||
        (itemName.includes("Protein") && (itemName.includes("Urine") || itemName.includes("尿")))) {
      return "T.Protein(U)";
    }
    
    // 默認值
    return "T.Protein";
  }],
  
  // 特殊處理 12111C（尿液微量白蛋白相關）
  ["12111C", (_, itemName) => {
    if (!itemName) return null;
    
    // UACR 相關判斷
    if (itemName.toLowerCase().includes("u-acr") ||
        itemName.toLowerCase().includes("albumin/creatinine") ||
        itemName.toLowerCase().includes("/cre") ||
        itemName.toLowerCase().includes("acr-u")) {
      return "UACR";
    }
    
    // 尿液白蛋白相關判斷
    if (itemName === "microalbumin" ||
        itemName === "Microalbumin(U)" ||
        itemName === "ALB" ||
        itemName.toLowerCase().includes("micro-albumin(urine)") ||
        (itemName.toLowerCase().includes("albumin") && itemName.toLowerCase().includes("urine"))) {
      return "Albumin(U)";
    }
    
    return null;
  }],
  
  // 特殊處理 09041B（血液氣體分析相關）
  ["09041B", (_, itemName) => {
    if (!itemName) return null;
    
    // 血液氣體分析項目映射
    const gasAnalysisMap = new Map([
      ["ph", "pH"],
      ["pco2", "pCO2"],
      ["po2", "pO2"],
      ["so2", "sO2"],
      ["tco2", "tCO2"],
      ["abe", "BE"],
      ["be", "BE"],
      ["hco3", "HCO3"]
    ]);
    
    // 嘗試從映射中獲取縮寫
    const lowerItemName = itemName.toLowerCase();
    return gasAnalysisMap.get(lowerItemName) || itemName;
  }]
]);

// 獲取縮寫的方法 - 使用 Map 結構重構
const getAbbreviation = (orderCode, unitData = '', itemName = '') => {
  // 檢查是否有 orderCode 和 itemName
  if (!orderCode || !itemName) return '';

  // 1. 首先檢查特殊的 HDL/LDL 比值情況
  const tcHdlResult = specialHandlers.get("tc_hdl_ratio")(orderCode, itemName);
  if (tcHdlResult) return tcHdlResult;
  
  // 2. 然後查找是否存在特殊處理邏輯
  if (specialHandlers.has(orderCode)) {
    const result = specialHandlers.get(orderCode)(orderCode, itemName);
    if (result) return result;
  }
  
  // 3. 最後從簡單對照表查詢
  return labCodeAbbreviations[orderCode] || null;
};

// 檢查是否為 GFR 相關項目
const isGFRItem = (itemName) => {
  if (!itemName) return false;
  const gfrKeywords = ["GFR", "腎絲球過濾率", "Ccr"];
  return gfrKeywords.some(keyword => itemName.includes(keyword));
};

// Helper function to determine if an order code typically contains multiple items
const isMultiItemOrderCode = (orderCode) => {
  // 更新包含多項目測試的代碼列表
  const multiItemCodes = ['08011C', '06012C', '09015C', '09041B']; // 添加 16002C 腹水分析等穿剌液採取液檢查
  return multiItemCodes.includes(orderCode);
};

export {
  labCodeAbbreviations,
  specialLabCodeAbbreviations,
  getAbbreviation,
  isGFRItem,
  isMultiItemOrderCode
};