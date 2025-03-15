# 健保雲端資料整理器 - 開發者模式與測試指南

本文檔詳細說明如何啟用開發者模式、進行本地數據測試及在本地開發環境中運行應用程序。

## 開發者模式

### 啟用方式

開發者模式是一個隱藏功能，專為開發和測試目的設計：

1. 打開擴展的設置頁面
2. 在頁面底部找到"健保雲端資料整理器"文字
3. **連續點擊 5 次**該文字可啟用開發者模式
4. 成功啟用後會顯示通知"開發者模式已啟用"
5. 頁面頂部會出現新的"開發模式"標籤

### 關閉方式

1. 在開發者模式下，連續點擊底部的"健保雲端資料整理器"文字 **7 次**
2. 系統會顯示"開發者模式已關閉"通知
3. "開發模式"標籤將從頁面中移除

## 開發模式功能

在開發模式標籤中，您可以執行以下操作：

### 本地數據上傳與處理

1. 在"開發模式"標籤中找到文件上傳區域
2. 點擊"選擇文件"或拖放 JSON 文件到上傳區域
3. 上傳後，數據會被存儲在擴展的本地存儲中
4. 頁面會顯示成功消息，包含已加載的數據類型

### 啟動本地開發服務器

1. 運行開發服務器：
   ```bash
   npm run dev
   ```

2. 服務器成功啟動後，打開瀏覽器訪問：
   ```
   http://localhost:5173/test.html
   ```

3. 這個測試頁面提供了一個模擬環境，可開啟 Floating Icon，無需安裝 Chrome 擴展即可測試功能

## 相關文件與功能

開發者模式涉及以下關鍵文件：

### 1. `src/components/PopupSettings.jsx`

**功能說明**：
- 實現開發者模式的啟用和關閉機制
- 通過點擊底部文字觸發開發者模式
- 管理開發者模式狀態並存儲到 Chrome 本地存儲
- 根據開發者模式狀態顯示/隱藏開發者模式標籤

**關鍵代碼**：
```jsx
// 處理底部文字點擊事件
const handleFooterClick = () => {
  // 點擊計數
  const newCount = clickCount + 1;
  setClickCount(newCount);
  
  // 檢查是否達到點擊次數
  if (!developerMode && newCount === 5) {
    // 啟用開發者模式
    setDeveloperMode(true);
    // ...
  } else if (developerMode && newCount === 7) {
    // 關閉開發者模式
    setDeveloperMode(false);
    // ...
  }
}
```

### 2. `src/components/settings/LoadDataTab.jsx`

**功能說明**：
- 提供開發者模式下的資料操作介面
- 允許上傳 JSON 資料檔案並載入到應用程序中
- 支援下載雲端資料到本地
- 顯示已載入的本地資料狀態
- 提供清除本地資料功能

**主要功能**：
- `handleFileChange`: 處理文件選擇
- `handleLoadFile`: 載入本機 JSON 檔案
- `handleDownloadJSON`: 下載當前頁面雲端資料
- `handleClearLocalData`: 清除已加載的本地資料

### 3. `public/test.html`

**功能說明**：
- 提供本地測試環境，無需安裝 Chrome 擴展
- 模擬健保雲端資料頁面的基本結構
- 允許在本地環境測試浮動圖標功能
- 簡化開發過程中的功能測試

### 4. `src/localDataHandler.js`

**功能說明**：
- 處理本地上傳的 JSON 資料檔案
- 將資料存儲到適當的全局變量中
- 觸發資料載入完成事件，通知系統更新
- 提供資料清除功能
- 追蹤本地資料狀態

**主要函數**：
- `processLocalData`: 處理上傳的 JSON 資料
- `clearLocalData`: 清除所有本地資料
- `getLocalDataStatus`: 獲取當前本地資料狀態

## 支援的數據類型與結構

開發者模式支援以下數據類型：

1. **藥物資料** (medication.json)
2. **檢驗資料** (labData.json)
3. **中藥資料** (chineseMed.json)
4. **影像資料** (imaging.json)
5. **過敏資料** (allergy.json)
6. **手術資料** (surgery.json)
7. **出院資料** (discharge.json)
8. **用藥天數** (medDays.json)
9. **病患總結** (patientSummary.json)

### JSON 結構示例

上傳檔案應遵循以下結構格式（以藥物資料為例）：

```json
{
  "medication": [
    {
      "name": "藥品名稱",
      "dose": "劑量",
      "frequency": "頻率",
      "route": "給藥途徑",
      "startDate": "開始日期",
      "endDate": "結束日期"
    }
  ],
  "lab": [
    {
      "testName": "檢驗項目名稱",
      "result": "檢驗結果",
      "normalRange": "正常範圍",
      "date": "檢驗日期"
    }
  ],
  "chinesemed": [
    {
      // 中藥資料結構
    }
  ]
  // 其他資料類型
}
```

## 問題排解

如果遇到以下問題，請嘗試相應的解決方案：

1. **無法啟用開發者模式**
   - 確保在5秒內完成5次點擊
   - 檢查控制台是否有錯誤信息
   
2. **上傳數據後無響應**
   - 檢查JSON文件格式是否正確
   - 檢查瀏覽器控制台中的錯誤信息
   
3. **本地開發服務器無法啟動**
   - 確保已安裝所有依賴 `npm install`
   - 檢查端口 5173 是否被其他應用占用

## 開發技巧

1. 使用開發者工具中的 Network 頁籤監控資料傳輸
2. 在控制台中可直接訪問 `window.lastIntercepted*Data` 變量檢查資料
3. 修改 `localDataHandler.js` 時可新增 console.log 以追蹤數據處理流程
4. 修改後重新啟動開發服務器以套用更改


