import React, { useEffect, useState } from "react";
import { Paper, Typography, Box, Table, TableBody, TableCell, TableContainer, TableRow } from "@mui/material";
import { alpha } from "@mui/material/styles";
import HealthAndSafetyIcon from "@mui/icons-material/HealthAndSafety";
import { checkAbnormalValue, extractHospitalName } from "../../utils/hbcvdataProcessor.js";

/**
 * Integrated component for displaying Adult Health Check, Cancer Screening, and Hepatitis B & C data
 * 
 * @param {Object} adultHealthCheckData - The adult health check data
 * @param {Object} cancerScreeningData - The cancer screening data
 * @param {Object} hbcvData - The hepatitis B & C data
 * @param {Object} cloudSettings - Settings to determine which data to display
 * @param {Object} generalDisplaySettings - Display settings like text sizes
 * @returns {JSX.Element} The component
 */
const Overview_IntegratedHealthData = ({
    adultHealthCheckData,
    cancerScreeningData,
    hbcvData,
    cloudSettings = {},
    generalDisplaySettings = {}
}) => {
    // Extract display settings with defaults
    const { titleTextSize = 'medium', contentTextSize = 'medium' } = generalDisplaySettings;

    // Determine which sections to show based on cloudSettings
    const showAdultHealthCheck = cloudSettings?.fetchAdultHealthCheck === true;
    const showCancerScreening = cloudSettings?.fetchCancerScreening === true;
    const showHbcvdata = cloudSettings?.fetchHbcvdata === true;

    // Build dynamic title
    const buildTitle = () => {
        const titles = [];
        if (showAdultHealthCheck) titles.push("成健");
        if (showCancerScreening) titles.push("癌篩");
        if (showHbcvdata) titles.push("BC肝");
        return titles.join(" / ");
    };

    // Helper function to get text size in pixels
    const getTextSize = (size) => {
        const sizes = {
            small: '0.8rem',
            medium: '0.9rem',
            large: '1rem'
        };
        return sizes[size] || sizes.medium;
    };

    // Helper function to determine text color based on result
    const getResultColor = (result) => {
        if (!result || result === "無資料") {
            return "text.disabled"; // gray
        } else if (result === "異常") {
            return "error.main"; // red
        } else {
            return "text.primary"; // black (default)
        }
    };

    // Check if any section has data
    const hasAnyData = () => {
        return hasAdultHealthCheckData() || hasCancerScreeningData() || hasHbcvData();
    };

    // Check Adult Health Check data
    const hasAdultHealthCheckData = () => {
        if (!showAdultHealthCheck || !adultHealthCheckData) return false;

        const dataFromRObject = adultHealthCheckData.rObject && adultHealthCheckData.rObject[0];
        const dataFromOriginal = adultHealthCheckData.originalData && adultHealthCheckData.originalData.robject;
        const dataFromDirect = adultHealthCheckData.result_data ? adultHealthCheckData : null;
        const actualData = dataFromRObject || dataFromOriginal || dataFromDirect;

        return actualData && actualData.result_data && Array.isArray(actualData.result_data) && actualData.result_data.length > 0;
    };

    // Check Cancer Screening data
    const hasCancerScreeningData = () => {
        if (!showCancerScreening || !cancerScreeningData) return false;

        const dataFromRObject = cancerScreeningData.rObject && cancerScreeningData.rObject[0];
        const dataFromOriginal = cancerScreeningData.originalData && cancerScreeningData.originalData.robject;
        const dataFromDirect = (cancerScreeningData.colorectal || cancerScreeningData.oralMucosa || cancerScreeningData.mammography || cancerScreeningData.papSmears || cancerScreeningData.lungCancer) ? cancerScreeningData : null;
        const actualData = dataFromRObject || dataFromOriginal || dataFromDirect;

        return actualData && (actualData.colorectal || actualData.oralMucosa || actualData.mammography || actualData.papSmears || actualData.lungCancer);
    };

    // Check Hepatitis B & C data
    const hasHbcvData = () => {
        if (!showHbcvdata || !hbcvData) return false;

        const dataFromRObject = hbcvData.rObject && hbcvData.rObject[0];
        const dataFromOriginal = hbcvData.originalData && hbcvData.originalData.robject;
        const dataFromDirect = (hbcvData.result_data || hbcvData.med_data || hbcvData.inspection_data) ? hbcvData : null;
        const actualData = dataFromRObject || dataFromOriginal || dataFromDirect;

        return actualData && (
            (actualData.result_data && actualData.result_data.length > 0) ||
            (actualData.med_data && actualData.med_data.length > 0) ||
            (actualData.inspection_data && actualData.inspection_data.length > 0)
        );
    };

    // Render Adult Health Check data
    const renderAdultHealthCheckRows = () => {
        if (!hasAdultHealthCheckData()) return null;

        const dataFromRObject = adultHealthCheckData.rObject && adultHealthCheckData.rObject[0];
        const dataFromOriginal = adultHealthCheckData.originalData && adultHealthCheckData.originalData.robject;
        const dataFromDirect = adultHealthCheckData.result_data ? adultHealthCheckData : null;
        const actualData = dataFromRObject || dataFromOriginal || dataFromDirect;
        const resultDataArray = Array.isArray(actualData.result_data) ? actualData.result_data : [actualData.result_data];
        const latestData = resultDataArray[0];

        const content = (
            <>
                {latestData.title && (
                    <Typography variant="body2" sx={{ fontSize: getTextSize(contentTextSize), mb: 0.5, fontWeight: 'medium' }}>
                        {latestData.title}
                    </Typography>
                )}
                <Typography variant="body2" sx={{ fontSize: getTextSize(contentTextSize), mb: 0.5 }}>
                    H {latestData.height || '--'} W {latestData.weight || '--'} BMI {latestData.bmi || '--'} 腰 {latestData.waistline || '--'} BP {latestData.base_sbp || '--'}/{latestData.base_ebp || '--'}
                </Typography>
                <Typography variant="body2" sx={{ fontSize: getTextSize(contentTextSize) }}>
                    Chol {latestData.cho || '--'} / TG {latestData.blod_tg || '--'} / LDL {latestData.ldl || '--'} / HDL {latestData.hdl || '--'} / GOT {latestData.sgot || '--'} / GPT {latestData.sgpt || '--'} / Glu {latestData.s_09005c || '--'} / BUN {latestData.urine_bun || '--'} / Cr {latestData.blod_creat || '--'} / GFR {latestData.egfr || '--'} / 尿蛋白 {latestData.urine_protein || '--'}
                </Typography>
            </>
        );

        return (
            <TableRow>
                <TableCell
                    component="th"
                    scope="row"
                    align="center"
                    sx={{
                        width: '45px',
                        verticalAlign: 'middle',
                        borderBottom: 'none',
                        padding: '8px 4px',
                        backgroundColor: alpha('#4caf50', 0.15),
                        fontSize: getTextSize(contentTextSize),
                        fontWeight: 'bold'
                    }}
                >
                    成健
                </TableCell>
                <TableCell sx={{
                    fontSize: getTextSize(contentTextSize),
                    borderBottom: 'none',
                    padding: '8px 8px',
                    backgroundColor: alpha('#4caf50', 0.05)
                }}>
                    {content}
                </TableCell>
            </TableRow>
        );
    };

    // Render Cancer Screening data
    const renderCancerScreeningRows = () => {
        if (!hasCancerScreeningData()) return null;

        const dataFromRObject = cancerScreeningData.rObject && cancerScreeningData.rObject[0];
        const dataFromOriginal = cancerScreeningData.originalData && cancerScreeningData.originalData.robject;
        const dataFromDirect = (cancerScreeningData.colorectal || cancerScreeningData.oralMucosa || cancerScreeningData.mammography || cancerScreeningData.papSmears || cancerScreeningData.lungCancer) ? cancerScreeningData : null;
        const actualData = dataFromRObject || dataFromOriginal || dataFromDirect;

        const screeningItems = [
            { type: 'colorectal', label: '糞便潛血' },
            { type: 'oralMucosa', label: '口腔黏膜' },
            { type: 'mammography', label: '乳房攝影' },
            { type: 'papSmears', label: '子宮頸癌' },
            { type: 'lungCancer', label: '肺癌篩檢' }
        ];

        // Separate items with data and items without data
        const itemsWithData = [];
        const itemsWithoutData = [];

        screeningItems.forEach(({ type, label }) => {
            if (!actualData[type] || !actualData[type].subData || !Array.isArray(actualData[type].subData) || actualData[type].subData.length === 0) {
                itemsWithoutData.push(label);
            } else {
                const latestData = actualData[type].subData[0];
                itemsWithData.push({ type, label, data: latestData });
            }
        });

        const content = (
            <>
                {itemsWithData.map(({ type, label, data }) => {
                    return (
                        <Typography
                            key={type}
                            variant="body2"
                            sx={{ fontSize: getTextSize(contentTextSize), mb: 0.5, color: getResultColor(data.result) }}
                        >
                            {label}: {data.result}
                            <Typography component="span" variant="body2" color="text.secondary" sx={{ fontSize: getTextSize(contentTextSize) }}>
                                {' '}{data.func_date} {data.hosp_abbr}
                            </Typography>
                        </Typography>
                    );
                })}
                {itemsWithoutData.length > 0 && (
                    <Typography
                        variant="body2"
                        sx={{ fontSize: getTextSize(contentTextSize), mb: 0.5, color: getResultColor("無資料") }}
                    >
                        {itemsWithoutData.join(' / ')}: 無資料
                    </Typography>
                )}
            </>
        );

        return (
            <TableRow>
                <TableCell
                    component="th"
                    scope="row"
                    align="center"
                    sx={{
                        width: '45px',
                        verticalAlign: 'middle',
                        borderBottom: 'none',
                        padding: '8px 4px',
                        backgroundColor: alpha('#ff9800', 0.15),
                        fontSize: getTextSize(contentTextSize),
                        fontWeight: 'bold'
                    }}
                >
                    癌篩
                </TableCell>
                <TableCell sx={{
                    fontSize: getTextSize(contentTextSize),
                    borderBottom: 'none',
                    padding: '8px 8px',
                    backgroundColor: alpha('#ff9800', 0.05)
                }}>
                    {content}
                </TableCell>
            </TableRow>
        );
    };

    // Render Hepatitis B & C data
    const renderHbcvDataRows = () => {
        if (!hasHbcvData()) return null;

        const dataFromRObject = hbcvData.rObject && hbcvData.rObject[0];
        const dataFromOriginal = hbcvData.originalData && hbcvData.originalData.robject;
        const dataFromDirect = (hbcvData.result_data || hbcvData.med_data || hbcvData.inspection_data) ? hbcvData : null;
        const actualData = dataFromRObject || dataFromOriginal || dataFromDirect;

        // Build compact content
        const contentParts = [];

        // Add test results in compact format
        if (actualData.result_data && actualData.result_data.length > 0) {
            const results = actualData.result_data.map((item) => {
                const { isAbnormal } = checkAbnormalValue(item.assay_value, item.consult_value);
                return {
                    text: `${item.assay_item_name}: ${item.assay_value} (${item.real_inspect_date})`,
                    isAbnormal
                };
            });
            contentParts.push({ type: 'results', data: results });
        }

        // Add medications in compact format
        if (actualData.med_data && actualData.med_data.length > 0) {
            const medications = actualData.med_data.map((item) =>
                `${item.drug_ing_name} (${item.func_date} ${extractHospitalName(item.hosp)})`
            );
            contentParts.push({ type: 'medications', data: medications });
        }

        const content = (
            <>
                {contentParts.map((part, index) => {
                    if (part.type === 'results') {
                        return (
                            <Box key="results" sx={{ mb: contentParts.length > 1 ? 0.5 : 0 }}>
                                {part.data.map((result, idx) => (
                                    <Typography
                                        key={idx}
                                        variant="body2"
                                        sx={{
                                            fontSize: getTextSize(contentTextSize),
                                            mb: idx < part.data.length - 1 ? 0.1 : 0,
                                            color: result.isAbnormal ? 'error.main' : 'inherit'
                                        }}
                                    >
                                        {result.text}
                                    </Typography>
                                ))}
                            </Box>
                        );
                    } else if (part.type === 'medications') {
                        return (
                            <Typography
                                key="medications"
                                variant="body2"
                                sx={{ fontSize: getTextSize(contentTextSize) }}
                            >
                                Rx: {part.data.join(' / ')}
                            </Typography>
                        );
                    }
                    return null;
                })}
            </>
        );

        return (
            <TableRow>
                <TableCell
                    component="th"
                    scope="row"
                    align="center"
                    sx={{
                        width: '45px',
                        verticalAlign: 'middle',
                        borderBottom: 'none',
                        padding: '8px 4px',
                        backgroundColor: alpha('#9c27b0', 0.15),
                        fontSize: getTextSize(contentTextSize),
                        fontWeight: 'bold'
                    }}
                >
                    BC肝
                </TableCell>
                <TableCell sx={{
                    fontSize: getTextSize(contentTextSize),
                    borderBottom: 'none',
                    padding: '8px 8px',
                    backgroundColor: alpha('#9c27b0', 0.05)
                }}>
                    {content}
                </TableCell>
            </TableRow>
        );
    };

    const title = buildTitle();

    // Don't render if no sections are enabled
    if (!showAdultHealthCheck && !showCancerScreening && !showHbcvdata) {
        return null;
    }

    return (
        <Paper
            elevation={1}
            sx={{
                p: 1.5,
                mb: 2,
                height: "auto",
                minHeight: hasAnyData() ? "inherit" : "auto",
                overflow: "hidden",
            }}
        >
            <Box sx={{ display: "flex", alignItems: "center", mb: hasAnyData() ? 1 : 0 }}>
                <HealthAndSafetyIcon
                    sx={{ mr: 1, color: "primary.main", fontSize: "1.5rem" }}
                />
                <Typography
                    variant="subtitle1"
                    sx={{
                        fontWeight: "bold",
                        fontSize: titleTextSize === 'small' ? '1rem' : titleTextSize === 'large' ? '1.2rem' : '1.1rem',
                    }}
                >
                    {title}
                </Typography>
            </Box>

            {hasAnyData() ? (
                <TableContainer>
                    <Table size="small" sx={{ '& .MuiTableCell-root': { padding: '4px 8px' } }}>
                        <TableBody>
                            {renderAdultHealthCheckRows()}
                            {renderCancerScreeningRows()}
                            {renderHbcvDataRows()}
                        </TableBody>
                    </Table>
                </TableContainer>
            ) : (
                <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ fontSize: getTextSize(contentTextSize), pl: 1, display: "inline-block", ml: 1 }}
                >
                    無資料
                </Typography>
            )}
        </Paper>
    );
};

export default Overview_IntegratedHealthData;
