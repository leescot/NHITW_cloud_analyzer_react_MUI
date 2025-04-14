# 如何取用 NHITW 健保雲端系統資料擷取擴充功能儲存的資料

本文件說明如何從其他 Chrome 擴充功能存取由 NHITW 健保雲端系統資料擷取擴充功能所儲存的資料。

## 資料儲存概述

NHITW 健保雲端系統資料擷取擴充功能通過 `saveDataToLocalStorage()` 函數將擷取的健保雲端資料儲存到瀏覽器的 `localStorage` 中。這使得其他擴充功能可以讀取這些資料，不需要重新擷取。

## 資料儲存格式

資料以 JSON 格式存儲在 `localStorage` 中，鍵名為 `NHITW_DATA`。儲存的資料結構如下：

```javascript
{
  "timestamp": 1619460723445,  // 資料儲存時間戳 (毫秒)
  "medication": { ... },       // 西醫用藥資料
  "lab": { ... },              // 檢驗資料 (注意: 對應的資料類型是 "labdata")
  "chinesemed": { ... },       // 中醫用藥資料
  "imaging": { ... },          // 醫療影像資料
  "allergy": { ... },          // 過敏資料
  "surgery": { ... },          // 手術記錄
  "discharge": { ... },        // 出院病摘
  "medDays": { ... },          // 藥品餘藥
  "patientsummary": { ... },   // 病患摘要
  "masterMenu": { ... },       // 主選單資料
  "adultHealthCheck": { ... }, // 成人預防保健資料
  "cancerScreening": { ... }   // 四癌篩檢結果資料
}
```

每種資料類型的值都包含 `rObject` 屬性，這是一個包含實際記錄的陣列。

## 如何存取資料

### 方法一：直接從 localStorage 讀取

```javascript
// 在您的 Chrome 擴充功能中讀取資料
function readNHITWData() {
  try {
    const dataString = localStorage.getItem('NHITW_DATA');
    if (!dataString) {
      console.log('找不到 NHITW 資料');
      return null;
    }
    
    const data = JSON.parse(dataString);
    console.log('成功讀取 NHITW 資料，時間戳：', new Date(data.timestamp).toLocaleString());
    return data;
  } catch (error) {
    console.error('讀取 NHITW 資料時發生錯誤:', error);
    return null;
  }
}
```

### 方法二：監聽儲存事件

您可以監聽 `storage` 事件，在資料更新時獲得通知：

```javascript
// 在您的 Chrome 擴充功能的 content script 中監聽資料更新
window.addEventListener('storage', function(e) {
  // 檢查是否為相關資料更新
  if (e.key === 'NHITW_DATA') {
    const data = JSON.parse(e.newValue);
    console.log('NHITW 資料已更新，時間戳：', new Date(data.timestamp).toLocaleString());
    // 處理新資料...
  }
});
```

## 資料範例與使用案例

### 範例：取得病患的所有藥物資料

```javascript
function getPatientMedications() {
  const nhitwData = readNHITWData();
  if (!nhitwData || !nhitwData.medication || !nhitwData.medication.rObject) {
    return [];
  }
  
  return nhitwData.medication.rObject;
}
```

### 範例：檢查資料是否過期

```javascript
function isDataFresh(maxAgeInMinutes = 30) {
  const nhitwData = readNHITWData();
  if (!nhitwData || !nhitwData.timestamp) {
    return false;
  }
  
  const dataAge = Date.now() - nhitwData.timestamp;
  const maxAgeInMs = maxAgeInMinutes * 60 * 1000;
  
  return dataAge <= maxAgeInMs;
}
```

## 資料結構詳細說明

每種資料類型的數據結構略有不同，但都遵循以下基本模式：

```javascript
{
  "rObject": [
    // 一個包含實際記錄的陣列
    { ... },  // 記錄 1
    { ... },  // 記錄 2
    // ...更多記錄
  ],
  "originalData": {
    // 原始 API 回應，包含額外的元數據
  }
}
```

## 注意事項

1. **資料保存時間**：資料只會暫時保存在 `localStorage` 中，當使用者關閉或重新整理頁面時可能會被清除。

2. **資料大小限制**：`localStorage` 通常有 5-10MB 的大小限制，請考慮這一點。

3. **隱私與安全性**：這些資料可能包含敏感的個人健康資訊，請遵循相關的隱私法規和安全實踐。

4. **相容性**：請確保您的擴充功能與 NHITW 健保雲端系統資料擷取擴充功能的版本相容。

5. **錯誤處理**：始終使用 try-catch 處理可能的解析錯誤，並為資料不存在的情況提供回退方案。

## 疑難排解

### 找不到資料
- 確認 NHITW 健保雲端系統資料擷取擴充功能已正確安裝並啟用
- 確認使用者已瀏覽過健保雲端系統的相關頁面
- 資料可能尚未擷取完成，請稍後再試

### 資料解析錯誤
- 確認 NHITW 健保雲端系統資料擷取擴充功能的版本與您的擴充功能相容
- 檢查 `localStorage` 中儲存的資料是否為有效的 JSON 格式
