# 本地端(非VPN)環境下，開啟測試頁面方式

1. 複製 ./localhost_file/manifest.json 至 ./public/ 下
2. 複製 ./localhost_file/test.html 至 ./public/ 下
3. 重新 npm run build
4. 終端機下，執行 npm run dev
5. 瀏覽器輸入 http://localhost:5173/test.html ，即可在此頁面下測試此擴充套件功能