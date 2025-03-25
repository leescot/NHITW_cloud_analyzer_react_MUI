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

// 獲取縮寫的方法 - 考慮更多條件
const getAbbreviation = (orderCode, unitData = '', itemName = '') => {
  // 檢查是否有 orderCode 和 itemName
  if (!orderCode || !itemName) return '';
  
  // 特殊處理 09043C 和 09044C 中包含 "/HDL" 的項目 - 使用特殊縮寫名稱
  if ((orderCode === "09043C" || orderCode === "09044C") && itemName.includes("/HDL")) {
    return "TC/HDL Ratio";  // 使用比值的特殊縮寫名稱
  }
  
  // 特殊處理 09015C (肌酐/GFR)
  if (orderCode === "09015C" && itemName) {
    // 檢查是否包含 GFR 相關關鍵詞
    const gfrKeywords = ["GFR", "腎絲球過濾率", "Ccr"];
    const isGFR = gfrKeywords.some(keyword => itemName.includes(keyword));
    
    if (isGFR) {
      return "GFR";
    } else {
      return "Cr";
    }
  }
  
  // 特殊處理 09040C（尿液總蛋白相關）
  if (orderCode === "09040C" && itemName) {
    // 處理 Urine protein/Creatinine ratio(UPCR) 項目
    if (itemName === "Urine protein/Creatinine ratio(UPCR)" || 
        itemName.includes("UPCR") || 
        (itemName.includes("protein") && itemName.includes("Creatinine") && itemName.includes("ratio"))) {
      return "UPCR";
    }
    
    // 處理 Urine creatinine 項目
    if (itemName === "Urine creatinine" || 
        (itemName.includes("creatinine") && itemName.includes("Urine"))) {
      return "Cr(Urine)";
    }
    
    // 處理 Micro Total Protein_Urine 項目
    if (itemName === "Micro Total Protein_Urine" || 
        itemName.includes("Total Protein") || 
        itemName.includes("Micro") && itemName.includes("Protein")) {
      return "T.Protein(U)";
    }
    
    // 當 assayitemName = "TP-Urine" 或 "尿液總蛋白" 或 ("Protein" & "Urine") 或 ("Protein" & "尿") 時
    if (itemName === "TP-Urine" || 
        itemName === "尿液總蛋白" || 
        (itemName.includes("Protein") && (itemName.includes("Urine") || itemName.includes("尿")))) {
      return "T.Protein(U)";
    }
    
    // 當 assayitemName = "TP/CRE"或 "總蛋白/肌酸酐比值"或 "UPCR"時
    if (itemName === "TP/CRE" || 
        itemName === "總蛋白/肌酸酐比值" || 
        itemName === "UPCR") {
      return "UPCR";
    }
    
    // 如果沒有匹配的情況，返回一個默認縮寫
    // console.log(`Unknown 09040C item: ${itemName}`); // 記錄未識別的項目，方便日後改進
    return "T.Protein"; // 設置一個更通用的默認縮寫，避免所有項目都被縮寫為 Cr(Urine)
  }
  
  // 特殊處理 12111C（尿液微量白蛋白相關）
  if (orderCode === "12111C" && itemName) {
    // 當 assayitemName = "U-ACR" 或 "Albumin/Creatinine" 或 包含"/CRE"時
    if (itemName.toLowerCase().includes("u-acr") || 
        itemName.toLowerCase().includes("albumin/creatinine") || 
        itemName.toLowerCase().includes("/cre")|| 
        itemName.toLowerCase().includes("acr-u") ) {
      return "UACR";
    }
    
    // 當 assayitemName = "microalbumin" 或 "Microalbumin(U)" 或 "ALB" 或 "Micro-Albumin(urine)"時
    if (itemName === "microalbumin" || 
        itemName === "Microalbumin(U)" || 
        itemName === "ALB" || 
        itemName.toLowerCase().includes("micro-albumin(urine)") ||
        itemName.toLowerCase().includes("albumin") && itemName.toLowerCase().includes("urine")) {
      return "Albumin(U)";  // 修改為 Albumin(U) 而非 Microalbumin(U)
    }
    
    // 如果沒有匹配的情況，返回一個默認縮寫
    // console.log(`Unknown 12111C item: ${itemName}`); // 記錄未識別的項目，方便日後改進
    // return "Alb(U)"; // 設置一個更通用的默認縮寫
  }
  
  // 特殊處理 09041B（血液氣體分析相關）
  if (orderCode === "09041B" && itemName) {
    // 水素湯度指數 (pH)
    if (itemName.toLowerCase() === "ph") {
      return "pH";
    }
    
    // 二氧化碳分壓 (pCO2)
    if (itemName.toLowerCase() === "pco2") {
      return "pCO2";
    }
    
    // 氧分壓 (pO2)
    if (itemName.toLowerCase() === "po2") {
      return "pO2";
    }
    
    // 氧飽和度 (sO2)
    if (itemName.toLowerCase() === "so2") {
      return "sO2";
    }
    
    // 二氧化碳總量 (tCO2)
    if (itemName.toLowerCase() === "tco2") {
      return "tCO2";
    }
    
    // 血液酸鹹比 (BE)
    if (itemName.toLowerCase() === "abe" || itemName.toLowerCase() === "be") {
      return "BE";
    }
    
    // 碳酸氯 (HCO3)
    if (itemName.toLowerCase() === "hco3") {
      return "HCO3";
    }
    
    // 酸鹹直接返回原始名稱
    return itemName;
  }
  
  // 一般情況直接從簡單對照表查詢
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