# 測試

## 單元測試(Vitest)

```bash
npm test          # 跑全部單元測試
npm run test:watch  # watch 模式
npx vitest run tests/test_labProcessor.js  # 跑單檔
```

測試檔:`tests/test_*.js`(processor 純函數測試)、`tests/*.test.{js,jsx}`(util 與 React hook 測試)。
chrome API 的最小 stub 在 `tests/vitest.setup.js`。

## 手動測試(瀏覽器)

```bash
npm run test:manual
```

以 TEST 模式建置擴充功能到 `dist/`(host permissions 加入 localhost)並起本機 server。
Chrome 載入 `dist/` 未封裝擴充功能後,開 `http://localhost:5173/`,
用 popup 的「載入本地資料」上傳 `tests/test_data/` 內的 JSON 進行手動驗證。
