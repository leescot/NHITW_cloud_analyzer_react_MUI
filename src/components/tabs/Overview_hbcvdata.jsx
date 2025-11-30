import React, { useEffect, useState } from "react";
import { Paper, Typography, Box, Table, TableBody, TableCell, TableContainer, TableHead, TableRow } from "@mui/material";
import VaccinesIcon from "@mui/icons-material/Vaccines";

/**
 * Component for displaying Hepatitis B & C data
 * 
 * @param {Object} hbcvData - The hepatitis B & C data containing result_data and med_data
 * @param {Object} generalDisplaySettings - Display settings like text sizes
 * @returns {JSX.Element} The component
 */
const Overview_hbcvdata = ({ hbcvData, generalDisplaySettings = {} }) => {
    // Extract display settings with defaults
    const { titleTextSize = 'medium', contentTextSize = 'medium' } = generalDisplaySettings;

    // State to store the combined data from props or window global
    const [combinedData, setCombinedData] = useState(hbcvData);

    // Check for data in window global as fallback
    useEffect(() => {
        console.log("[Overview_hbcvdata] hbcvData prop:", hbcvData);
        console.log("[Overview_hbcvdata] window.hbcvData:", window.hbcvData);

        // If prop data exists, use it
        if (hbcvData) {
            setCombinedData(hbcvData);
            console.log("[Overview_hbcvdata] Using prop data");
            return;
        }

        // Otherwise, try to get data from window global
        if (window.hbcvData) {
            setCombinedData(window.hbcvData);
            console.log("[Overview_hbcvdata] Using window.hbcvData");
        }
    }, [hbcvData]);

    // Function to determine if data exists
    const hasData = () => {
        if (!combinedData) {
            return false;
        }

        // 嘗試從 rObject 取得資料
        const dataFromRObject = combinedData.rObject && combinedData.rObject[0];
        // 嘗試從 originalData.robject 取得資料
        const dataFromOriginal = combinedData.originalData && combinedData.originalData.robject;
        // 或者直接從 combinedData（舊格式）
        const dataFromDirect = combinedData.result_data || combinedData.med_data || combinedData.inspection_data;

        const actualData = dataFromRObject || dataFromOriginal || (dataFromDirect ? combinedData : null);

        return actualData && (
            (actualData.result_data && actualData.result_data.length > 0) ||
            (actualData.med_data && actualData.med_data.length > 0) ||
            (actualData.inspection_data && actualData.inspection_data.length > 0)
        );
    };

    // Helper function to get text size in pixels
    const getTextSize = (size) => {
        const sizes = {
            small: '0.7rem',
            medium: '0.8rem',
            large: '0.9rem'
        };
        return sizes[size] || sizes.medium;
    };

    // Get actual data from various possible formats
    const getActualData = () => {
        if (!combinedData) return null;

        const dataFromRObject = combinedData.rObject && combinedData.rObject[0];
        const dataFromOriginal = combinedData.originalData && combinedData.originalData.robject;
        const dataFromDirect = (combinedData.result_data || combinedData.med_data || combinedData.inspection_data) ? combinedData : null;

        return dataFromRObject || dataFromOriginal || dataFromDirect;
    };

    // Function to strip HTML tags from text
    const stripHtml = (html) => {
        if (!html) return '';
        return html.replace(/<br\s*\/?>/gi, ' ').replace(/<[^>]*>/g, '').trim();
    };

    // Render test results in simplified format
    const renderResultsTable = () => {
        const actualData = getActualData();
        if (!actualData || !actualData.result_data || actualData.result_data.length === 0) {
            return null;
        }

        return (
            <Box sx={{ mb: 2 }}>
                <Typography
                    variant="subtitle2"
                    sx={{
                        fontWeight: "bold",
                        fontSize: getTextSize(contentTextSize),
                        mb: 1,
                        color: "primary.main"
                    }}
                >
                    檢驗結果
                </Typography>
                <Box sx={{ pl: 1 }}>
                    {actualData.result_data.map((item, index) => (
                        <Typography
                            key={index}
                            variant="body2"
                            sx={{
                                fontSize: getTextSize(contentTextSize),
                                mb: 0.5
                            }}
                        >
                            {item.assay_item_name}: {item.assay_value}
                            <Typography
                                component="span"
                                variant="body2"
                                color="text.secondary"
                                sx={{ fontSize: getTextSize(contentTextSize) }}
                            >
                                {' '}({item.real_inspect_date})
                            </Typography>
                        </Typography>
                    ))}
                </Box>
            </Box>
        );
    };

    // Render medications in simplified format
    const renderMedicationsTable = () => {
        const actualData = getActualData();
        if (!actualData || !actualData.med_data || actualData.med_data.length === 0) {
            return null;
        }

        return (
            <Box>
                <Typography
                    variant="subtitle2"
                    sx={{
                        fontWeight: "bold",
                        fontSize: getTextSize(contentTextSize),
                        mb: 1,
                        color: "primary.main"
                    }}
                >
                    治療藥物
                </Typography>
                <Box sx={{ pl: 1 }}>
                    {actualData.med_data.map((item, index) => (
                        <Typography
                            key={index}
                            variant="body2"
                            sx={{
                                fontSize: getTextSize(contentTextSize),
                                mb: 0.5
                            }}
                        >
                            {item.drug_ing_name}
                            <Typography
                                component="span"
                                variant="body2"
                                color="text.secondary"
                                sx={{ fontSize: getTextSize(contentTextSize) }}
                            >
                                {' '}({item.func_date} {stripHtml(item.hosp)})
                            </Typography>
                        </Typography>
                    ))}
                </Box>
            </Box>
        );
    };
    return (
        <Paper
            elevation={1}
            sx={{
                p: 1.5,
                mb: 2,
                height: "auto",
                minHeight: hasData() ? "inherit" : "auto",
                overflow: "hidden",
            }}
        >
            <Box sx={{ display: "flex", alignItems: "center", mb: hasData() ? 1 : 0 }}>
                <VaccinesIcon
                    sx={{ mr: 1, color: "primary.main", fontSize: "1.5rem" }}
                />
                <Typography
                    variant="subtitle1"
                    sx={{
                        fontWeight: "bold",
                        fontSize: getTextSize(titleTextSize),
                    }}
                >
                    B、C肝炎專區
                </Typography>
            </Box>

            {hasData() ? (
                <Box sx={{ pl: 1 }}>
                    {renderResultsTable()}
                    {renderMedicationsTable()}
                </Box>
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

export default Overview_hbcvdata;
