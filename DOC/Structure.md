# NHI Extractor Chrome Extension 架構文件

本文檔概述了健保雲端資料擷取器 Chrome Extension 的目錄結構與每個檔案的主要功能。

## 目錄結構總覽

```
nhi-extractor-v08/
├── .git/                  # Git 版本控制目錄
├── dist/                  # 打包後的分發文件
├── node_modules/          # npm 依賴套件
├── public/                # 靜態資源資料夾
│   └── manifest.json      # Chrome Extension 設定檔
├── scripts/               # 建置腳本
├── src/                   # 原始碼目錄
│   ├── assets/            # 靜態資源(圖片等)
│   ├── components/        # React 元件
│   ├── config/            # 設定檔
│   └── utils/             # 工具類函式
└── ...配置文件
```

## 核心文件概述

### 根目錄配置文件

- `package.json` - npm 套件配置文件，定義項目依賴與建置腳本
- `vite.config.js` - Vite 打包工具的主要配置
- `vite.extension.config.js` - Chrome Extension 特定的 Vite 配置
- `eslint.config.js` - 代碼質量檢查工具配置
- `index.html` - 應用入口 HTML 文件

### 建置腳本 (/scripts)

- `bundle-content.js` - 將內容腳本打包成單一文件
- `copy-files.js` - 複製必要文件到輸出目錄
- `copy-extension-files.js` - 複製 Chrome Extension 特定文件

### 原始碼目錄 (/src)

#### 主要入口文件

- `main.jsx` - React 應用入口點，渲染主要 App 元件
- `App.jsx` - 主要應用元件，定義路由與整體結構
- `popup.jsx` - Chrome Extension 彈出視窗的入口
- `background.js` - Chrome Extension 背景腳本，處理後台邏輯和事件監聽
- `contentScript.jsx` - 注入到網頁中的內容腳本
- `legacyContent.js` - 舊版內容腳本功能的實現
- `theme.js` - Material UI 主題配置
- `index.css` - 全局 CSS 樣式

#### 元件目錄 (/src/components)

- `FloatingIcon.jsx` - 網頁中顯示的浮動圖標按鈕，提供主要的交互入口點
- `PopupSettings.jsx` - 彈出視窗設定界面，管理擴展設定

##### 指標元件 (/src/components/indicators)
- `StatusIndicator.jsx` - 通用狀態指標元件，用於顯示各類狀態信息
- `KidneyStatusIndicator.jsx` - 腎功能狀態指標，顯示腎功能相關指標數據

##### 標籤頁元件 (/src/components/tabs)
- `TabPanel.jsx` - 通用標籤面板容器元件
- **概覽相關**:
  - `Overview.jsx` - 概覽主頁面元件
  - `Overview_utils.jsx` - 概覽頁面工具函式
  - `Overview_PatientSummary.jsx` - 病患摘要概覽元件
  - `Overview_LabTests.jsx` - 檢驗結果概覽元件
  - `Overview_ImagingTests.jsx` - 影像檢查概覽元件
  - `Overview_ImportantMedications.jsx` - 重要藥物概覽元件
  - `Overview_DischargeRecords.jsx` - 出院記錄概覽元件
  - `Overview_SurgeryRecords.jsx` - 手術記錄概覽元件
  - `Overview_AllergyRecords.jsx` - 過敏記錄概覽元件
- **藥物相關**:
  - `MedicationList.jsx` - 藥物列表顯示元件
  - `MedicationTable.jsx` - 藥物表格顯示元件
  - `MedDaysData.jsx` - 藥物天數計算元件
  - `ChineseMedicine.jsx` - 中醫藥品元件
- **檢驗相關**:
  - `LabData.jsx` - 檢驗報告數據主元件
  - `LabTableView.jsx` - 檢驗數據表格視圖
- **其他數據相關**:
  - `ImagingData.jsx` - 影像檢查數據元件
  - `AllergyData.jsx` - 過敏資料元件
  - `DischargeData.jsx` - 出院資料元件
  - `SurgeryData.jsx` - 手術資料元件

##### 設定元件 (/src/components/settings)
- `GeneralDisplaySettings.jsx` - 一般顯示設定，控制整體界面外觀
- `OverviewSettings.jsx` - 概覽頁面設定，管理概覽顯示內容和順序
- `MedicationSettings.jsx` - 藥物顯示設定，控制藥物數據的顯示方式
- `LabSettings.jsx` - 檢驗報告設定，管理檢驗數據的過濾與顯示
- `ChineseMedicationSettings.jsx` - 中醫用藥設定，控制中醫藥物的顯示偏好
- `DataStatusTab.jsx` - 數據狀態標籤頁，顯示數據載入和處理狀態

##### 元件輔助工具 (/src/components/utils)
- `TypographySizeWrapper.jsx` - 文字大小包裝元件，提供統一的文字大小調整功能

#### 工具類 (/src/utils)

- `settingsManager.js` - 管理使用者設定
- `dataManager.js` - 資料管理與處理
- `indicatorUtils.js` - 指標工具函式
- `textSizeUtils.js` - 文字大小調整工具
- `medicationProcessor.js` - 藥物資料處理
- `imagingProcessor.js` - 影像報告處理
- `chineseMedProcessor.js` - 中醫資料處理
- `labProcessor.js` - 檢驗報告處理主入口
- `/labProcessorModules` - 檢驗報告處理模組
- `dischargeProcessor.js` - 出院資料處理
- `patientSummaryProcessor.js` - 病患摘要資料處理
- `settingsHelper.js` - 設定輔助函式
- `allergyProcessor.js` - 過敏資料處理
- `dashboardProcessor.js` - 儀表板資料處理
- `medDaysProcessor.js` - 藥物天數計算處理
- `surgeryProcessor.js` - 手術資料處理

#### 配置目錄 (/src/config)

- `defaultSettings.js` - 默認設定配置
- `imageTests.js` - 影像檢查型別配置
- `labTests.js` - 實驗室檢查型別配置
- `medicationGroups.js` - 藥物分組配置

### 公共資源目錄 (/public)

- `manifest.json` - Chrome Extension 配置檔，定義權限、腳本入口等

## 技術架構說明

本項目使用 React 作為前端框架，通過 Vite 進行打包，建置成 Chrome Extension。

### 核心功能模組

1. **設定管理系統** - 通過 `settingsManager.js` 管理使用者設定，存儲於 Chrome Storage
2. **數據處理器** - 各種專門的處理器模組處理健保雲端資料的不同部分
3. **UI界面** - 浮動圖標、設定面板和各種指標元件
4. **背景處理服務** - 處理頁面間通訊和資料暫存

### 工作流程

1. `background.js` 在瀏覽器啟動時載入，處理擴展的全局事件
2. `contentScript.jsx` 在使用者訪問指定頁面時注入
3. 注入後，將渲染 `FloatingIcon` 浮動圖標，提供使用者介面
4. 使用者操作觸發數據處理流程，由各 Processor 模組提取和處理資料
5. 處理後的資料透過 `dataManager` 進行管理和展示

## 主要依賴庫

- React - UI 框架
- Material UI - UI 元件庫
- Chrome Extension API - 瀏覽器擴展功能
