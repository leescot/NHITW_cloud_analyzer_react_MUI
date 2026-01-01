/**
 * 醫療報告去個資化 (PII De-identification) 工具
 */

class PiiPatterns {
    constructor() {
        // 病患基本資訊模式
        this.patientPatterns = [
            {
                name: 'patient_name',
                pattern: /(姓名[：:]\s*)[\u4e00-\u9fa5]{2,4}/g,
                replacement: '$1***'
            },
            {
                name: 'medical_record_number',
                pattern: /(病歷號碼[：:]\s*)\d+/g,
                replacement: '$1***'
            },
            {
                name: 'bed_number',
                pattern: /(病\s*床\s*號[：:]\s*)[A-Z0-9\-]+/g,
                replacement: '$1***'
            }
        ];

        // 醫療人員模式
        this.medicalStaffPatterns = [
            {
                name: 'ordering_doctor',
                pattern: /(開單醫師[：:]\s*)[\u4e00-\u9fa5]{2,4}/g,
                replacement: '$1***'
            },
            {
                name: 'reading_doctor_full',
                pattern: /(判讀主治醫師[：:]\s*)[\u4e00-\u9fa5]{2,4}[\s　]+([\u4e00-\u9fa5]*醫字\s*第\s*\d+\s*號)?/g,
                replacement: '$1***'
            },
            {
                name: 'surgeon',
                pattern: /(手術醫師[：:]\s*)[\u4e00-\u9fa5]{2,4}/g,
                replacement: '$1***'
            },
            {
                name: 'radiology_assistant',
                pattern: /(放射師助手[：:]\s*)([\u4e00-\u9fa5]{2,4}[／\/]?)+/g,
                replacement: '$1***'
            },
            {
                name: 'nurse',
                pattern: /(護理師[：:]\s*)([\u4e00-\u9fa5]{2,4}[／\/]?)+/g,
                replacement: '$1***'
            },
            {
                name: 'radiologist',
                // 修正: 僅允許水平空白，避免跨行匹配到其他標籤
                pattern: /(Radiologist[：:]?\s*)[A-Za-z\u4e00-\u9fa5\. \t　]+/gi,
                replacement: '$1***'
            }
        ];

        // 系統編號模式
        this.systemIdPatterns = [
            {
                name: 'order_number',
                pattern: /(醫囑單號[：:]\s*)[A-Z0-9\-]+/g,
                replacement: '$1***'
            },
            {
                name: 'image_number',
                pattern: /(影\s*像\s*號[：:]\s*)[A-Z0-9]+/g,
                replacement: '$1***'
            },
            {
                name: 'endoscope_number',
                pattern: /(內視鏡編號[：:]\s*)[A-Z0-9\-]+/g,
                replacement: '$1***'
            }
        ];

        // 整合所有模式
        this.allPatterns = [
            ...this.patientPatterns,
            ...this.medicalStaffPatterns,
            ...this.systemIdPatterns
        ];
    }

    /**
     * 取得所有模式
     */
    getAllPatterns() {
        return this.allPatterns;
    }
}

const piiPatterns = new PiiPatterns();

/**
 * 去個資化處理函數
 * @param {string} text - 原始文本
 * @returns {string} 去個資化後的文本
 */
export const deidentify = (text) => {
    if (!text) return text;

    let result = text;
    const patterns = piiPatterns.getAllPatterns();

    patterns.forEach(item => {
        result = result.replace(item.pattern, item.replacement);
    });

    return result;
};
