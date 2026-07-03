// @ts-check
// Processor 輸出型別定義（JSDoc typedef，供編輯器與 tsc --noEmit 使用）
// 各 processor 主方法以 @returns {import('../types/processors.js').Xxx} 引用。

/**
 * @typedef {Object} MedicationItem
 * @property {string} name
 * @property {string} ingredient
 * @property {string} dosage        總量
 * @property {string} perDosage     每次劑量，或 'SPECIAL'
 * @property {string} frequency
 * @property {string} days
 * @property {string} atc_code
 * @property {string} atc_name
 * @property {number} drug_left
 * @property {string} drugcode
 */
/**
 * @typedef {Object} MedicationGroup
 * @property {string} date
 * @property {string} hosp
 * @property {string} visitType
 * @property {string} icd_code
 * @property {string} icd_name
 * @property {MedicationItem[]} medications
 */

/**
 * @typedef {Object} LabItem
 * @property {string} itemName
 * @property {string} value                 正規化後，可能為 "min-max" 區間字串
 * @property {string} unit
 * @property {boolean} hasMultipleValues
 * @property {{min:number,max:number,timePoints:any[]}|null} valueRange
 * @property {string} type
 * @property {string} orderName
 * @property {string} orderCode
 * @property {object|null} consultValue
 * @property {string|number|null} referenceMin
 * @property {string|number|null} referenceMax
 * @property {string} formattedReference
 * @property {boolean} isAbnormal
 * @property {'normal'|'high'|'low'} valueStatus
 * @property {string} abbrName
 * @property {string} assayMethod
 */
/**
 * @typedef {Object} LabGroup
 * @property {string} date
 * @property {string} hosp
 * @property {string} icd_code
 * @property {string} icd_name
 * @property {LabItem[]} labs
 */

/**
 * @typedef {Object} AllergyItem
 * @property {string} date
 * @property {string} drugName
 * @property {string} symptoms
 * @property {string} severity
 * @property {string} hospital
 */

/**
 * @typedef {Object} SurgeryItem
 * @property {string} date
 * @property {string} hospital
 * @property {string} diagnosis
 * @property {string} orderCode
 */

/**
 * @typedef {Object} DischargeItem
 * @property {string} in_date
 * @property {string} out_date
 * @property {string} date
 * @property {string} hospital
 * @property {string} hosp
 * @property {string} icd_code
 * @property {string} icd_cname
 * @property {string} [mds_file]
 * @property {string} [mds_pdf_file]
 */

/**
 * @typedef {Object} ImagingItem
 * @property {string} date
 * @property {string} hosp
 * @property {string} orderName
 * @property {string} orderCode
 * @property {string} [inspectResult]
 * @property {boolean} [hasReport]
 */
/**
 * @typedef {Object} ImagingResult
 * @property {ImagingItem[]} withReport
 * @property {ImagingItem[]} withoutReport
 */

/**
 * @typedef {Object} MedDaysItem
 * @property {string} drugName
 * @property {number} remainingDays
 * @property {string} expiryDate
 */

/**
 * @typedef {Object} PatientSummaryItem
 * @property {string} id
 * @property {string} text
 * @property {string} [iconImage]
 * @property {string} originalText
 */

/**
 * @typedef {Object} ChineseMedGroup
 * @property {string} date
 * @property {string} hosp
 * @property {string} [visitType]
 * @property {string} [icd_code]
 * @property {string} [icd_name]
 * @property {object[]} medications
 */

// 以下三型別為 API 原樣透傳（passthrough），結構依健保回傳而定
/** @typedef {object|null} CancerScreeningResult */
/** @typedef {object|null} AdultHealthCheckResult */
/** @typedef {object|null} HbcvResult */

export {};
