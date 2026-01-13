# 貢獻指南 (Contributing Guide)

感謝您對「更好的健保雲端 2.0」專案的興趣！我們歡迎各種形式的貢獻，包括但不限於：

- 回報 Bug
- 提出新功能建議
- 改善文件
- 提交程式碼修正或新功能

## 如何回報問題 (Reporting Issues)

如果您發現 Bug 或有功能建議，請透過 [GitHub Issues](https://github.com/leescot/NHITW_cloud_analyzer_react_MUI/issues) 回報。

### 回報 Bug 時，請提供：

- **詳細的問題描述**：什麼功能出現問題？
- **重現步驟**：如何重現這個問題？
- **預期行為**：您期望看到什麼結果？
- **實際行為**：實際發生了什麼？
- **環境資訊**：
  - 瀏覽器版本（Chrome、Edge 等）
  - 作業系統版本
  - Extension 版本號

### 提出功能建議時，請說明：

- **功能描述**：您希望新增什麼功能？
- **使用情境**：這個功能解決什麼問題？
- **預期行為**：功能應該如何運作？

## 如何貢獻程式碼 (Contributing Code)

### 1. Fork 專案

在 GitHub 上 Fork 本專案到您的帳號下。

### 2. Clone 到本地

```bash
git clone https://github.com/您的帳號/NHITW_cloud_analyzer_react_MUI.git
cd NHITW_cloud_analyzer_react_MUI
```

### 3. 設定 upstream

```bash
git remote add upstream https://github.com/leescot/NHITW_cloud_analyzer_react_MUI.git
```

### 4. 創建功能分支

```bash
git checkout -b feature/your-feature-name
```

分支命名建議：
- `feature/` - 新功能
- `fix/` - Bug 修復
- `docs/` - 文件更新
- `refactor/` - 程式碼重構

### 5. 安裝相依套件

```bash
npm install
```

### 6. 進行開發

- 遵循專案現有的程式碼風格
- 為您的修改撰寫清楚的註解
- 確保程式碼可以正常建置

### 7. 測試您的修改

```bash
# 建置專案
npm run build
```

在 Chrome 中載入建置後的 Extension 進行測試：
1. 開啟 `chrome://extensions/`
2. 開啟「開發人員模式」
3. 點擊「載入未封裝項目」
4. 選擇 `dist` 資料夾

### 8. Commit 您的修改

我們使用 [Conventional Commits](https://www.conventionalcommits.org/) 格式：

```bash
git commit -m "feat: 新增影像學報告展開功能"
```

Commit 訊息格式：
- `feat:` - 新功能
- `fix:` - Bug 修復
- `docs:` - 文件修改
- `style:` - 程式碼格式調整（不影響功能）
- `refactor:` - 程式碼重構
- `test:` - 測試相關
- `chore:` - 建置流程或輔助工具的變動

### 9. Push 到您的 Fork

```bash
git push origin feature/your-feature-name
```

### 10. 發起 Pull Request

1. 前往您的 GitHub fork
2. 點擊 "Compare & pull request"
3. 填寫 PR 描述：
   - **標題**：簡短描述您的修改
   - **描述**：詳細說明您做了什麼、為什麼這樣做
   - **測試**：說明如何測試您的修改
   - **相關 Issue**：如果有相關的 Issue，請連結

### 11. 等待審核

專案維護者會審核您的 PR，可能會：
- 直接合併
- 要求修改
- 提出問題或建議

請保持耐心，並積極回應反饋。

## 程式碼風格 (Code Style)

### JavaScript/JSX

- 盡量遵循專案現有的程式碼風格
- 保持程式碼的可讀性和一致性

### 命名規範

- **變數/函數**：使用 camelCase（例如：`getUserData`）
- **組件**：使用 PascalCase（例如：`ImagingData`）
- **常數**：使用 UPPER_SNAKE_CASE（例如：`MAX_RETRY_COUNT`）
- **檔案名稱**：
  - 組件：PascalCase（例如：`ImagingData.jsx`）
  - 工具函數：camelCase（例如：`settingsHelper.js`）

### 註解

- 為複雜的邏輯添加註解
- 使用 JSDoc 格式為函數添加說明
- 中文或英文註解皆可

## 提交前檢查清單 (Pre-submission Checklist)

在提交 PR 前，請確認：

- [ ] 程式碼可以正常建置（`npm run build` 成功）
- [ ] 已在 Chrome 中測試過功能，確保新增/修改的功能正常運作
- [ ] Commit 訊息遵循 Conventional Commits 格式
- [ ] PR 描述清楚說明了修改內容和測試方法
- [ ] 沒有包含不必要的檔案（例如：`node_modules`、`.DS_Store`）

## 授權協議 (License Agreement)

提交程式碼即表示您同意：

1. 您的貢獻將以 [Apache License 2.0](LICENSE) 授權
2. 您擁有您提交程式碼的版權，或有權代表版權所有者提交
3. 您的貢獻不侵犯任何第三方的智慧財產權

## 行為準則 (Code of Conduct)

請保持專業和尊重：

- **尊重他人**：尊重不同的觀點和經驗
- **接受建設性批評**：專注於改進專案，而非個人攻擊
- **友善溝通**：使用包容和友善的語言
- **協作精神**：我們都是為了讓專案更好

## 需要幫助？

如果您有任何問題，歡迎：

- 在 [GitHub Issues](https://github.com/leescot/NHITW_cloud_analyzer_react_MUI/issues) 提問
- 查看現有的 Issues 和 Pull Requests
- 聯繫專案維護者

再次感謝您的貢獻！🙏
