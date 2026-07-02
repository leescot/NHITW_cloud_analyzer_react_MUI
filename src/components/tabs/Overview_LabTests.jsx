import React, { useState, useEffect, useMemo } from "react";
import {
  Box,
  Typography,
  Paper,
  Grid,
  Chip,
  Divider,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
  IconButton
} from "@mui/material";
import { styled } from '@mui/material/styles';
import PrintIcon from '@mui/icons-material/Print';
import { formatDate, formatDateShort, isWithinLast90Days } from './Overview_utils';
import { FALLBACK_LAB_TESTS, SPECIAL_LAB_CODES } from '../settings/OverviewSettings';
import TypographySizeWrapper from "../utils/TypographySizeWrapper";
import LabItemTrendPopover from "./lab/LabItemTrendPopover";
import { CKM_LAB_ITEMS, CKM_SPECIAL_LAB_CODES, classifyLabItem } from "../../utils/ckmUtils";
import { buildNephroReport, renderNephroReportHTML, attachNephroReportHandlers } from "../../utils/nephroReportBuilder";

const Overview_LabTests = ({
  groupedLabs = [],
  labData,
  overviewSettings = {},
  generalDisplaySettings,
  labSettings = { highlightAbnormalLab: true },
  enableCKM = false,
  userInfo = null
}) => {
  // CKM 開啟時追蹤天數擴展為 180 天（取設定值與 180 的較大值）
  const baseTrackingDays = overviewSettings.labTrackingDays || 90;
  const trackingDays = enableCKM ? Math.max(baseTrackingDays, 180) : baseTrackingDays;

  // Helper function to check if date is within last N days
  function isWithinLastNDays(dateStr, days) {
    if (!dateStr) return false;
    const date = new Date(dateStr);
    const now = new Date();
    const timeThreshold = now.getTime() - days * 24 * 60 * 60 * 1000;
    return date.getTime() >= timeThreshold;
  }

  // Check if we need to use an alternative lab data source
  const effectiveLabData = useMemo(() => {
    if (groupedLabs && groupedLabs.length > 0) {
      // console.log("Debug - Using groupedLabs");
      return groupedLabs;
    } else if (labData && typeof labData === 'object') {
      // console.log("Debug - Using alternative labData source");
      // Try to convert alternative source to compatible format if needed
      if (Array.isArray(labData)) {
        return labData;
      } else if (labData.rObject && Array.isArray(labData.rObject)) {
        // Try to process raw lab data
        // console.log("Debug - Converting raw lab data format");
        // Return empty array for now, this would need implementation of lab processor
        return [];
      }
    }
    // console.log("Debug - No usable lab data source found");
    return [];
  }, [groupedLabs, labData]);

  // 腎臟報告：開新分頁顯示可列印的腎臟檢驗報告（沿用 CKM Tab 行為）
  const handleOpenNephroReport = () => {
    const report = buildNephroReport(effectiveLabData, userInfo);
    if (!report) { alert('無腎臟相關檢驗資料'); return; }
    const html = renderNephroReportHTML(report);
    const win = window.open('', '_blank');
    if (!win) { alert('彈出視窗被封鎖，請允許後再試'); return; }
    win.document.write(html);
    win.document.close();
    attachNephroReportHandlers(win, report.dates.length);
  };

  // 獲取狀態顏色
  const getStatusColor = (test, highlightAbnormal = true) => {
    if (!test || !highlightAbnormal) return "inherit";

    if (test.valueStatus === "high") return "#f44336"; // 紅色
    if (test.valueStatus === "low") return "#3d8c40";  // 綠色

    // 向後兼容：如果沒有 valueStatus 但有 isAbnormal
    if (test.valueStatus === undefined && test.isAbnormal) return "#f44336";

    return "inherit"; // 正常值
  };

  // 獲取背景顏色
  const getStatusBackgroundColor = (test, highlightAbnormal = true) => {
    if (!test || !highlightAbnormal) return "inherit";

    if (test.valueStatus === "high") return "rgba(244, 67, 54, 0.05)"; // 淡紅色背景
    if (test.valueStatus === "low") return "rgba(76, 175, 80, 0.05)";  // 淡綠色背景

    // 向後兼容：如果沒有 valueStatus 但有 isAbnormal
    if (test.valueStatus === undefined && test.isAbnormal) return "rgba(244, 67, 54, 0.05)";

    return "inherit"; // 正常背景
  };

  return (
    <Paper sx={{ p: 2, height: "auto" }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <TypographySizeWrapper variant="h6" gutterBottom generalDisplaySettings={generalDisplaySettings}>
          關注檢驗 - {trackingDays} 天內
        </TypographySizeWrapper>
        {enableCKM && generalDisplaySettings?.enableNephroReport && (
          <Tooltip title="開新分頁顯示腎臟檢驗報告（可列印）">
            <IconButton size="small" sx={{ color: '#1565c0' }} onClick={handleOpenNephroReport}>
              <PrintIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        )}
      </Box>
      {/* <TypographySizeWrapper variant="caption" color="text.secondary" generalDisplaySettings={generalDisplaySettings}>
        至多顯示七組資料
      </TypographySizeWrapper> */}
      {(() => {
        // console.log("Debug - Lab section rendering, data available:",
          // effectiveLabData && effectiveLabData.length > 0);

        if (effectiveLabData && effectiveLabData.length > 0) {
          // Use focusedLabTests from overviewSettings if available, otherwise use default config
          const labTestsConfig = (() => {
            if (overviewSettings.focusedLabTests && Array.isArray(overviewSettings.focusedLabTests)) {
              // Filter only enabled tests and map to the format expected by the component
              return overviewSettings.focusedLabTests
                .filter(test => test.enabled)
                .map(test => {
                  // Special handling for tests with special processing needed
                  const isSpecial = SPECIAL_LAB_CODES.some(code =>
                    test.orderCode === code ||
                    (code.endsWith('-') && test.orderCode.startsWith(code))
                  );

                  return {
                    orderCode: test.orderCode,
                    displayName: isSpecial ? 'Special' : test.displayName
                  };
                });
            } else {
              // Fallback to default config if settings are not available
              return FALLBACK_LAB_TESTS.map(test => ({
                orderCode: test.orderCode,
                displayName: test.displayName
              }));
            }
          })();

          // Create a mapping from orderCode to displayName for easier lookup
          const orderCodeToName = {};
          labTestsConfig.forEach(test => {
            orderCodeToName[test.orderCode] = test.displayName;
          });

          // Get the order codes we're interested in
          const targetOrderCodes = labTestsConfig.map(test => test.orderCode);

          // Create a mapping to handle various codes for CBC (08011C)
          // 使用 Map 來處理各種 CBC 相關的代碼變體
          const cbcVariants = new Map([
            ['08011C', true],      // 標準代碼
            ['08011', true],       // 不帶 'C' 的版本
            ['08011c', true],      // 小寫 'c' 的版本
            ['08011C-WBC', true],  // 我們特定的 WBC 代碼
            ['08011C-Hb', true],   // 我們特定的 Hb 代碼
            ['08011C-Platelet', true]  // 我們特定的血小板代碼
          ]);

          // 幫助函數來檢查代碼是否與 CBC 相關
          const isCBCCode = (code) => {
            if (!code) return false;
            return cbcVariants.has(code) || code.startsWith('08011');
          };

          // Filter labs from the last tracking days instead of hardcoded 90
          const recentLabs = effectiveLabData.filter(labGroup =>
            isWithinLastNDays(labGroup.date, trackingDays)
          );

          // DEBUG: Log a sample of the lab data structure to understand available properties
          if (recentLabs.length > 0 && recentLabs[0].labs && recentLabs[0].labs.length > 0) {
            // console.log("Debug - Sample lab structure:", recentLabs[0].labs[0]);

            // Find and log any 08011C labs for debugging
            const sample08011C = recentLabs.flatMap(group =>
              group.labs.filter(lab => lab.orderCode === '08011C')
            );
            if (sample08011C.length > 0) {
              // console.log("Debug - Found 08011C labs:", sample08011C);
            } else {
              // console.log("Debug - No 08011C labs found in data");
            }
          }

          // Find all tests matching our target order codes
          const matchingTests = [];

          // First, try to find any CBC (08011C) related tests specifically
          const cbcItems = targetOrderCodes.filter(code => code.startsWith('08011C-'));
          if (cbcItems.length > 0) {
            // console.log("Debug - Looking for CBC items:", cbcItems);

            // Scan all lab data for CBC-related items
            recentLabs.forEach(labGroup => {
              if (labGroup.labs && Array.isArray(labGroup.labs)) {
                labGroup.labs.forEach(lab => {
                  // Check for any lab that might be CBC-related
                  if (isCBCCode(lab.orderCode) ||
                      (lab.itemName && (
                        lab.itemName.toLowerCase().includes('cbc') ||
                        lab.itemName.toLowerCase().includes('complete blood count') ||
                        lab.itemName.toLowerCase().includes('血球計數')
                      ))) {

                    // console.log("Debug - Found CBC lab item:", lab);

                    // Process based on the item details using our helper functions
                    processSpecialCBCItem(lab, labGroup.date, targetOrderCodes, matchingTests);
                  }
                });
              }
            });
          }

          // Function to process CBC labs with specialized handling
          function processSpecialCBCItem(lab, date, targetOrderCodes, matchingTests) {
            // 創建一個提取值的輔助函數
            const extractLabValue = (lab) => {
              // 如果有數值和單位，則使用它們
              if (lab.value && lab.unit) {
                // Only return the value without unit as requested
                return lab.value;
              }
              // 否則使用結果字段
              else if (lab.result) {
                return lab.result;
              }
              // 或返回一個空字符串
              return '';
            };

            // 檢查是否包含特定文本的幫助函數，不區分大小寫
            const containsText = (source, targets) => {
              if (!source) return false;

              // 清理並標準化來源文本
              const lowerSource = source.toLowerCase().trim();

              // 使用 some() 方法檢查是否包含任何目標文本
              return targets.some(target => {
                const lowerTarget = target.toLowerCase();
                
                // 使用多種匹配方式：包含、完全匹配、邊界匹配等
                return lowerSource.includes(lowerTarget) || 
                       lowerSource === lowerTarget ||
                       lowerSource.startsWith(lowerTarget + ' ') ||
                       lowerSource.endsWith(' ' + lowerTarget) ||
                       new RegExp(`\\b${lowerTarget}\\b`).test(lowerSource);
              });
            };

            // 使用 Map 建立 CBC 項目類型映射
            const cbcItemTypes = new Map([
              ['WBC', {
                keywords: ['WBC', '白血球'],
                orderCode: '08011C-WBC',
                displayName: 'WBC'
              }],
              ['Hb', {
                keywords: ['Hb', 'HGB', '血色素', 'Hemoglobin'],
                orderCode: '08011C-Hb',
                displayName: 'Hb'
              }],
              ['PLT', {
                keywords: ['PLT', 'Platelet', '血小板'],
                orderCode: '08011C-Platelet',
                displayName: 'PLT'
              }]
            ]);

            // 只處理 CBC 訂單相關項目
            if (lab.orderCode === '08011C' && lab.orderName && lab.orderName.toLowerCase().includes('cbc')) {
              let foundItems = new Map();

              // 如果這個實驗室項目有父子結構（常見於 CBC）
              if (lab.items && Array.isArray(lab.items)) {
                // 遍歷子項目
                for (const item of lab.items) {
                  for (const [type, config] of cbcItemTypes.entries()) {
                    if (containsText(item.itemName, config.keywords)) {
                      foundItems.set(type, {
                        ...item, 
                        orderCode: config.orderCode, 
                        date, 
                        displayName: config.displayName
                      });
                    }
                  }
                }
              } 
              // 如果是直接的實驗室項目（實驗室本身是 WBC、Hb 或 PLT）
              else {
                for (const [type, config] of cbcItemTypes.entries()) {
                  if (containsText(lab.itemName, config.keywords)) {
                    foundItems.set(type, {
                      ...lab, 
                      orderCode: config.orderCode, 
                      date, 
                      displayName: config.displayName
                    });
                  }
                }
              }

              // 添加找到的項目到 matchingTests（如果它們在設置中啟用）
              for (const [type, item] of foundItems.entries()) {
                const orderCode = cbcItemTypes.get(type).orderCode;
                if (targetOrderCodes.includes(orderCode)) {
                  matchingTests.push({
                    ...item,
                    value: extractLabValue(item)
                  });
                }
              }
            }
          }

          // Then continue with the standard approach for other tests
          recentLabs.forEach(labGroup => {
            if (labGroup.labs && Array.isArray(labGroup.labs)) {
              labGroup.labs.forEach(lab => {
                if (targetOrderCodes.includes(lab.orderCode)) {
                  // 使用 Map 為特殊處理的測試類型定義處理邏輯
                  const specialTestHandlers = new Map([
                    ['09015C', () => {
                      // 三分：Cr / eGFR (院所上傳) / eGFR(健保署) (assay_method === "健保署計算")
                      const isNHI = lab.assayMethod === '健保署計算' || lab.abbrName === 'eGFR(健保署)';
                      const isGFR = isNHI || lab.abbrName === 'eGFR' || lab.abbrName === 'eGFR(MDRD)' ||
                                    (lab.itemName && (lab.itemName.includes('GFR') ||
                                                     lab.itemName.includes('腎絲球過濾率') ||
                                                     lab.itemName.includes('Ccr')));
                      let displayName = 'Cr';
                      if (isNHI) displayName = 'eGFR(健保署)';
                      else if (isGFR) displayName = 'eGFR';

                      // 標記是否為 CKD-EPI 新公式（僅用於 "eGFR" 院所紀錄的同日選值優先序；
                      // "eGFR(健保署)" 無此 ranking 需求）
                      const isCKDEPI = isGFR && !isNHI && lab.abbrName !== 'eGFR(MDRD)' &&
                                       !(lab.itemName && lab.itemName.includes('MDRD'));

                      matchingTests.push({
                        ...lab,
                        date: labGroup.date,
                        displayName,
                        _isCKDEPI: isCKDEPI
                      });
                    }],
                    ['09040C', () => {
                      // 根據 abbrName 或 itemName 判斷 - 只顯示 UPCR
                      if (lab.abbrName === 'UPCR' ||
                          (lab.itemName && (lab.itemName.includes('UPCR') ||
                                           lab.itemName.includes('蛋白/肌酸酐比值') ||
                                           lab.itemName.includes('protein/Creatinine')))) {
                        matchingTests.push({
                          ...lab,
                          date: labGroup.date,
                          displayName: 'UPCR'
                        });
                      }
                    }],
                    ['12111C', () => {
                      // 根據 abbrName 或 itemName 判斷 - 只顯示 UACR
                      if (lab.abbrName === 'UACR' ||
                         (lab.itemName && (lab.itemName.toLowerCase().includes('u-acr') ||
                                          lab.itemName.toLowerCase().includes('albumin/creatinine') ||
                                          lab.itemName.toLowerCase().includes('/cre')))) {
                        matchingTests.push({
                          ...lab,
                          date: labGroup.date,
                          displayName: 'UACR'
                        });
                      }
                    }]
                  ]);

                  // 執行特殊處理邏輯或使用默認處理
                  if (specialTestHandlers.has(lab.orderCode)) {
                    specialTestHandlers.get(lab.orderCode)();
                  } else if (isCBCCode(lab.orderCode)) {
                    // CBC 特殊處理邏輯
                    processSpecialCBCItem(lab, labGroup.date, targetOrderCodes, matchingTests);
                  } else {
                    // 標準處理方式
                    matchingTests.push({
                      ...lab,
                      date: labGroup.date,
                      displayName: orderCodeToName[lab.orderCode] || lab.orderName || lab.itemName
                    });
                  }
                }
              });
            }
          });

          // console.log("Debug - Total matching tests found:", matchingTests.length);

          // === CKM 追加項目 ===
          // 使用者 focusedLabTests 未涵蓋（以 orderCode 判斷）的 CKM_LAB_ITEMS 追加到表格底部
          const ckmTests = [];
          let ckmDisplayNames = [];
          if (enableCKM) {
            const enabledCodes = new Set(labTestsConfig.map(t => t.orderCode));
            const extraItems = CKM_LAB_ITEMS.filter(item => !enabledCodes.has(item.orderCode));
            const extraNames = new Set(extraItems.map(i => i.displayName));
            const extraPlainCodes = new Set(extraItems.filter(i => !i.special && i.orderCode !== '08011C-Hb').map(i => i.orderCode));
            const wantHb = extraItems.some(i => i.orderCode === '08011C-Hb');

            recentLabs.forEach(labGroup => {
              if (!labGroup.labs || !Array.isArray(labGroup.labs)) return;
              labGroup.labs.forEach(lab => {
                const code = lab.orderCode;
                if (CKM_SPECIAL_LAB_CODES.includes(code)) {
                  // Cr/eGFR/eGFR(健保署)、UPCR、UACR、Hb、BNP/NT-proBNP 需細分
                  if (code === '08011C' && !wantHb) return;
                  const dn = classifyLabItem(lab);
                  if (!dn || !extraNames.has(dn)) return;
                  ckmTests.push({ ...lab, date: labGroup.date, displayName: dn });
                } else if (extraPlainCodes.has(code)) {
                  const item = extraItems.find(i => i.orderCode === code && !i.special);
                  if (item) ckmTests.push({ ...lab, date: labGroup.date, displayName: item.displayName });
                }
              });
            });

            // 依 CKM_LAB_ITEMS 順序排序追加列
            const ckmOrder = {};
            CKM_LAB_ITEMS.forEach((t, i) => { if (!(t.displayName in ckmOrder)) ckmOrder[t.displayName] = i; });
            ckmDisplayNames = [...new Set(ckmTests.map(t => t.displayName))]
              .sort((a, b) => (ckmOrder[a] ?? 999) - (ckmOrder[b] ?? 999));
          }

          if (matchingTests.length > 0 || ckmTests.length > 0) {
            // Get unique dates from the tests (sorted from newest to oldest)
            // const uniqueDates = [...new Set(matchingTests.map(test => test.date))].sort((a, b) =>
            //   new Date(b) - new Date(a)
            // ).slice(0, 7); // Show at most 5 most recent dates

            const uniqueDates = [...new Set([...matchingTests, ...ckmTests].map(test => test.date))].sort((a, b) =>
              new Date(b) - new Date(a)
            );

            // console.log("Debug - Unique dates for table:", uniqueDates);

            // Create a mapping of tests by test type and date
            const testsByTypeAndDate = {};

            // Get all display names including special handling cases
            const allDisplayNames = [
              ...labTestsConfig.filter(test => test.orderCode !== '09015C' &&
                                              test.orderCode !== '09040C' &&
                                              test.orderCode !== '12111C' &&
                                              !test.orderCode.startsWith('08011C-'))
                .map(test => test.displayName),
              'eGFR', 'eGFR(健保署)', 'Cr', 'UPCR', 'UACR', 'WBC', 'Hb', 'PLT'
            ];

            // Debug the display names being used
            // console.log("Debug - allDisplayNames:", allDisplayNames);

            // Initialize the structure
            allDisplayNames.forEach(displayName => {
              testsByTypeAndDate[displayName] = {};
              uniqueDates.forEach(date => {
                testsByTypeAndDate[displayName][date] = null;
              });
            });

            // CKM 追加列初始化與填值（先到先贏，同名不覆蓋）
            ckmDisplayNames.forEach(displayName => {
              if (!testsByTypeAndDate[displayName]) {
                testsByTypeAndDate[displayName] = {};
                uniqueDates.forEach(date => { testsByTypeAndDate[displayName][date] = null; });
              }
            });
            ckmTests.forEach(test => {
              const slot = testsByTypeAndDate[test.displayName];
              if (slot && uniqueDates.includes(test.date) && slot[test.date] === null) {
                slot[test.date] = test;
              }
            });

            // Fill in the data
            matchingTests.forEach(test => {
              const displayName = test.displayName;
              const date = test.date;

              // Log CBC items specifically to debug
              if (displayName === 'WBC' || displayName === 'Hb' || displayName === 'PLT') {
                // console.log(`Debug - Processing CBC item: ${displayName} for date ${date}`, test);
              }

              // Only process if this test type and date should be shown
              if (testsByTypeAndDate[displayName] && uniqueDates.includes(date)) {
                const existing = testsByTypeAndDate[displayName][date];
                if (existing === null) {
                  testsByTypeAndDate[displayName][date] = test;
                } else if (displayName === 'eGFR' && test._isCKDEPI && !existing._isCKDEPI) {
                  // CKD-EPI 新公式優先於 MDRD 舊公式
                  testsByTypeAndDate[displayName][date] = test;
                } else if (displayName !== 'eGFR' &&
                           test.timestamp && existing.timestamp &&
                           test.timestamp > existing.timestamp) {
                  testsByTypeAndDate[displayName][date] = test;
                }
              } else {
                // console.log(`Debug - Test type not processed: ${displayName} - exists in structure: ${!!testsByTypeAndDate[displayName]}, date valid: ${uniqueDates.includes(date)}`);
              }
            });

            // After all processing, log the final organized data
            // console.log("Debug - testsByTypeAndDate:", testsByTypeAndDate);
            // Specifically check for our CBC tests
            // console.log("Debug - WBC data:", testsByTypeAndDate['WBC']);
            // console.log("Debug - Hb data:", testsByTypeAndDate['Hb']);
            // console.log("Debug - PLT data:", testsByTypeAndDate['PLT']);

            // Filter out test types with no data
            const nonEmptyTestTypes = Object.keys(testsByTypeAndDate).filter(type => {
              return Object.values(testsByTypeAndDate[type]).some(value => value !== null);
            });

            // Create a map to determine the display order based on the user's settings
            const displayOrder = {};

            // Determine the display order based on the user's settings
            if (overviewSettings.focusedLabTests && Array.isArray(overviewSettings.focusedLabTests)) {
              // 創建一個 Map 來存儲順序規則
              const orderCodeToDisplayMap = new Map([
                ['08011C-WBC', 'WBC'],
                ['08011C-Hb', 'Hb'],
                ['08011C-Platelet', 'PLT'],
                ['09015C', ['Cr', 'eGFR', 'eGFR(健保署)']],
                ['09040C', 'UPCR'],
                ['12111C', 'UACR']
              ]);

              // Assign order for all tests based on configuration
              overviewSettings.focusedLabTests
                .filter(test => test.enabled)
                .forEach((test, index) => {
                  const orderCode = test.orderCode;

                  // 處理直接映射的情況
                  if (test.displayName) {
                    displayOrder[test.displayName] = index;
                  }
                  
                  // 處理特殊映射的情況
                  if (orderCodeToDisplayMap.has(orderCode)) {
                    const displayNames = orderCodeToDisplayMap.get(orderCode);
                    
                    if (Array.isArray(displayNames)) {
                      // 處理多個顯示名稱的情況 (例如 09015C -> Cr 及 GFR)
                      displayNames.forEach((name, offset) => {
                        displayOrder[name] = index + (offset * 0.1); // 使用小偏移以保持相關項目在一起
                      });
                    } else {
                      // 處理單個顯示名稱的情況
                      displayOrder[displayNames] = index;
                    }
                  }
                });
            }

            // CKM 追加列獨立呈現在底部：以使用者啟用的 orderCode 推導出主列表名稱，
            // 只有「使用者未涵蓋」的 CKM 名稱才進入底部 CKM 區
            const userEnabledNames = new Set();
            {
              const specialNameMap = new Map([
                ['08011C-WBC', ['WBC']],
                ['08011C-Hb', ['Hb']],
                ['08011C-Platelet', ['PLT']],
                ['09015C', ['Cr', 'eGFR', 'eGFR(健保署)']],
                ['09040C', ['UPCR']],
                ['12111C', ['UACR']]
              ]);
              labTestsConfig.forEach(test => {
                if (specialNameMap.has(test.orderCode)) {
                  specialNameMap.get(test.orderCode).forEach(n => userEnabledNames.add(n));
                } else {
                  userEnabledNames.add(test.displayName);
                }
              });
            }
            const ckmRowNames = ckmDisplayNames.filter(n =>
              nonEmptyTestTypes.includes(n) && !userEnabledNames.has(n)
            );
            const mainTestTypes = nonEmptyTestTypes.filter(n => !ckmRowNames.includes(n));

            // Sort test types based on user settings order, or alphabetically if no order defined
            const sortedTestTypes = mainTestTypes.sort((a, b) => {
              // If both types have a defined order, use that
              if (displayOrder[a] !== undefined && displayOrder[b] !== undefined) {
                return displayOrder[a] - displayOrder[b];
              }
              // If only one has a defined order, prioritize it
              else if (displayOrder[a] !== undefined) {
                return -1;
              }
              else if (displayOrder[b] !== undefined) {
                return 1;
              }
              // Otherwise, sort alphabetically
              return a.localeCompare(b);
            });

            // Build trendItems from ALL effectiveLabData (not just tracking period)
            const trendItems = {};
            const trendDateSet = new Set();
            [...matchingTests, ...ckmTests].forEach(test => {
              const dateKey = `${test.date}_`;
              trendDateSet.add(JSON.stringify({ date: test.date, hosp: '' }));
              if (!trendItems[test.displayName]) trendItems[test.displayName] = { displayName: test.displayName, values: {} };
              if (!trendItems[test.displayName].values[dateKey]) {
                trendItems[test.displayName].values[dateKey] = {
                  value: test.value || test.result || '',
                  unit: test.unit || '',
                  referenceMin: test.referenceMin != null ? test.referenceMin : null,
                  referenceMax: test.referenceMax != null ? test.referenceMax : null,
                };
              }
            });
            // Also add data from outside the tracking period for trend charts
            effectiveLabData.forEach(labGroup => {
              if (!labGroup.labs || isWithinLastNDays(labGroup.date, trackingDays)) return;
              labGroup.labs.forEach(lab => {
                if (!targetOrderCodes.includes(lab.orderCode) && !isCBCCode(lab.orderCode)) return;
                let dn = null;
                // Classify lab item for trend data
                const existing = Object.keys(trendItems);
                if (lab.orderCode === '09015C') {
                  const isNHI = lab.assayMethod === '健保署計算' || lab.abbrName === 'eGFR(健保署)';
                  const isGFR = isNHI || lab.abbrName === 'eGFR' || lab.abbrName === 'eGFR(MDRD)' || (lab.itemName && (lab.itemName.includes('GFR') || lab.itemName.includes('腎絲球過濾率') || lab.itemName.includes('Ccr')));
                  if (isNHI) dn = 'eGFR(健保署)';
                  else if (isGFR) dn = 'eGFR';
                  else dn = 'Cr';
                } else if (lab.orderCode === '09040C') {
                  if (lab.abbrName === 'UPCR' || (lab.itemName && (lab.itemName.includes('UPCR') || lab.itemName.includes('蛋白/肌酸酐') || lab.itemName.includes('protein/Creatinine')))) dn = 'UPCR';
                } else if (lab.orderCode === '12111C') {
                  if (lab.abbrName === 'UACR' || (lab.itemName && (lab.itemName.toLowerCase().includes('u-acr') || lab.itemName.toLowerCase().includes('albumin/creatinine') || lab.itemName.toLowerCase().includes('/cre')))) dn = 'UACR';
                } else if (isCBCCode(lab.orderCode)) {
                  const n = ((lab.itemName||'') + ' ' + (lab.abbrName||'')).toLowerCase();
                  if (/\bwbc\b|白血球/.test(n)) dn = 'WBC';
                  else if (/\bhb\b|hemoglobin|血色素/.test(n)) dn = 'Hb';
                  else if (/platelet|plt|血小板/.test(n)) dn = 'PLT';
                } else {
                  dn = orderCodeToName[lab.orderCode];
                }
                if (!dn || !trendItems[dn]) return;
                const dateKey = `${labGroup.date}_`;
                trendDateSet.add(JSON.stringify({ date: labGroup.date, hosp: '' }));
                if (!trendItems[dn].values[dateKey]) {
                  trendItems[dn].values[dateKey] = {
                    value: lab.value || lab.result || '',
                    unit: lab.unit || '',
                    referenceMin: lab.referenceMin != null ? lab.referenceMin : null,
                    referenceMax: lab.referenceMax != null ? lab.referenceMax : null,
                  };
                }
              });
            });
            const trendDates = [...trendDateSet].map(s => JSON.parse(s)).sort((a, b) => new Date(b.date) - new Date(a.date));

            // Return the final table component
            return (
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell
                        sx={{
                          position: 'sticky',
                          left: 0,
                          backgroundColor: 'background.paper',
                          zIndex: 1
                        }}
                      >
                        項目
                      </TableCell>
                      {uniqueDates.map(date => (
                        <TableCell key={date} align="right" sx={{ py: 0.1, px: 1 }} >
                          {formatDateShort(date)}
                        </TableCell>
                      ))}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {sortedTestTypes.map(displayName => (
                      <TableRow key={displayName}>
                        <TableCell
                          component="th"
                          scope="row"
                          sx={{
                            py: 0.1,
                            px: 1,
                            position: 'sticky',
                            left: 0,
                            backgroundColor: 'background.paper',
                            zIndex: 1
                          }}
                        >
                          {(() => {
                            const ti = trendItems[displayName];
                            const numericCount = ti ? Object.values(ti.values).filter(v => v && !isNaN(parseFloat(v.value))).length : 0;
                            if (numericCount >= 2) {
                              return (
                                <LabItemTrendPopover item={ti} dates={trendDates}>
                                  <TypographySizeWrapper variant="body2" generalDisplaySettings={generalDisplaySettings} sx={{ textDecoration: 'underline dotted', textDecorationColor: '#bdbdbd', cursor: 'pointer' }}>
                                    {displayName}
                                  </TypographySizeWrapper>
                                </LabItemTrendPopover>
                              );
                            }
                            return <TypographySizeWrapper variant="body2" generalDisplaySettings={generalDisplaySettings}>{displayName}</TypographySizeWrapper>;
                          })()}
                        </TableCell>
                        {uniqueDates.map(date => {
                          const test = testsByTypeAndDate[displayName][date];
                          // Define cell styles with correct labSettings reference
                          const cellStyles = {
                            backgroundColor: test ? getStatusBackgroundColor(test, labSettings.highlightAbnormal) : 'inherit',
                            color: test ? getStatusColor(test, labSettings.highlightAbnormal) : 'inherit',
                            py: 0.1, px: 1 // Add reduced padding to all cells
                          };

                          return (
                            <TableCell
                              key={date}
                              align="right"
                              sx={cellStyles}
                            >
                              <TypographySizeWrapper variant="body2" generalDisplaySettings={generalDisplaySettings}>
                                {test ? (
                                  (displayName === 'eGFR' && test.hasMultipleValues && test.valueRange)
                                    ? (() => {
                                        const min = test.valueRange.min;
                                        const max = test.valueRange.max;
                                        const minDec = (min.toString().split('.')[1] || '').length;
                                        const maxDec = (max.toString().split('.')[1] || '').length;
                                        return minDec <= maxDec ? min : max;
                                      })()
                                    : (test.value || test.result || '')
                                ) : <span style={{ color: '#aaaaaa' }}>—</span>}
                              </TypographySizeWrapper>
                            </TableCell>
                          );
                        })}
                      </TableRow>
                    ))}
                    {/* CKM 追加列：細分隔線 + 小標題「CKM」 */}
                    {ckmRowNames.length > 0 && (
                      <TableRow>
                        <TableCell colSpan={uniqueDates.length + 1} sx={{ py: 0.2, px: 1, borderTop: '2px solid #90caf9', bgcolor: '#f5f9ff' }}>
                          <TypographySizeWrapper variant="caption" generalDisplaySettings={generalDisplaySettings} sx={{ fontWeight: 700, color: '#1565c0' }}>
                            CKM
                          </TypographySizeWrapper>
                        </TableCell>
                      </TableRow>
                    )}
                    {ckmRowNames.map(displayName => (
                      <TableRow key={displayName}>
                        <TableCell
                          component="th"
                          scope="row"
                          sx={{ py: 0.1, px: 1, position: 'sticky', left: 0, backgroundColor: 'background.paper', zIndex: 1 }}
                        >
                          {(() => {
                            const ti = trendItems[displayName];
                            const numericCount = ti ? Object.values(ti.values).filter(v => v && !isNaN(parseFloat(v.value))).length : 0;
                            if (numericCount >= 2) {
                              return (
                                <LabItemTrendPopover item={ti} dates={trendDates}>
                                  <TypographySizeWrapper variant="body2" generalDisplaySettings={generalDisplaySettings} sx={{ textDecoration: 'underline dotted', textDecorationColor: '#bdbdbd', cursor: 'pointer' }}>
                                    {displayName}
                                  </TypographySizeWrapper>
                                </LabItemTrendPopover>
                              );
                            }
                            return <TypographySizeWrapper variant="body2" generalDisplaySettings={generalDisplaySettings}>{displayName}</TypographySizeWrapper>;
                          })()}
                        </TableCell>
                        {uniqueDates.map(date => {
                          const test = testsByTypeAndDate[displayName][date];
                          const cellStyles = {
                            backgroundColor: test ? getStatusBackgroundColor(test, labSettings.highlightAbnormal) : 'inherit',
                            color: test ? getStatusColor(test, labSettings.highlightAbnormal) : 'inherit',
                            py: 0.1, px: 1
                          };
                          return (
                            <TableCell key={date} align="right" sx={cellStyles}>
                              <TypographySizeWrapper variant="body2" generalDisplaySettings={generalDisplaySettings}>
                                {test ? (test.value || test.result || '') : <span style={{ color: '#aaaaaa' }}>—</span>}
                              </TypographySizeWrapper>
                            </TableCell>
                          );
                        })}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            );
          }
        }

        return <Typography color="text.secondary">暫無資料</Typography>;
      })()}
    </Paper>
  );
};

export default Overview_LabTests;