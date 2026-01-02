/**
 * 醫療報告去個資化 Regex 模式定義
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
            // === 西園醫院格式 ===
            {
                name: 'patient_name_xiyuan',
                pattern: /(病患姓名\s*[：:]\s*)[\u4e00-\u9fa5]{2,4}/g,
                replacement: '$1***'
            },
            // === 臺北榮總格式 ===
            {
                name: 'patient_info_vgh',
                pattern: /(病患資訊[：:].+?)([\u4e00-\u9fa5]{2,4})(\s+\d+[-\d]*\s)/g,
                replacement: '$1***$3'
            },
            {
                name: 'report_header_line',
                pattern: /(^|[\n\r])([\u4e00-\u9fa5]{2,4})\s+([A-Z]+)\s+(\d{8})\s+([\u4e00-\u9fa5]{2,4})/gm,
                replacement: '$1*** $3 $4 ***'
            },
            {
                name: 'medical_record_number',
                pattern: /(病歷號碼\s*[：:]\s*)\d+/g,
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
            // === 西園醫院格式 ===
            {
                name: 'attending_doctor_xiyuan',
                pattern: /(主治醫師\s*[：:]\s*)[\u4e00-\u9fa5]{2,4}/g,
                replacement: '$1***'
            },
            {
                name: 'specialist_doctor_xiyuan',
                pattern: /(專科醫師\s*[：:]\s*)[\u4e00-\u9fa5]{2,4}醫師/g,
                replacement: '$1***醫師'
            },
            // === 臺北榮總格式 ===
            {
                name: 'ordering_doctor_vgh',
                pattern: /(開醫囑者[：:]\s*DOC[A-Z0-9]+\s+)([\u4e00-\u9fa5]{2,4})/g,
                replacement: '$1***'
            },
            {
                name: 'reporter_vgh',
                pattern: /(報告人\s*[：:]\s*DOC[A-Z0-9]+\s+)([\u4e00-\u9fa5]{2,4})/g,
                replacement: '$1***'
            },
            {
                name: 'report_doctor_vgh',
                pattern: /(報告醫師[：:]\s*)([\u4e00-\u9fa5]{2,4})(\/[A-Z0-9]+\/)/g,
                replacement: '$1***$3'
            },
            {
                name: 'operating_doctor_vgh',
                pattern: /(操作醫師[：:]\s*DOC[A-Z0-9]+)([\u4e00-\u9fa5]{2,4})/g,
                replacement: '$1***'
            },
            {
                name: 'reading_doctor_vgh',
                pattern: /(判讀醫師[：:]\s*DOC[A-Z0-9]+)([\u4e00-\u9fa5]{2,4})/g,
                replacement: '$1***'
            },
            {
                name: 'supervising_doctor_vgh',
                pattern: /(監督醫師[：:]\s*DOC[A-Z0-9]+)([\u4e00-\u9fa5]{2,4})/g,
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
            // === 新增模式：放射師和醫師姓名（按優先順序排列）===
            {
                name: 'radiographer',
                pattern: /(放\s*射\s*師[：:]\s*)([\u4e00-\u9fa5]{2,4})/g,
                replacement: '$1***'
            },
            {
                name: 'doctor_md_title',
                pattern: /([A-Z][a-z]+[\-]?[A-Z]?[a-z]*\s+[A-Z][a-z]+,\s*M\.D\.)/g,
                replacement: '***'
            },
            {
                name: 'doctor_chinese_with_title',
                pattern: /(^|[^醫判讀主治])([\u4e00-\u9fa5]{2,4})\s+醫師/gm,
                replacement: '$1*** 醫師'
            },
            // 處理 Radiologist 加姓名的各種格式
            {
                name: 'radiologist_with_chinese_name_and_number',
                pattern: /(Radiologist[：:]\s*)([\u4e00-\u9fa5]{2,4})(\s+No\.\s*\d+)/g,
                replacement: '$1***$3'
            },
            {
                name: 'radiologist_with_chinese_name',
                pattern: /(Radiologist[：:]\s*)([\u4e00-\u9fa5]{2,4})/g,
                replacement: '$1***'
            },
            {
                name: 'radiologist_with_en_name_and_number',
                pattern: /(Radiologist\s+)([A-Z][a-z]*[\-][A-Z][a-z]*\s+[A-Z][a-z]+)([\.,]\s*No\.\s*\d+)/gi,
                replacement: '$1***$3'
            },
            {
                name: 'radiologist_with_en_fullname',
                pattern: /(Radiologist\s+)([A-Z][a-z]*[\-]?[A-Z]?[a-z]*\s+[A-Z][a-z]+)/gi,
                replacement: '$1***'
            },
            // 處理已經部分遮罩的情況（第二次處理）
            {
                name: 'radiologist_partial_mask_with_name',
                pattern: /(Radiologist[：:]\s*\*\*\*)([\-][A-Z]\s+[A-Z][a-z]+)/g,
                replacement: '$1'
            },
            {
                name: 'radiologist_partial_mask_with_initials',
                pattern: /(Radiologist[：:]\s*\*\*\*\.\s*)([A-Z]{1,2}\s+[A-Z][a-z]+)/g,
                replacement: '$1***'
            },
            // === Radiologist 後直接接數字（無 No. 格式）===
            {
                name: 'radiologist_with_direct_number',
                pattern: /(Radiologist[：:]?\s*\*\*\*)\s+(\d{4})/g,
                replacement: '$1  ***'
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
            },
            // === 新增模式：證照號碼（先處理更具體的格式）===
            {
                name: 'specialty_license_radiology',
                pattern: /(放診專醫字第\s*)(\d+)(\s*號)/g,
                replacement: '$1***$3'
            },
            {
                name: 'specialty_license_radiology_short',
                pattern: /(放診專字第\s*)(\d+)(\s*號)/g,
                replacement: '$1***$3'
            },
            {
                name: 'specialty_license_pathology',
                pattern: /(病解專醫字[：:]\s*第\s*)(\d+)(\s*號)/g,
                replacement: '$1***$3'
            },
            {
                name: 'specialty_license_pathology_no_colon',
                pattern: /(病解專醫字第)(\d+)(號)/g,
                replacement: '$1***$3'
            },
            {
                name: 'specialty_license_general',
                pattern: /([\u4e00-\u9fa5]+專科\s*第\s*)([A-Z0-9]+)(\s*號)/g,
                replacement: '$1***$3'
            },
            {
                name: 'doctor_license_en_format_1',
                pattern: /(No\.)\s*(\d{4})/g,
                replacement: '$1 ***'
            },
            {
                name: 'doctor_license_en_format_2',
                pattern: /(No:)\s*(\d{4})/g,
                replacement: '$1 ***'
            },
            {
                name: 'doctor_license_en_format_3',
                pattern: /(No\.)(\d{4})/g,
                replacement: '$1***'
            }
        ];

        // 整合所有模式（順序很重要！）
        this.allPatterns = [
            ...this.patientPatterns,
            ...this.systemIdPatterns,  // 先處理證照號碼
            ...this.medicalStaffPatterns  // 最後處理人名
        ];
    }

    /**
     * 取得所有模式
     */
    getAllPatterns() {
        return this.allPatterns;
    }

    /**
     * 取得特定類別的模式
     */
    getPatternsByCategory(category) {
        switch (category) {
            case 'patient':
                return this.patientPatterns;
            case 'staff':
                return this.medicalStaffPatterns;
            case 'system':
                return this.systemIdPatterns;
            default:
                return this.allPatterns;
        }
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

