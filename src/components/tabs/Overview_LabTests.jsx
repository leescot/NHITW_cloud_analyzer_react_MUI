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
          // This helps when the data structure might use different order codes or variations
          const cbcVariants = {
            '08011C': true,      // Standard code
            '08011': true,       // Without the 'C'
            '08011c': true,      // Lowercase 'c'
            '08011C-WBC': true,  // Our specialized code for WBC
            '08011C-Hb': true,   // Our specialized code for Hb
            '08011C-Platelet': true  // Our specialized code for Platelet
          };
          
          // Helper function to check if a code is related to CBC
          const isCBCCode = (code) => {
            if (!code) return false;
            return cbcVariants[code] || code.startsWith('08011');
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
              
              // Clean and normalize the source text
              const lowerSource = source.toLowerCase().trim();
              
              // Standard contains check
              if (targets.some(target => lowerSource.includes(target.toLowerCase()))) {
                return true;
              }
              
              // Word boundary check - for exact word matches (useful for short codes like Hb, PLT)
              return targets.some(target => {
                const lowerTarget = target.toLowerCase();
                // Exact match at word boundaries
                return new RegExp(`\\b${lowerTarget}\\b`).test(lowerSource) ||
                       // Or exact match at beginning or end
                       lowerSource === lowerTarget ||
                       lowerSource.startsWith(lowerTarget + ' ') ||
                       lowerSource.endsWith(' ' + lowerTarget);
              });
            };
            
            // Only process CBC items when we are processing a CBC (08011C) lab order
            // This array will contain all CBC items in this lab group
            const cbcItems = [];
            
            // If we're dealing with a CBC bundle, process all items in the bundle
            if (lab.orderCode === '08011C' && lab.orderName && lab.orderName.toLowerCase().includes('cbc')) {
              // First, try to find the exact WBC, Hb, and Platelet items
              // WBC can be in this lab or in a "differential" lab
              let wbcItem = null;
              let hbItem = null;
              let pltItem = null;
              
              // If this lab has a parent-child structure (common for CBC)
              if (lab.items && Array.isArray(lab.items)) {
                // Look through child items
                for (const item of lab.items) {
                  if (containsText(item.itemName, ['WBC', '白血球'])) {
                    wbcItem = {...item, orderCode: '08011C-WBC', date, displayName: 'WBC'};
                  } else if (containsText(item.itemName, ['Hb', 'HGB', '血色素', '血紅素'])) {
                    hbItem = {...item, orderCode: '08011C-Hb', date, displayName: 'Hb'};
                  } else if (containsText(item.itemName, ['PLT', 'Platelet', '血小板'])) {
                    pltItem = {...item, orderCode: '08011C-Platelet', date, displayName: 'PLT'};
                  }
                }
              } 
              // If it's a direct lab item (the lab itself is the WBC, Hb or PLT)
              else {
                // Check if this lab's itemName matches WBC, Hb, or PLT
                if (containsText(lab.itemName, ['WBC', '白血球'])) {
                  wbcItem = {...lab, orderCode: '08011C-WBC', date, displayName: 'WBC'};
                } else if (containsText(lab.itemName, ['Hb', 'HGB', '血色素', '血紅素'])) {
                  hbItem = {...lab, orderCode: '08011C-Hb', date, displayName: 'Hb'};
                } else if (containsText(lab.itemName, ['PLT', 'Platelet', '血小板'])) {
                  pltItem = {...lab, orderCode: '08011C-Platelet', date, displayName: 'PLT'};
                }
              }
              
              // Add the found items to matchingTests if they're enabled in settings
              if (wbcItem && targetOrderCodes.includes('08011C-WBC')) {
                // console.log("Debug - Adding WBC to matchingTests:", wbcItem);
                matchingTests.push({
                  ...wbcItem,
                  value: extractLabValue(wbcItem)
                });
              }
              
              if (hbItem && targetOrderCodes.includes('08011C-Hb')) {
                // console.log("Debug - Adding Hb to matchingTests:", hbItem);
                matchingTests.push({
                  ...hbItem,
                  value: extractLabValue(hbItem)
                });
              }
              
              if (pltItem && targetOrderCodes.includes('08011C-Platelet')) {
                // console.log("Debug - Adding PLT to matchingTests:", pltItem);
                matchingTests.push({
                  ...pltItem,
                  value: extractLabValue(pltItem)
                });
              }
            }
          }
          
          // Then continue with the standard approach for other tests
          recentLabs.forEach(labGroup => {
            if (labGroup.labs && Array.isArray(labGroup.labs)) {
              labGroup.labs.forEach(lab => {
                if (targetOrderCodes.includes(lab.orderCode)) {
                  // Special handling for 09015C (Cr and GFR)
                  if (lab.orderCode === '09015C') {
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
                  } 
                  // Special handling for 09040C (UPCR)
                  else if (lab.orderCode === '09040C') {
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
                  }
                  // Special handling for 12111C (UACR)
                  else if (lab.orderCode === '12111C') {
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
                  }
                  // Special handling for 08011C (WBC, Hb, Platelet) - now handled separately above
                  else if (isCBCCode(lab.orderCode)) {
                    // Use the specialized function for CBC processing
                    processSpecialCBCItem(lab, labGroup.date, targetOrderCodes, matchingTests);
                  }
                  else {
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
              // Create a mapping from test code to display order
              const orderByCode = {};
              
              // Assign order for regular tests
              overviewSettings.focusedLabTests
                .filter(test => test.enabled)
                .forEach((test, index) => {
                  const orderCode = test.orderCode;
                  
                  // Direct mapping for regular tests
                  if (test.displayName) {
                    displayOrder[test.displayName] = index;
                  }
                  
                  // Special mapping for CBC tests
                  if (orderCode === '08011C-WBC') {
                    displayOrder['WBC'] = index;
                  } else if (orderCode === '08011C-Hb') {
                    displayOrder['Hb'] = index;
                  } else if (orderCode === '08011C-Platelet') {
                    displayOrder['PLT'] = index;
                  } else if (orderCode === '09015C') {
                    // For Cr & GFR, add both display names with the same index
                    displayOrder['Cr'] = index;
                    displayOrder['GFR'] = index + 0.1; // Slight offset to keep them together
                  } else if (orderCode === '09040C') {
                    displayOrder['UPCR'] = index;
                  } else if (orderCode === '12111C') {
                    displayOrder['UACR'] = index;
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