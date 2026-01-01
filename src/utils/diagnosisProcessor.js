/**
 * Diagnosis Data Processor
 * 
 * 從西藥、中藥與備註資料中提取診斷與收案資訊
 */

/**
 * 輔助函數，用於安全解析各種格式的日期
 */
const parseDate = (dateStr) => {
    if (!dateStr) return null;
    let normalizedDate = dateStr.replace(/\//g, '-');
    const parsedDate = new Date(normalizedDate);
    if (isNaN(parsedDate.getTime())) return null;
    return parsedDate;
};

/**
 * 輔助函數，檢查 ICD 代碼是否為疫苗代碼
 */
const isVaccineCode = (icdCode) => {
    if (!icdCode) return false;
    const normalizedCode = icdCode.toUpperCase();
    return normalizedCode.startsWith('Z23') ||
        normalizedCode.startsWith('Z24') ||
        normalizedCode.startsWith('Z25') ||
        normalizedCode.startsWith('Z26') ||
        normalizedCode.startsWith('Z27');
};

/**
 * 處理診斷與收案資料
 * 
 * @param {Object} params - 參數物件
 * @param {Array} params.groupedMedications - 西藥資料
 * @param {Array} params.groupedChineseMeds - 中藥資料
 * @param {Array} params.patientSummaryData - 備註資料
 * @param {number} params.trackingDays - 追蹤天數 (預設 180)
 * @returns {Object} 處理後的診斷資料
 */
export const processDiagnosisData = ({
    groupedMedications = [],
    groupedChineseMeds = [],
    patientSummaryData = [],
    trackingDays = 180
}) => {
    const now = new Date();
    const cutoffDate = new Date();
    cutoffDate.setDate(now.getDate() - trackingDays);

    const outpatientDiagnoses = {};
    const emergencyDiagnoses = [];
    const inpatientDiagnoses = [];
    const vaccineRecords = [];
    const enrollmentCases = [];

    // 診斷分類處理器
    const processEntry = (group, isChineseMed = false) => {
        const groupDate = parseDate(group.date);
        if (!groupDate || groupDate < cutoffDate) return;
        if (!group.icd_code || !group.icd_name) return;

        const normalizedIcdCode = group.icd_code.toUpperCase();
        const diagnosisKey = `${normalizedIcdCode}|${group.icd_name}`;

        // 處理疫苗
        if (isVaccineCode(normalizedIcdCode)) {
            let hasVaccineMedication = false;
            let medicationNames = [];

            if (Array.isArray(group.medications) && group.medications.length > 0) {
                const vaccineFilteredMeds = group.medications.filter(med => med.atc_code && med.atc_code.startsWith('J07'));
                if (vaccineFilteredMeds.length > 0) {
                    hasVaccineMedication = true;
                    medicationNames = vaccineFilteredMeds.map(med => med.name || med.drugName || '').filter(Boolean);
                }
            } else if (group.atc_code && group.atc_code.startsWith('J07')) {
                hasVaccineMedication = true;
                medicationNames = [group.name || group.drugName].filter(Boolean);
            }

            if (hasVaccineMedication && medicationNames.length > 0) {
                vaccineRecords.push({
                    date: group.date,
                    code: normalizedIcdCode,
                    name: group.icd_name,
                    hospital: group.hosp || group.hospital || '',
                    medications: medicationNames,
                    key: diagnosisKey,
                    isChineseMed
                });
                return;
            }
        }

        // 依訪問類型分類
        const visitType = group.visitType;
        if (visitType === "急診") {
            emergencyDiagnoses.push({
                date: group.date,
                code: normalizedIcdCode,
                name: group.icd_name,
                key: diagnosisKey,
                isChineseMed,
                hospital: group.hosp || group.hospital || ''
            });
        } else if (visitType === "住診") {
            if (!inpatientDiagnoses.find(entry => entry.code === normalizedIcdCode)) {
                inpatientDiagnoses.push({
                    date: group.date,
                    code: normalizedIcdCode,
                    name: group.icd_name,
                    key: diagnosisKey,
                    isChineseMed,
                    hospital: group.hosp || group.hospital || ''
                });
            }
        } else {
            // 預設為門診/藥局
            if (!outpatientDiagnoses[diagnosisKey]) {
                outpatientDiagnoses[diagnosisKey] = { count: 0, isChineseMed };
            }
            outpatientDiagnoses[diagnosisKey].count += 1;
        }
    };

    groupedMedications.forEach(group => processEntry(group, false));
    groupedChineseMeds.forEach(group => processEntry(group, true));

    // 處理收案資訊
    if (Array.isArray(patientSummaryData)) {
        patientSummaryData.forEach(item => {
            if (item.originalText && item.originalText.includes('擷取來源為VPN院所登載資料')) {
                const regex = /<span class='red-sign'>(.*?)<\/span>/g;
                let match;
                while ((match = regex.exec(item.originalText)) !== null) {
                    const enrollmentText = match[1];
                    const programMatch = enrollmentText.match(/^(.+?)(?:方案)?個案\(由(.+?)收案\)$/);
                    if (programMatch) {
                        enrollmentCases.push({
                            programName: programMatch[1].trim(),
                            hospital: programMatch[2].trim(),
                            fullText: enrollmentText
                        });
                    }
                }
            }
        });
    }

    // 排序
    const sortByDate = (a, b) => {
        const da = parseDate(a.date);
        const db = parseDate(b.date);
        if (!da || !db) return 0;
        return db - da;
    };

    return {
        outpatient: Object.entries(outpatientDiagnoses).map(([key, data]) => {
            const [code, name] = key.split('|');
            return { code, name, count: data.count, isChineseMed: data.isChineseMed, key };
        }).sort((a, b) => b.count - a.count),
        emergency: emergencyDiagnoses.sort(sortByDate),
        inpatient: inpatientDiagnoses.sort(sortByDate),
        vaccines: vaccineRecords.sort(sortByDate),
        enrollment: enrollmentCases
    };
};
