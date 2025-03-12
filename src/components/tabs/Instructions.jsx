import React, { useState, useEffect } from 'react';
import { Box, Typography, Paper, Grid, List, ListItem, ListItemText, Divider } from '@mui/material';
import ReactMarkdown from 'react-markdown';
// import { pin_chrome_extension } from '../../assets/pic_pin_extension.js';

// 直接導入 JSON 文件
import imagesData from '../../assets/instruction_image.json';
// import documentsData from '../../assets/instruction_documents.json';

// 直接使用導入的 JSON 數據
const images = imagesData;

// 文檔數據結構 - 從 JSON 檔案導入
// const documents = documentsData;

// 圖片映射對象 - 所有圖片都集中在這裡管理
// const images = {
//   pin_chrome_extension: pin_chrome_extension,
//   // 添加新圖片時，只需在此處添加映射：
//   // new_image_name: imported_image_variable,
// };

// 文檔數據結構 - 每個文檔都有一個標題、ID 和內容
const documents = [
  {
    id: 'getting-started',
    title: '開始使用',
    content: `# NHI Extractor 使用說明

## 安裝與設定

### 1. 安裝 Chrome 擴充功能

1. 從 Chrome 網上應用店安裝 NHI Extractor
2. 安裝完成後，您會在 Chrome 瀏覽器右上角看到 NHI Extractor 的圖示

### 2. 將擴充功能固定在工具列

為了方便使用，建議將 NHI Extractor 固定在 Chrome 工具列：

1. 點擊 Chrome 右上角的「擴充功能」圖示 (拼圖形狀)
2. 找到 NHI Extractor，點擊旁邊的「釘選」圖示

IMAGE_PLACEHOLDER(image_pin_extension, 如何固定擴充功能)

### 3. 基本設定

1. 點擊 NHI Extractor 圖示，開啟設定面板
2. 在設定頁面中，您可以：
   - 選擇要顯示的藥物資訊
   - 設定檢驗數據的顯示方式
   - 自訂介面外觀`,
  },
  {
    id: 'features',
    title: '功能介紹',
    content: `# 功能介紹

## 使用方法

### 1. 資料擷取

1. 登入健保醫療資訊雲端查詢系統
2. 查詢病患資料
3. 點擊 NHI Extractor 圖示，系統會自動擷取並整理資料

### 2. 資料檢視

擷取完成後，您可以在不同的頁籤中檢視：

- **總覽**：病患基本資訊與重要數據摘要
- **西藥**：西藥處方清單與用藥歷史
- **中藥**：中藥處方清單
- **檢驗**：檢驗結果與趨勢圖
- **影像**：影像檢查報告
- **餘藥**：目前餘藥資訊`,
  },
  {
    id: 'data-export',
    title: '資料匯出',
    content: `# 資料匯出

您可以複製各項資料，方便貼到病歷系統或其他文件中：

1. 在各頁籤中找到您需要的資訊
2. 點擊複製按鈕
3. 將資料貼到您的目標文件中`,
  },
  {
    id: 'faq',
    title: '常見問題',
    content: `# 常見問題

### 無法擷取資料？

- 確認您已登入健保醫療資訊雲端查詢系統
- 確認您已查詢病患資料，且頁面上顯示有資料
- 重新整理頁面後再試一次

### 資料顯示不完整？

- 檢查設定中是否有關閉某些資料類型的顯示
- 確認病患在健保系統中是否有相關資料

### 需要更多協助？

如有任何問題或建議，請聯繫開發團隊。`,
  },
];

const Instructions = ({ generalDisplaySettings }) => {
  // 當前選中的文檔 ID
  const [selectedDocId, setSelectedDocId] = useState(documents[0].id);
  // 處理後的 markdown 內容
  const [processedContent, setProcessedContent] = useState('');

  // 當選中的文檔變化時，處理該文檔的內容
  useEffect(() => {
    const selectedDoc = documents.find(doc => doc.id === selectedDocId);
    if (selectedDoc) {
      // 處理文檔內容
      setProcessedContent(selectedDoc.content);
    }
  }, [selectedDocId]);

  // 處理文檔切換
  const handleDocumentSelect = (docId) => {
    setSelectedDocId(docId);
  };

  // 自訂 markdown 元件的樣式
  const markdownComponents = {
    h1: props => (
      <Typography 
        variant="h4" 
        component="h1" 
        sx={{ 
          mt: 2, 
          mb: 3, 
          fontWeight: 'bold',
          fontSize: generalDisplaySettings && 
                   generalDisplaySettings.titleTextSize || 
                   '1.5rem'
        }} 
        {...props} 
      />
    ),
    h2: props => (
      <Typography 
        variant="h5" 
        component="h2" 
        sx={{ 
          mt: 3, 
          mb: 2, 
          fontWeight: 'bold',
          color: '#1976d2',
          fontSize: generalDisplaySettings && 
                   generalDisplaySettings.titleTextSize && 
                   (parseFloat(generalDisplaySettings.titleTextSize) - 0.2) + 'rem' || 
                   '1.3rem'
        }} 
        {...props} 
      />
    ),
    h3: props => (
      <Typography 
        variant="h6" 
        component="h3" 
        sx={{ 
          mt: 2, 
          mb: 1, 
          fontWeight: 'bold',
          color: '#2196f3',
          fontSize: generalDisplaySettings && 
                   generalDisplaySettings.contentTextSize || 
                   '1.1rem'
        }} 
        {...props} 
      />
    ),
    p: props => (
      <Typography 
        variant="body1" 
        component="p" 
        sx={{ 
          my: 1,
          fontSize: generalDisplaySettings && 
                   generalDisplaySettings.contentTextSize || 
                   '1rem'
        }} 
        {...props} 
      />
    ),
    li: props => (
      <Typography 
        component="li" 
        sx={{ 
          fontSize: generalDisplaySettings && 
                   generalDisplaySettings.contentTextSize || 
                   '1rem'
        }} 
        {...props} 
      />
    ),
    img: props => (
      <Box sx={{ my: 2, textAlign: 'center' }}>
        <img 
          {...props} 
          alt={props.alt || '圖片'} 
          style={{ 
            maxWidth: '100%', 
            height: 'auto', 
            borderRadius: '8px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
          }} 
        />
        <Typography 
          variant="caption" 
          component="figcaption"
          sx={{ 
            mt: 1, 
            color: 'text.secondary',
            fontSize: generalDisplaySettings && 
                     generalDisplaySettings.noteTextSize || 
                     '0.8rem'
          }}
        >
          {props.alt}
        </Typography>
      </Box>
    ),
  };

  // 轉換文檔內容中的圖片標記
  const renderContent = () => {
    // 使用更精確的正則表達式，允許圖片說明包含在括號內
    const parts = processedContent.split(/IMAGE_PLACEHOLDER\(([^)]+)\)/);
    
    return parts.map((part, index) => {
      // 偶數索引為文本內容
      if (index % 2 === 0) {
        return (
          <ReactMarkdown key={`text-${index}`} components={markdownComponents}>
            {part}
          </ReactMarkdown>
        );
      } 
      // 奇數索引為圖片引用
      else {
        // 分割圖片變量名和說明文字（如果有）
        const paramsArray = part.split(',').map(item => item.trim());
        const imgVarName = paramsArray[0];
        // 如果提供了說明，則使用提供的說明，否則使用默認文字
        const captionText = paramsArray.length > 1 ? paramsArray[1] : '說明圖片';
        
        // 從映射對象獲取圖片
        const imgSrc = images[imgVarName];
        
        return imgSrc ? (
          <Box key={`img-${index}`} sx={{ my: 2, textAlign: 'center' }}>
            <img 
              src={imgSrc} 
              alt={captionText} 
              style={{ 
                maxWidth: '100%', 
                height: 'auto', 
                borderRadius: '8px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
              }} 
            />
            <Typography 
              variant="caption" 
              component="figcaption"
              sx={{ 
                mt: 1, 
                color: 'text.secondary',
                fontSize: generalDisplaySettings?.noteTextSize || '0.8rem'
              }}
            >
              {captionText}
            </Typography>
          </Box>
        ) : null;
      }
    });
  };

  return (
    <Paper 
      elevation={0} 
      sx={{ 
        p: 3, 
        backgroundColor: '#f9f9f9',
        borderRadius: '8px',
        height: '100%'
      }}
    >
      <Grid container spacing={3} sx={{ height: '100%' }}>
        {/* 左側導航列表 */}
        <Grid item xs={12} md={3} sx={{ 
          borderRight: { md: '1px solid #e0e0e0' }, 
          pr: { md: 2 },
          height: '100%'
        }}>
          <Typography 
            variant="h6" 
            component="h2" 
            sx={{ 
              mb: 2,
              fontWeight: 'bold',
              color: '#1976d2',
              fontSize: generalDisplaySettings?.titleTextSize || '1.2rem'
            }}
          >
            文件導覽
          </Typography>
          <List component="nav" aria-label="instruction documents">
            {documents.map((doc) => (
              <ListItem 
                button 
                key={doc.id} 
                selected={selectedDocId === doc.id}
                onClick={() => handleDocumentSelect(doc.id)}
                sx={{ 
                  borderRadius: '4px',
                  mb: 0.5,
                  bgcolor: selectedDocId === doc.id ? 'rgba(25, 118, 210, 0.08)' : 'transparent',
                  '&:hover': {
                    bgcolor: 'rgba(25, 118, 210, 0.04)',
                  }
                }}
              >
                <ListItemText 
                  primary={doc.title} 
                  primaryTypographyProps={{
                    sx: { 
                      fontWeight: selectedDocId === doc.id ? 'bold' : 'normal',
                      fontSize: generalDisplaySettings?.contentTextSize || '1rem'
                    }
                  }}
                />
              </ListItem>
            ))}
          </List>
        </Grid>
        
        {/* 右側內容區域 */}
        <Grid item xs={12} md={9} sx={{ height: '100%', overflowY: 'auto' }}>
          <Box sx={{ height: '100%' }}>
            {renderContent()}
          </Box>
        </Grid>
      </Grid>
    </Paper>
  );
};

export default Instructions; 