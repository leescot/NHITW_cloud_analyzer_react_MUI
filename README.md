# 更好的健保雲端 2.0 (NHI Extractor)

這是一個 Chrome 擴充功能，用於從健保雲端資料系統擷取資料。此工具可協助醫療專業人員更有效率地處理健保雲端資料。

## 功能特點

- 從健保雲端資料系統中擷取患者資料
- 實時處理並顯示資料
- 支援資料擷取和解析
- 使用者友善的介面設計

## 系統需求

- [Google Chrome](https://www.google.com/chrome/) 瀏覽器（其他 Chromium 核心的瀏覽器如 [Microsoft Edge](https://www.microsoft.com/edge) 亦可，但介面可能稍有不同）
- 健保雲端資料系統存取權限 (<https://medcloud2.nhi.gov.tw/>)

## 安裝說明

### 安裝說明影片(Youtube): [連結](https://www.youtube.com/watch?v=atu3LXBK6og)

### 從 Chrome 線上應用程式商店安裝

如果電腦可以連上外網，可直接至 [Chrome 線上應用程式商店](https://chromewebstore.google.com/detail/kmhlkhgagjadmoclpjomgodfbdfkifja)下載安裝本擴充功能。

### 使用 Chrome 開發人員模式安裝

1. 至本專案版本庫 Tags => Releases 下載[最新版的壓縮檔](https://github.com/leescot/NHITW_cloud_analyzer_react_MUI/releases/latest)
2. 將下載的壓縮檔解壓縮為資料夾
3. 在 Chrome 瀏覽器中，前往「管理擴充功能」頁面（或造訪網址 `chrome://extensions/`）
4. 在右上角啟用「開發人員模式」
5. 點擊「載入未封裝項目」按鈕
6. 選擇步驟 2 的資料夾（`manifest.json` 等檔案所在的資料夾）
7. 擴充功能應該已成功安裝並顯示在您的擴充功能列表中

### 從專案原始碼編譯安裝

1. 複製或下載此專案的原始碼到您的電腦
2. 開啟終端機，並進入專案目錄
3. 執行以下命令安裝相依套件並建置專案：

   ```
   npm install --omit=dev && npm run build
   ```

4. 比照上一節的步驟 3–7 在瀏覽器安裝，其中在步驟 6 選擇專案中的 `dist` 資料夾

## 使用方法

1. 安裝擴充功能後，前往 [健保雲端資料系統](https://medcloud2.nhi.gov.tw/imu/)
2. 點擊瀏覽器工具列中的擴充功能圖示開始使用
3. 按照界面指示進行操作

## 設定選項與預設值

擴充功能提供多種設定選項，可以根據使用者的需求進行個人化。以下是各類設定及其預設值：

### 一般顯示設定

- **固定顯示總覽頁面**：開啟/關閉 開啟頁面時，固定顯示「總覽」頁面
- **文字大小**
  - 標題文字大小：中 (medium)
  - 內容文字大小：中 (medium)
  - 註釋文字大小：小 (small)
- **浮動圖示位置**：右上 / 右中 / 右下

### 西藥顯示設定

- **簡化藥品名稱**：開啟/關閉 簡化藥物名稱功能
- **顯示學名**：開啟/關閉 關閉 顯示藥品學名 （註釋文字）
- **顯示診斷**：開啟/關閉顯示 ICD10 診斷 （註釋文字）
- **顯示藥理分類 (ATC5)**：開啟/關閉顯示 ATC5 藥品分類名稱 （註釋文字）
- **複製格式**：含用法用量 直式/橫式

### 藥理分類 (ATC5) 設定

- **啟用顏色標記**：開啟/關閉 ATC5 分類標記顏色
- **分類群組** （預設值，可自行新增/刪減/更改內容）
  - NSAID: 非類固醇消炎止痛藥
  - ACEI: 血管張力素轉換酶抑制劑
  - ARB: 血管張力素受體阻斷劑
  - STATIN: 他汀類藥物
  - SGLT2: 鈉-葡萄糖共同運輸蛋白-2 抑制劑
  - GLP1: 胰高血糖素樣肽-1 受體激動劑
- **顏色群組設定**
  - 紅色標記：NSAID （預設值，可自行更改）
  - 橙色標記：ARB, ACEI, STATIN （預設值，可自行更改）
  - 綠色標記：（無預設值）

### 中藥顯示設定

- **顯示診斷**：開啟/關閉 顯示 ICD10 診斷
- **顯示功效名稱**：開啟/關閉 功效名稱
- **複製格式**：含用法用量 直式/橫式

### 檢驗報告設定

- **顯示檢驗單位**：開啟/關閉 顯示檢驗單位 （註釋文字）
- **顯示檢驗參考值**：開啟/關閉 顯示檢驗的參考值 （註釋文字）
- **顯示檢驗縮寫**：開啟/關閉 顯示檢驗名稱縮寫
- **開啟異常值變色**：開啟/關閉 顯示檢驗數值異常變色，高於參考值為紅色，低於參考值為綠色
- **檢驗報告呈現方式**：直式/橫式/兩欄/三欄/依分類 顯示
- **檢驗報告複製格式**：直式/橫式

### 「總覽」頁面設定

- **用藥追蹤天數**：100 天 （預設值，可自行更改）
- **檢驗追蹤天數**：180 天 （預設值，可自行更改）
- **影像追蹤天數**：180 天 （預設值，可自行更改）
- **關注檢驗項目**：預設包含常見檢驗項目 （有固定清單，可自行選定與排序）)
- **關注影像項目**：預設包含常見影像檢查 （有固定清單，可自行選定）

## 貢獻

我們歡迎各種形式的貢獻！如果您想要參與開發，請查看我們的[貢獻指南](CONTRIBUTING.md)。

### 如何貢獻

1. Fork 本專案
2. 創建您的功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交您的修改 (`git commit -m 'feat: add some AmazingFeature'`)
4. Push 到分支 (`git push origin feature/AmazingFeature`)
5. 發起 Pull Request

詳細的貢獻指南請參考 [CONTRIBUTING.md](CONTRIBUTING.md)。

## 授權協議

本專案採用 Apache License 2.0 授權 - 詳見 [LICENSE](LICENSE) 檔案。

```
Copyright 2025-2026 The NHITW Cloud Analyzer Project Authors

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
```

## 貢獻者

感謝所有對本專案做出貢獻的開發者！

完整的貢獻者名單請參考 [AUTHORS](AUTHORS) 檔案。

### 專案維護者

- **leescot** - 專案負責人

### 核心貢獻者

- aszk1415
- Danny Lin
- Hsieh-Ting Lin (林協霆)

## 聯絡方式

如有問題或建議，歡迎透過以下方式聯繫：

- 提交 [GitHub Issue](https://github.com/leescot/NHITW_cloud_analyzer_react_MUI/issues)
- 查看 [GitHub Discussions](https://github.com/leescot/NHITW_cloud_analyzer_react_MUI/discussions)

---

**免責聲明**：本工具僅供醫療專業人員輔助使用，所有醫療決策應基於專業判斷。
