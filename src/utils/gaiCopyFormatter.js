/**
 * GAI/XML Copy Formatter Utility
 * 
 * This module handles the generation and copying of patient data in XML format
 * for use with GAI (Generative AI) systems. It supports two modes:
 * 1. XML format only
 * 2. XML format with AI prompt
 */

import { deidentify } from './piiUtils';

/**
 * Format patient summary data
 * @param {Array} patientSummaryData - Patient summary data array
 * @returns {string} Formatted patient summary text
 */
export const formatPatientSummary = (patientSummaryData) => {
    let text = '<patientSummary>\n雲端註記資料:\n';

    if (patientSummaryData && patientSummaryData.length > 0) {
        patientSummaryData.forEach(item => {
            const itemText = item.text || '';
            // Filter out the dental image sentence
            if (itemText && !itemText.includes('此病人於牙科處置紀錄有影像上傳資料')) {
                text += `${itemText}\n`;
            }
        });
    }

    text += '</patientSummary>\n\n';
    return text;
};

/**
 * Format allergy data
 * @param {Array} allergyData - Allergy data array
 * @returns {string} Formatted allergy text
 */
export const formatAllergy = (allergyData) => {
    let text = '<allergy>\n過敏史:\n';

    if (allergyData && allergyData.length > 0) {
        allergyData.forEach(item => {
            text += `${item.drugName || ''} - ${item.symptoms || ''}\n`;
        });
    }

    text += '</allergy>\n\n';
    return text;
};

/**
 * Format surgery data
 * @param {Array} surgeryData - Surgery data array
 * @returns {string} Formatted surgery text
 */
export const formatSurgery = (surgeryData) => {
    let text = '<surgery>\n開刀史:\n';

    if (surgeryData && surgeryData.length > 0) {
        surgeryData.forEach(item => {
            text += `${item.date || ''} - ${item.hospital || ''} - ${item.diagnosis || ''}\n`;
        });
    }

    text += '</surgery>\n\n';
    return text;
};

/**
 * Format discharge (hospitalization) data
 * @param {Array} dischargeData - Discharge data array
 * @returns {string} Formatted discharge text
 */
export const formatDischarge = (dischargeData) => {
    let text = '<discharge>\n住院史:\n';

    if (dischargeData && dischargeData.length > 0) {
        dischargeData.forEach(item => {
            const inDate = item.in_date ? new Date(item.in_date).toLocaleDateString('zh-TW') : '';
            const outDate = item.out_date ? new Date(item.out_date).toLocaleDateString('zh-TW') : '';
            const hospital = item.hospital || (item.hosp ? item.hosp.split(';')[0] : '');
            text += `${inDate} - ${outDate} - ${hospital} - ${item.icd_code || ''} ${item.icd_cname || ''}\n`;
        });
    }

    text += '</discharge>\n\n';
    return text;
};

/**
 * Format HBCV (Hepatitis B & C) data
 * @param {Object} hbcvData - HBCV data object
 * @returns {string} Formatted HBCV text
 */
export const formatHBCV = (hbcvData) => {
    let text = '<hbcvdata>\nB、C肝炎資料:\n';

    if (hbcvData && hbcvData.rObject && hbcvData.rObject.length > 0) {
        const actualData = hbcvData.rObject[0];

        if (actualData.result_data && actualData.result_data.length > 0) {
            actualData.result_data.forEach(item => {
                const value = item.assay_value || '';
                const range = item.consult_value ? ` (正常值範圍: ${item.consult_value})` : '';
                text += `${item.real_inspect_date || ''} - ${item.assay_item_name || ''}: ${value}${range}\n`;
            });
        }

        if (actualData.med_data && actualData.med_data.length > 0) {
            actualData.med_data.forEach(item => {
                text += `${item.func_date || ''} - ${item.drug_ing_name || ''}\n`;
            });
        }
    }

    text += '</hbcvdata>\n\n';
    return text;
};

/**
 * Format medication data
 * @param {Array} groupedMedications - Grouped medications array
 * @returns {string} Formatted medication text
 */
export const formatMedication = (groupedMedications) => {
    let text = '<medication>\n近期用藥記錄:\n';

    if (groupedMedications && groupedMedications.length > 0) {
        groupedMedications.forEach(group => {
            text += `${group.date || ''} - ${group.hosp || ''}\n`;

            if (group.icd_code || group.icd_name) {
                text += `診斷: ${group.icd_code || ''} ${group.icd_name || ''}\n`;
            }

            if (group.medications && group.medications.length > 0) {
                group.medications.forEach(med => {
                    const dosageInfo = med.perDosage !== "SPECIAL"
                        ? `${med.perDosage}#`
                        : `總量${med.dosage}`;
                    let medLine = `  ${med.name || ''} ${dosageInfo} ${med.frequency || ''} ${med.days || ''}天`;
                    if (med.ingredient) {
                        medLine += ` (${med.ingredient})`;
                    }
                    if (med.atc_code) {
                        medLine += ` [${med.atc_code}]`;
                    }
                    text += `${medLine}\n`;
                });
            }

            text += '\n';
        });
    }

    text += '</medication>\n\n';
    return text;
};

/**
 * Format lab data
 * @param {Array} groupedLabs - Grouped labs array
 * @returns {string} Formatted lab text
 */
export const formatLab = (groupedLabs) => {
    let text = '<lab>\n近期檢驗記錄:\n';

    if (groupedLabs && groupedLabs.length > 0) {
        groupedLabs.forEach(group => {
            text += `${group.date || ''} - ${group.hosp || ''}\n`;

            if (group.labs && group.labs.length > 0) {
                group.labs.forEach(lab => {
                    const value = lab.value || '';
                    const unit = lab.unit || '';
                    const reference = lab.reference || '';
                    text += `  ${lab.itemName || ''}: ${value} ${unit}`;
                    if (reference) {
                        text += ` (參考值: ${reference})`;
                    }
                    text += '\n';
                });
            }

            text += '\n';
        });
    }

    text += '</lab>\n\n';
    return text;
};

/**
 * Format Chinese medicine data
 * @param {Array} groupedChineseMeds - Grouped Chinese meds array
 * @returns {string} Formatted Chinese medicine text
 */
export const formatChineseMed = (groupedChineseMeds) => {
    let text = '<chinesemed>\n近期中藥記錄:\n';

    if (groupedChineseMeds && groupedChineseMeds.length > 0) {
        groupedChineseMeds.forEach(group => {
            text += `${group.date || ''} - ${group.hosp || ''}\n`;

            if (group.medications && group.medications.length > 0) {
                group.medications.forEach(med => {
                    text += `  ${med.drug_name || ''} ${med.dose || ''} ${med.freq_name || ''} ${med.days || ''}天\n`;
                });
            }

            text += '\n';
        });
    }

    text += '</chinesemed>\n\n';
    return text;
};

/**
 * Format imaging data
 * @param {Object} imagingData - Imaging data object with withReport and withoutReport arrays
 * @returns {string} Formatted imaging text
 */
export const formatImaging = (imagingData) => {
    let text = '<imaging>\n近期影像學報告:\n';

    if (imagingData && imagingData.withReport && imagingData.withReport.length > 0) {
        imagingData.withReport.forEach(item => {
            text += `${item.date || ''} - ${item.hosp || ''} - ${item.orderName || ''}\n`;

            if (item.inspectResult) {
                // Clean up the report result
                let reportResult = item.inspectResult;
                const markers = [
                    "Imaging findings:", "Imaging findings",
                    "Sonographic Findings:", "Sonographic Findings",
                    "報告內容:", "報告內容：", "報告內容"
                ];

                for (const marker of markers) {
                    if (reportResult.includes(marker)) {
                        reportResult = reportResult.split(marker)[1];
                        break;
                    }
                }

                const cleanedReport = deidentify(reportResult.trim());
                text += `  報告: ${cleanedReport}\n`;
            }

            text += '\n';
        });
    }

    text += '</imaging>\n';
    return text;
};

/**
 * Format diagnosis and enrollment data
 * @param {Object} diagnosisData - Processed diagnosis data
 * @returns {string} Formatted diagnosis text
 */
export const formatDiagnosis = (diagnosisData) => {
    let text = '<diagnosis>\n診斷與收案資訊:\n';

    if (!diagnosisData) return text + '</diagnosis>\n\n';

    const { outpatient = [], emergency = [], inpatient = [], vaccines = [], enrollment = [] } = diagnosisData;

    if (enrollment.length > 0) {
        text += '收案資訊:\n';
        enrollment.forEach(item => {
            text += `  - ${item.programName} (${item.hospital}收案)\n`;
        });
    }

    if (outpatient.length > 0) {
        text += '門診診斷 (按頻率排序):\n';
        outpatient.forEach(item => {
            text += `  - ${item.code} ${item.name}${item.count > 1 ? ` (${item.count}次)` : ''}${item.isChineseMed ? ' [中醫]' : ''}\n`;
        });
    }

    if (emergency.length > 0) {
        text += '急診診斷:\n';
        emergency.forEach(item => {
            text += `  - ${item.date} ${item.hospital}: ${item.code} ${item.name}${item.isChineseMed ? ' [中醫]' : ''}\n`;
        });
    }

    if (inpatient.length > 0) {
        text += '住院診斷:\n';
        inpatient.forEach(item => {
            text += `  - ${item.date} ${item.hospital}: ${item.code} ${item.name}${item.isChineseMed ? ' [中醫]' : ''}\n`;
        });
    }

    if (vaccines.length > 0) {
        text += '疫苗記錄:\n';
        vaccines.forEach(item => {
            text += `  - ${item.date} ${item.hospital}: ${item.medications.join(', ')}\n`;
        });
    }

    text += '</diagnosis>\n\n';
    return text;
};

/**
 * Generate complete GAI format XML data
 * @param {Object} data - All patient data
 * @param {Object} data.userInfo - User information (age, gender)
 * @param {Array} data.patientSummaryData - Patient summary data
 * @param {Array} data.allergyData - Allergy data
 * @param {Array} data.surgeryData - Surgery data
 * @param {Array} data.dischargeData - Discharge data
 * @param {Object} data.hbcvData - HBCV data
 * @param {Array} data.groupedMedications - Grouped medications
 * @param {Array} data.groupedLabs - Grouped labs
 * @param {Array} data.groupedChineseMeds - Grouped Chinese meds
 * @param {Object} data.imagingData - Imaging data
 * @returns {string} Complete GAI format XML text
 */
export const generateGAIFormatXML = (data) => {
    const {
        userInfo,
        patientSummaryData,
        allergyData,
        surgeryData,
        dischargeData,
        hbcvData,
        groupedMedications,
        groupedLabs,
        groupedChineseMeds,
        imagingData
    } = data;

    // Get user info
    const age = userInfo?.age || '未知';
    const gender = userInfo?.gender === 'M' ? 'male' : userInfo?.gender === 'F' ? 'female' : '未知';

    // Build the GAI format text
    let gaiText = `這是一位 ${age} 歲的 ${gender} 性病人，以下是病歷資料\n\n`;

    // Add all sections
    gaiText += formatPatientSummary(patientSummaryData);

    const diagnosisText = formatDiagnosis(data.diagnosisData);
    console.log('[gaiCopyFormatter] Formatted diagnosis section:', diagnosisText);
    gaiText += diagnosisText;

    gaiText += formatAllergy(allergyData);
    gaiText += formatSurgery(surgeryData);
    gaiText += formatDischarge(dischargeData);
    gaiText += formatHBCV(hbcvData);
    gaiText += formatMedication(groupedMedications);
    gaiText += formatLab(groupedLabs);
    gaiText += formatChineseMed(groupedChineseMeds);
    gaiText += formatImaging(imagingData);

    return gaiText;
};

/**
 * Handle copying GAI format data to clipboard
 * @param {Object} data - All patient data
 * @param {Function} onSuccess - Success callback
 * @param {Function} onError - Error callback
 */
export const handleCopyGAIFormat = (data, onSuccess, onError) => {
    console.log('handleCopyGAIFormat called');
    console.log('Data:', data);

    const gaiText = generateGAIFormatXML(data);
    console.log('Generated GAI text:', gaiText);

    // Copy to clipboard
    navigator.clipboard
        .writeText(gaiText)
        .then(() => {
            console.log('GAI format copied successfully');
            if (onSuccess) onSuccess('GAI格式資料已複製到剪貼簿');
        })
        .catch((err) => {
            console.error('Failed to copy GAI format: ', err);
            if (onError) onError('複製失敗，請重試');
        });
};

/**
 * Handle copying GAI format with prompt to clipboard
 * @param {Object} data - All patient data
 * @param {string} gaiPrompt - GAI prompt text
 * @param {Function} onSuccess - Success callback
 * @param {Function} onError - Error callback
 */
export const handleCopyGAIWithPrompt = (data, gaiPrompt, onSuccess, onError) => {
    console.log('handleCopyGAIWithPrompt called');

    const gaiText = generateGAIFormatXML(data);

    // Combine prompt + GAI data with ### markers
    const combinedText = gaiPrompt + '\n###\n' + gaiText + '\n###';

    console.log('Generated combined GAI text with prompt');

    // Copy to clipboard
    navigator.clipboard
        .writeText(combinedText)
        .then(() => {
            console.log('GAI format with prompt copied successfully');
            if (onSuccess) onSuccess('GAI提示詞+資料已複製到剪貼簿');
        })
        .catch((err) => {
            console.error('Failed to copy GAI format with prompt: ', err);
            if (onError) onError('複製失敗，請重試');
        });
};
