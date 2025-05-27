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
  TableRow
} from "@mui/material";
import { styled } from '@mui/material/styles';
import { formatDate, formatDateShort, isWithinLast90Days } from './Overview_utils';
import { FALLBACK_LAB_TESTS, SPECIAL_LAB_CODES } from '../settings/OverviewSettings';
import TypographySizeWrapper from "../utils/TypographySizeWrapper";

const Overview_LabTests = ({ groupedLabs = [], labData, overviewSettings = {}, generalDisplaySettings, labSettings = { highlightAbnormalLab: true } }) => {
  // Get tracking days from overviewSettings, fall back to 90 days if not set
  const trackingDays = overviewSettings.labTrackingDays || 90;

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

  // 擷取狀態顏色
  const getStatusColor = (test, highlightAbnormal = true) => {
    if (!test || !highlightAbnormal) return "inherit";

    if (test.valueStatus === "high") return "#f44336"; // 紅色
    if (test.valueStatus === "low") return "#3d8c40";  // 綠色

    // 向後兼容：如果沒有 valueStatus 但有 isAbnormal
    if (test.valueStatus === undefined && test.isAbnormal) return "#f44336";

    return "inherit"; // 正常值
  };

  // 擷取背景顏色
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
      <TypographySizeWrapper variant="h6" gutterBottom generalDisplaySettings={generalDisplaySettings}>
        關注檢驗 - {trackingDays} 天內
      </TypographySizeWrapper>
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
                      // 使用 abbrName 來判斷是否為 GFR
                      let displayName = 'Cr';  // 默認為 Cr

                      if (lab.abbrName === 'GFR' ||
                          (lab.itemName && (lab.itemName.includes('GFR') ||
                                           lab.itemName.includes('腎絲球過濾率') ||
                                           lab.itemName.includes('Ccr')))) {
                        displayName = 'GFR';
                      }

                      matchingTests.push({
                        ...lab,
                        date: labGroup.date,
                        displayName: displayName
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

          if (matchingTests.length > 0) {
            // Get unique dates from the tests (sorted from newest to oldest)
            // const uniqueDates = [...new Set(matchingTests.map(test => test.date))].sort((a, b) =>
            //   new Date(b) - new Date(a)
            // ).slice(0, 7); // Show at most 5 most recent dates

            const uniqueDates = [...new Set(matchingTests.map(test => test.date))].sort((a, b) =>
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
              'GFR', 'Cr', 'UPCR', 'UACR', 'WBC', 'Hb', 'PLT'
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
                // If we already have a value for this test type and date, keep the newer one
                if (testsByTypeAndDate[displayName][date] === null ||
                    (test.timestamp && testsByTypeAndDate[displayName][date].timestamp &&
                     test.timestamp > testsByTypeAndDate[displayName][date].timestamp)) {
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
                ['09015C', ['Cr', 'GFR']],
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

            // Sort test types based on user settings order, or alphabetically if no order defined
            const sortedTestTypes = nonEmptyTestTypes.sort((a, b) => {
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

            // console.log("Debug - Sorted test types:", sortedTestTypes);

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
                          <TypographySizeWrapper variant="body2" generalDisplaySettings={generalDisplaySettings}>
                            {displayName}
                          </TypographySizeWrapper>
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