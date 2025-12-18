export const GAI_CONFIG = {
    critical_alerts: {
        schema: {
            name: "critical_alerts_response",
            strict: true,
            schema: {
                type: "object",
                properties: {
                    critical_alerts: {
                        type: "array",
                        items: { type: "string" },
                        description: "List of critical alerts, dangerous conditions, or urgent attention items identified in the medical record."
                    }
                },
                required: ["critical_alerts"],
                additionalProperties: false
            }
        },
        systemPrompt: "You are an expert medical AI assistant. Analyze the provided medical record (XML format) and identify ONLY the most critical, dangerous, or urgent items that require immediate attention. Focus on severe conditions, active risks, and major warnings. Return the result in the specified JSON format. Please output in Traditional Chinese (zh-TW) using medical terminology commonly used by Taiwanese physicians."
    },
    medication_risks: {
        schema: {
            name: "medication_risks_response",
            strict: true,
            schema: {
                type: "object",
                properties: {
                    medication_risks: {
                        type: "array",
                        items: { type: "string" },
                        description: "List of medication risks, contraindications, drug interactions, or dosage warnings."
                    }
                },
                required: ["medication_risks"],
                additionalProperties: false
            }
        },
        systemPrompt: "You are an expert clinical pharmacist AI. Analyze the provided medical record (XML format) and identify potential medication risks, drug-drug interactions, contraindications, renal dose adjustments (based on eGFR), and other medication-related safety concerns. Return the result in the specified JSON format. Please output in Traditional Chinese (zh-TW) using medical terminology commonly used by Taiwanese physicians."
    },
    abnormal_labs: {
        schema: {
            name: "abnormal_labs_response",
            strict: true,
            schema: {
                type: "object",
                properties: {
                    abnormal_labs: {
                        type: "array",
                        items: { type: "string" },
                        description: "List of recent abnormal laboratory results with interpretation."
                    }
                },
                required: ["abnormal_labs"],
                additionalProperties: false
            }
        },
        systemPrompt: "You are an expert medical AI. Analyze the provided medical record (XML format) and extract RECENT abnormal laboratory results. Focus on values outside normal ranges, significant trends (e.g., rising Creatinine), and critical values. Provide a brief interpretation for each abnormality. Return the result in the specified JSON format. Please output in Traditional Chinese (zh-TW) using medical terminology commonly used by Taiwanese physicians."
    },
    imaging_findings: {
        schema: {
            name: "imaging_findings_response",
            strict: true,
            schema: {
                type: "object",
                properties: {
                    imaging_findings: {
                        type: "array",
                        items: { type: "string" },
                        description: "List of important findings from recent imaging reports."
                    }
                },
                required: ["imaging_findings"],
                additionalProperties: false
            }
        },
        systemPrompt: "You are an expert radiologist AI. Analyze the provided medical record (XML format), specifically the imaging reports. Extract and summarize important abnormal findings, diagnoses, and recommendations from the reports. Ignore normal findings unless relevant to a specific condition. Return the result in the specified JSON format. Please output in Traditional Chinese (zh-TW) using medical terminology commonly used by Taiwanese physicians."
    }
};
