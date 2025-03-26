import React from "react";
import { Box, Grid, Paper } from "@mui/material";
import TypographySizeWrapper from "../../utils/TypographySizeWrapper";
import LabItemDisplay from "./LabItemDisplay";

// 按類型分組並分欄顯示
const TypeBasedLayout = ({ 
  labs, 
  groupIndex, 
  selectedLabItems, 
  handleToggleLabItem, 
  generalDisplaySettings,
  labSettings
}) => {
  // 先按類型分組
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
    const uniqueKey = `${labSettings.enableAbbrev ? (lab.abbrName || lab.itemName) : lab.itemName}_${lab.value}`;
    
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
  
  // 檢查是否只有兩種類型的檢驗，並且需要優化空間利用
  const groupKeys = Object.keys(labsByType);
  
  // 渲染類型組
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
  
  // 四個或以上的類型時，優化為三欄佈局: 兩個最大的類型各佔一欄，其餘合併為一欄
  if (groupKeys.length >= 4) {
    // 對類型按項目數量排序
    const sortedGroups = [...groupKeys].sort((a, b) => labsByType[b].length - labsByType[a].length);
    
    // 取出項目數最多的兩個類型
    const largestGroup = sortedGroups[0];
    const secondLargestGroup = sortedGroups[1];
    
    // 其餘類型
    const remainingGroups = sortedGroups.slice(2);
    
    return (
      <Grid container spacing={2}>
        {/* 最大類型組 */}
        <Grid item xs={12} sm={4} key="largest">
          {renderTypeGroup(largestGroup, labsByType[largestGroup])}
        </Grid>
        
        {/* 第二大類型組 */}
        <Grid item xs={12} sm={4} key="second-largest">
          {renderTypeGroup(secondLargestGroup, labsByType[secondLargestGroup])}
        </Grid>
        
        {/* 其餘類型組合併 */}
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
  else if (groupKeys.length === 2) {
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
    
    // 創建優化的佈局組件
    if (largerCount > 2 * smallerCount) {
      // 情況1: 大組比小組的項目數多於兩倍 - 將大組平均分成兩欄
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
    } else if (largerCount < 2 * smallerCount) {
      // 情況2: 大組比小組的項目數少於兩倍 - 大組第一欄的項目數等於小組
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
  }
  
  // 超過兩種類型或其他情況 - 使用預設的顯示方式
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