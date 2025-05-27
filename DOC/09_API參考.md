# 健保雲端資料擷取器 2.0 API 參考

## 概述

本文件提供健保雲端資料擷取器 2.0 內部 API 與函式庫的詳細說明。這些 API 主要用於擴充功能內部元件間的通訊與資料處理。

## 資料管理 API

### dataManager.js

位置：`/src/utils/dataManager.js`

主要職責：中央資料管理，提供統一的資料存取介面。

#### 核心函式

```javascript
// 處理原始資料
processData(dataType, rawData)

// 儲存處理後的資料
storeProcessedData(dataType, data)

// 擷取特定類型的資料
getDataByType(dataType)

// 清除所有資料
clearAllData()

// 檢查資料是否已載入
isDataLoaded(dataType)

// 擷取資料載入狀態
getDataLoadingStatus(dataType)
```

#### 使用範例

```javascript
import { processData, getDataByType } from '../utils/dataManager';

// 處理並儲存資料
const rawData = fetchDataFromPage();
processData('medication', rawData);

// 取得處理後的資料
const medications = getDataByType('medication');
```

## 設定管理 API

### settingsManager.js

位置：`/src/utils/settingsManager.js`

主要職責：管理使用者設定，提供設定的讀取、儲存與應用功能。

#### 核心函式

```javascript
// 擷取所有設定
getAllSettings()

// 擷取特定類別的設定
getSettingsByCategory(category)

// 擷取特定設定項
getSetting(category, key)

// 更新設定
updateSetting(category, key, value)

// 保存設定到 Chrome 儲存
saveSettings()

// 從 Chrome 儲存載入設定
loadSettings()

// 重設設定為預設值
resetToDefault()
```

#### 使用範例

```javascript
import { getSetting, updateSetting } from '../utils/settingsManager';

// 擷取設定
const textSize = getSetting('generalDisplay', 'contentTextSize');

// 更新設定
updateSetting('generalDisplay', 'contentTextSize', 'large');
```

## 資料處理 APIs

### medicationProcessor.js

位置：`/src/utils/medicationProcessor.js`

功能：處理西藥處方資料。

#### 核心函式

```javascript
// 處理原始藥物資料
processMedicationData(rawData)

// 簡化藥物名稱
simplifyMedicationName(name)

// 藥物分類
categorizeMedication(medication)

// 格式化藥物資訊以供複製
formatMedicationForCopy(medication, format)
```

### labProcessor.js

位置：`/src/utils/labProcessor.js`

功能：處理檢驗報告資料。

#### 核心函式

```javascript
// 處理原始檢驗資料
processLabData(rawData)

// 依類別分組檢驗項目
categorizeLabTests(labTests)

// 檢查值是否異常
checkAbnormalValue(value, referenceRange)

// 產生趨勢資料
generateLabTrendData(labTests, testId)
```

### chineseMedProcessor.js

位置：`/src/utils/chineseMedProcessor.js`

功能：處理中藥處方資料。

#### 核心函式

```javascript
// 處理原始中藥資料
processChineseMedData(rawData)

// 提取方劑組成成分
extractHerbalComponents(prescription)

// 格式化中藥資訊以供複製
formatChineseMedForCopy(prescription, format)
```

### imagingProcessor.js

位置：`/src/utils/imagingProcessor.js`

功能：處理影像檢查資料。

#### 核心函式

```javascript
// 處理原始影像資料
processImagingData(rawData)

// 依類型分類影像檢查
categorizeByType(imagingTests)

// 提取報告關鍵發現
extractKeyFindings(report)
```

## 輔助工具 APIs

### textSizeUtils.js

位置：`/src/utils/textSizeUtils.js`

功能：提供文字大小相關的輔助函式。

#### 核心函式

```javascript
// 擷取指定類型的文字大小設定
getTextSize(type)

// 將設定值轉換為實際的 CSS 尺寸
convertSizeToCSS(size)
```

### indicatorUtils.js

位置：`/src/utils/indicatorUtils.js`

功能：提供指標計算與判斷的輔助函式。

#### 核心函式

```javascript
// 計算腎功能指標
calculateKidneyFunction(labData)

// 判斷數值異常程度
determineAbnormalityLevel(value, min, max)
```

## Chrome Extension APIs

健保雲端資料擷取器使用以下 Chrome Extension APIs：

### 儲存 API

用於保存使用者設定與資料。

```javascript
// 保存資料
chrome.storage.local.set({ key: value }, callback);

// 讀取資料
chrome.storage.local.get(['key'], result => {
  console.log(result.key);
});
```

### 訊息通訊 API

用於內容腳本和背景腳本間的通訊。

```javascript
// 發送訊息
chrome.runtime.sendMessage({ action: 'actionName', data: data }, response => {
  console.log(response);
});

// 接收訊息
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'actionName') {
    // 處理訊息
    sendResponse({ status: 'success' });
  }
});
```

### 標籤頁 API

用於管理和操作瀏覽器標籤頁。

```javascript
// 擷取當前標籤頁
chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
  const activeTab = tabs[0];
  // 對標籤頁進行操作
});

// 向標籤頁注入腳本
chrome.scripting.executeScript({
  target: { tabId: tabId },
  files: ['contentScript.js']
});
```

## 內容腳本 API

### contentScript.jsx

位置：`/src/contentScript.jsx`

功能：注入到健保雲端網頁，提供資料擷取與使用者介面注入功能。

#### 核心函式

```javascript
// 擷取頁面資料
extractPageData()

// 注入浮動圖示
injectFloatingIcon()

// 傳送資料到擴充功能
sendDataToExtension(data)
```

## 元件 Props 介面

### 主要元件

#### FloatingIcon

```javascript
props = {
  position: PropTypes.oneOf(['top-right', 'middle-right', 'bottom-right']),
  onClick: PropTypes.func,
  onSettingsClick: PropTypes.func
}
```

#### TabPanel

```javascript
props = {
  children: PropTypes.node,
  value: PropTypes.number,
  index: PropTypes.number
}
```

#### MedicationList

```javascript
props = {
  medications: PropTypes.array,
  settings: PropTypes.object
}
```

#### LabData

```javascript
props = {
  labTests: PropTypes.array,
  settings: PropTypes.object,
  displayMode: PropTypes.string
}
```

## 資料模型

### 藥物資料模型

```javascript
MedicationData = {
  id: String,                     // 唯一識別符
  name: String,                   // 藥物名稱
  genericName: String,            // 學名
  dosage: String,                 // 劑量
  route: String,                  // 用藥途徑
  frequency: String,              // 頻率
  hospital: String,               // 處方醫院
  date: Date,                     // 處方日期
  diagnosis: String,              // 相關診斷
  atcCode: String,                // ATC 藥理分類代碼
  category: String                // 藥物分類
}
```

### 檢驗資料模型

```javascript
LabTest = {
  id: String,                     // 唯一識別符
  name: String,                   // 檢驗名稱
  abbreviation: String,           // 縮寫
  value: Number,                  // 檢驗值
  unit: String,                   // 單位
  referenceRange: {               // 參考範圍
    min: Number,
    max: Number
  },
  date: Date,                     // 檢驗日期
  hospital: String,               // 檢驗醫院
  isAbnormal: Boolean,            // 是否異常
  category: String                // 檢驗類別
}
```

### 影像資料模型

```javascript
ImagingTest = {
  id: String,                     // 唯一識別符
  type: String,                   // 影像類型
  name: String,                   // 檢查名稱
  date: Date,                     // 檢查日期
  hospital: String,               // 檢查醫院
  findings: String,               // 發現
  conclusion: String              // 結論
}
```

## 錯誤處理

健保雲端資料擷取器使用一致的錯誤處理機制：

```javascript
try {
  // 操作代碼
} catch (error) {
  console.error('錯誤類型: ', error.message);
  // 錯誤處理邏輯
}
```

常見錯誤類型:
- 資料擷取錯誤: 網頁結構變更或元素不存在
- 資料處理錯誤: 資料格式不符預期
- 設定存取錯誤: 無法讀取或保存設定

## 最佳實踐

使用這些 API 時的建議:

1. 始終檢查資料是否已成功載入:
```javascript
if (isDataLoaded('medication')) {
  // 使用資料
}
```

2. 處理設定變更後更新 UI:
```javascript
useEffect(() => {
  // 在設定變更後更新元件
}, [settings]);
```

3. 使用非同步/await 處理資料擷取和處理:
```javascript
async function handleDataExtraction() {
  try {
    const rawData = await extractPageData();
    await processData('labTests', rawData);
    // 更新 UI
  } catch (error) {
    // 處理錯誤
  }
}
```
