import React from "react";
import { Box, Grid, Paper } from "@mui/material";
import TypographySizeWrapper from "../../utils/TypographySizeWrapper";
import LabItemDisplay from "./LabItemDisplay";

// 按型別分組並分欄顯示
const TypeBasedLayout = ({
  labs,
  groupIndex,
  selectedLabItems,
  handleToggleLabItem,
  generalDisplaySettings,
  labSettings
}) => {
  // 先按型別分組
  const labsByType = {};

  // 去除重複項目的邏輯 - 使用 Map 按照 itemName+value 來追蹤重複項
  const processedLabsByType = {};

  // 用於追蹤索引映射 - 將全局索引映射到原始索引
  const indexMap = new Map();

  labs.forEach((lab, originalIndex) => {
    const type = lab.type || '其他檢驗';

    if (!labsByType[type]) {
      labsByType[type] = [];
      processedLabsByType[type] = new Map();
    }

    // 創建唯一標識 - 使用項目名稱和數值組合
    const uniqueKey = `${labSettings.enableLabAbbrev ? (lab.abbrName || lab.itemName) : lab.itemName}_${lab.value}`;

    // 如果這個組合還沒出現過，添加到結果中
    if (!processedLabsByType[type].has(uniqueKey)) {
      // 保存原始索引到 lab 對象
      const labWithIndex = {...lab, originalIndex};
      labsByType[type].push(labWithIndex);
      processedLabsByType[type].set(uniqueKey, true);

      // 保存映射關係
      indexMap.set(labWithIndex, originalIndex);
    }
  });

  // 檢查是否只有兩種型別的檢驗，並且需要優化空間利用
  const groupKeys = Object.keys(labsByType);

  // 渲染型別組
  const renderTypeGroup = (type, labs, title) => (
    <Paper
      elevation={0}
      sx={{
        p: 1.25,
        mb: 1.5,
        backgroundColor: 'rgba(0, 0, 0, 0.03)',
        borderRadius: 1
      }}
    >
      <TypographySizeWrapper
        variant="subtitle2"
        textSizeType="content"
        generalDisplaySettings={generalDisplaySettings}
        sx={{
          mb: 1,
          fontWeight: 'bold'
        }}
      >
        {title || type}
      </TypographySizeWrapper>
      {labs.map((lab, labIndex) => (
        <Box key={labIndex} sx={{ mb: 0.15 }}>
          <LabItemDisplay
            lab={lab}
            groupIndex={groupIndex}
            labIndex={indexMap.get(lab) || lab.originalIndex || labIndex}
            selectedLabItems={selectedLabItems}
            handleToggleLabItem={handleToggleLabItem}
            generalDisplaySettings={generalDisplaySettings}
            labSettings={labSettings}
          />
        </Box>
      ))}
    </Paper>
  );

  // 使用 Map 來定義不同分組數量的佈局策略
  const layoutStrategies = new Map([
    // 4個或以上的型別 - 三欄佈局
    [
      groupCount => groupCount >= 4,
      () => {
        // 對型別按項目數量排序
        const sortedGroups = [...groupKeys].sort((a, b) => labsByType[b].length - labsByType[a].length);
        
        // 取出項目數最多的兩個型別
        const largestGroup = sortedGroups[0];
        const secondLargestGroup = sortedGroups[1];
        
        // 其餘型別
        const remainingGroups = sortedGroups.slice(2);
        
        return (
          <Grid container spacing={2}>
            {/* 最大型別組 */}
            <Grid item xs={12} sm={4} key="largest">
              {renderTypeGroup(largestGroup, labsByType[largestGroup])}
            </Grid>
            
            {/* 第二大型別組 */}
            <Grid item xs={12} sm={4} key="second-largest">
              {renderTypeGroup(secondLargestGroup, labsByType[secondLargestGroup])}
            </Grid>
            
            {/* 其餘型別組合併 */}
            <Grid item xs={12} sm={4} key="remaining">
              <Box>
                {remainingGroups.map((type, typeIndex) => (
                  <React.Fragment key={typeIndex}>
                    {renderTypeGroup(type, labsByType[type])}
                  </React.Fragment>
                ))}
              </Box>
            </Grid>
          </Grid>
        );
      }
    ],
    // 剛好2種型別的特殊佈局
    [
      groupCount => groupCount === 2,
      () => {
        const group1 = groupKeys[0];
        const group2 = groupKeys[1];
        const group1Count = labsByType[group1].length;
        const group2Count = labsByType[group2].length;
        
        // 確定哪個組更大，哪個更小
        let smallerGroup, largerGroup, smallerCount, largerCount;
        if (group1Count <= group2Count) {
          smallerGroup = group1;
          largerGroup = group2;
          smallerCount = group1Count;
          largerCount = group2Count;
        } else {
          smallerGroup = group2;
          largerGroup = group1;
          smallerCount = group2Count;
          largerCount = group1Count;
        }
        
        // 根據組大小比例選擇不同佈局策略
        const layoutOptions = new Map([
          // 大組比小組的項目數多於兩倍
          [
            () => largerCount > 2 * smallerCount,
            () => {
              const halfLargerCount = Math.ceil(largerCount / 2);
              const firstHalf = labsByType[largerGroup].slice(0, halfLargerCount);
              const secondHalf = labsByType[largerGroup].slice(halfLargerCount);
              
              return (
                <Grid container spacing={2}>
                  {/* 小組區域 */}
                  <Grid item xs={12} sm={4} key="smaller">
                    {renderTypeGroup(smallerGroup, labsByType[smallerGroup])}
                  </Grid>
                  
                  {/* 大組第一欄 */}
                  <Grid item xs={12} sm={4} key="larger-1">
                    {renderTypeGroup(largerGroup, firstHalf, `${largerGroup} (一)`)}
                  </Grid>
                  
                  {/* 大組第二欄 */}
                  <Grid item xs={12} sm={4} key="larger-2">
                    {renderTypeGroup(largerGroup, secondHalf, `${largerGroup} (二)`)}
                  </Grid>
                </Grid>
              );
            }
          ],
          // 大組比小組的項目數少於兩倍
          [
            () => largerCount < 2 * smallerCount,
            () => {
              const firstPart = labsByType[largerGroup].slice(0, smallerCount);
              const secondPart = labsByType[largerGroup].slice(smallerCount);
              
              return (
                <Grid container spacing={2}>
                  {/* 小組區域 */}
                  <Grid item xs={12} sm={4} key="smaller">
                    {renderTypeGroup(smallerGroup, labsByType[smallerGroup])}
                  </Grid>
                  
                  {/* 大組第一欄 */}
                  <Grid item xs={12} sm={4} key="larger-1">
                    {renderTypeGroup(largerGroup, firstPart, `${largerGroup} (一)`)}
                  </Grid>
                  
                  {/* 大組第二欄 */}
                  <Grid item xs={12} sm={4} key="larger-2">
                    {renderTypeGroup(largerGroup, secondPart, `${largerGroup} (二)`)}
                  </Grid>
                </Grid>
              );
            }
          ]
        ]);
        
        // 遍歷佈局選項，找到匹配的佈局
        for (const [condition, renderer] of layoutOptions) {
          if (condition()) {
            return renderer();
          }
        }
        
        // 如果沒有特殊條件匹配，回到默認佈局
        return null;
      }
    ],
    // 默認佈局 - 所有其他情況
    [
      () => true,
      () => (
        <Grid container spacing={2}>
          {Object.entries(labsByType).map(([type, typeLabs], typeIndex) => (
            <Grid item xs={12} sm={6} md={4} key={typeIndex}>
              {renderTypeGroup(type, typeLabs)}
            </Grid>
          ))}
        </Grid>
      )
    ]
  ]);
  
  // 遍歷佈局策略，找到匹配的佈局
  for (const [condition, renderer] of layoutStrategies) {
    if (condition(groupKeys.length)) {
      const layout = renderer();
      if (layout) return layout;
    }
  }
  
  // 以防萬一，提供默認佈局
  return (
    <Grid container spacing={2}>
      {Object.entries(labsByType).map(([type, typeLabs], typeIndex) => (
        <Grid item xs={12} sm={6} md={4} key={typeIndex}>
          {renderTypeGroup(type, typeLabs)}
        </Grid>
      ))}
    </Grid>
  );
};

export default TypeBasedLayout;