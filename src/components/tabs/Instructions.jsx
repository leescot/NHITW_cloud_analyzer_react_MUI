import React, { useState, useEffect } from 'react';
import { Box, Typography, Paper, Grid, List, ListItem, ListItemText, Divider } from '@mui/material';
import ReactMarkdown from 'react-markdown';

// 導入的 JSON 圖片數據，目前選用壓縮率高的 webp 格式，轉為 base64 放進 JSON 中
import imagesData from '../../assets/instruction_image.json';
import { useGeneralDisplaySettings } from '../../contexts/SettingsContext';
const images = imagesData;

// 文檔數據結構 - 每個文檔都有一個 ID, title(顯示在左側的標題) 和 內容
// 圖片引用方式: IMAGE_PLACEHOLDER(image_id in instruction_image.json, 圖片描述(顯示於下方))
// 目前無法用 markdown table 格式(要安裝更多套件，為了簡化及避免過度複雜，所以沒有使用)

const documents = [
  {
    id: 'getting-started',
    title: '圖示固定於工具列',
    content: `## 圖示固定於工具列

### 1. 安裝 Chrome 擴充功能

- 從 Chrome 網上應用店安裝「健保雲端藥歷整理器2.0」

### 2. 將擴充功能固定在工具列

為了方便使用，建議將「健保雲端藥歷整理器2.0」固定在 Chrome 工具列：

1. 點擊 Chrome 右上角的「擴充功能」圖示 (拼圖形狀)
2. 找到「健保雲端藥歷整理器2.0」，點擊旁邊的「釘選」圖示

IMAGE_PLACEHOLDER(pin_extension_01, 點擊旁邊的「釘選」圖示)

3. 此時「雲」的圖示就會釘選在工具列上

IMAGE_PLACEHOLDER(pin_extension_02, 圖示會釘選在工具列上)

### 3. 開啟設定頁

- 點擊「雲」圖示，就可開啟設定面板。設定功能，請參照其它說明頁文件

IMAGE_PLACEHOLDER(updated_settings_page, 開啟設定頁面)
   `,
  },
  {
    id: 'features',
    title: '基本功能介紹',
    content: `## 基本功能介紹

### 1. 資料擷取

1. 登入健保醫療資訊雲端查詢系統，點選「健保系統雲端2.0」
2. 進入查詢病患資料頁面就會直接擷取相關資料

IMAGE_PLACEHOLDER(start_use_01, 點選進入「健保系統雲端2.0」)

3. 目前預設會擷取以下資訊，之後您可以在不同的頁籤中檢視：
- **訊息**：雲端藥歷首頁的訊息(腎功能、管制藥等)
- **西藥**：西藥處方清單與用藥歷史
- **中藥**：中藥處方清單
- **檢驗**：檢驗結果與趨勢圖
- **影像**：影像檢查報告
- **過敏**：病人過敏資訊
- **住院**：住院病摘資訊
- **手術**：病人手術資訊
- **餘藥**：目前餘藥資訊

### 2. 點擊網頁右方的「雲」圖示，可開啟以上資訊整合界面

IMAGE_PLACEHOLDER(icon128, 點擊「雲」圖示)


- 點擊圖示出視的整合資訊畫面(此為健保雲端的測試病人資料)

IMAGE_PLACEHOLDER(demo_patient, 健保雲端測試病人資料整合資訊)

`
,
  },
  {
    id: 'data-export',
    title: '整合資訊頁面介紹',
    content: `## 整合資訊頁面的內容介紹

IMAGE_PLACEHOLDER(integrated_page_overview_full, 整合資訊頁面內容)
1. **總覽**：整合使用者想關注的「西藥」+「檢驗」+「影像」，與「訊息+手術+過敏+住院」的整合畫面

2. **西藥**：西藥清單，直式排列，時間越近在最上面

3. **西藥(表格)**：整合式西藥整理表格

4. **中藥**：中藥清單，直式排列，時間越近在最上面

5. **檢驗**：檢驗報告清單，直式排列，時間越近在最上面

6. **檢驗(表格)**：整合式檢驗整理表格

7. **影像**：影像報告與影像的整合界面

8. **餘藥**：抓取健保雲端目前統計的餘藥資訊

9. **說明**：你現在看的這一頁就是了…😂

10. **半年內就醫診斷**：方便快速了解門診、住院、急診、疫苗及相關診斷，藍色數字代表該診斷使用的次數、草藥圖示為中醫診斷曾使用此診斷

11. **關注西藥**：快速了解重要關注的西藥，可於西藥顯示設定頁面添加ATC5群組或是更改群組顏色

12. **關注檢驗**：快速了解重要關注的檢驗，可於總覽顯示設定頁面中調整。

13. **關注影像**：快速了解重要關注的影像，可於總覽顯示設定頁面中調整。

14. **手術紀錄**：最近的手術訊息。

15. **出院紀錄**：最近的出院訊息，與病例摘要。


`,
  },
  {
    id: 'setting_general',
    title: '設定：一般顯示',
    content: `## 一般顯示設定介紹

此頁面讓您可以自訂擴充功能的顯示相關設定，包括文字大小、浮動圖標位置及頁面行為。**請注意：所有設定需重新載入網頁後才會生效。**

IMAGE_PLACEHOLDER(general_display_settings, 一般顯示設定頁面內容)

## 功能說明

### 頁面行為設定
- **開啟頁面固定顯示總覽頁面**：啟用此選項後，每次打開擴充功能時都會自動顯示「總覽」頁面，方便您快速瀏覽所有資訊。

- **使用彩色標籤**：頁面標籤會以不同顏色顯示，關閉則使用淺藍色。
IMAGE_PLACEHOLDER(color_tags, 使用彩色標籤)
IMAGE_PLACEHOLDER(blue_only_tags, 關閉彩色標籤)

- **自動開啟資料頁面**：讀卡後進入雲端網站自動開啟資料頁面。

### 位置設定
- **浮動圖標位置**：您可以選擇擴充功能的浮動圖標顯示在螢幕的「右上」、「右中」或「右下」位置，根據您的使用習慣進行調整。

### 文字大小設定
您可以根據個人閱讀喜好調整三種不同類型的文字大小：

1. **標題文字大小**：調整所有標題的顯示大小（小/中/大）
2. **內容文字大小**：調整主要內容的顯示大小（小/中/大）
3. **備註文字大小**：調整說明與備註的顯示大小（小/中/大）

## 如何應用設定
1. 調整您想要的設定
2. 改變任何設定會自動儲存
3. **重新載入網頁**以套用變更

`,
  },
  {
    id: 'setting_overview',
    title: '設定：總覽顯示',
    content: `# 總覽顯示設定 - 使用者指南

總覽顯示設定頁面讓您能夠自訂「總覽」頁面上顯示的資料範圍及內容，包括藥物、檢驗和影像追蹤的時間範圍，以及您關注的特定檢驗項目和影像檢查類型。

IMAGE_PLACEHOLDER(setting_overview, 總覽顯示設定頁面內容)

## 功能說明

### 追蹤時間範圍設定

1. **關注藥物追蹤天數**
   - 設定範圍：1-180天
   - 影響：控制西藥ACT5變色提示的時間範圍
   - 預設值：90天

2. **關注檢驗追蹤天數**
   - 設定範圍：1-365天
   - 影響：總覽頁面最多顯示七組檢驗資料
   - 預設值：180天

3. **關注影像追蹤天數**
   - 設定範圍：1-365天
   - 影響：控制影像檢查顯示的時間範圍
   - 預設值：180天

### 關注檢驗清單設定

點擊「關注檢驗清單設定」按鈕可開啟設定對話框，您可以：
- 勾選或取消勾選要在總覽頁面顯示的檢驗項目
- 使用上下箭頭按鈕調整檢驗項目的顯示順序
- 點擊「重置為預設」恢復系統建議的預設檢驗項目及排序
- 點擊「保存」儲存您的自訂設定，或「取消」放棄變更

**預設檢驗項目清單**：

已預設啟用的檢驗項目：
- Hb (08011C-Hb)
- BUN (09002C)
- Cr & GFR (09015C)
- UPCR (09040C)
- UACR (12111C)
- Alb (09038C)
- Glucose (09005C)
- HbA1c (09006C)
- Chol (09001C)
- TG (09004C)
- HDL (09043C)
- LDL (09044C)
- Na (09021C)
- K (09022C)
- U.A (09013C)
- GOT (09025C)
- GPT (09026C)

預設未啟用的檢驗項目：
- WBC (08011C-WBC)
- Platelet (08011C-Platelet)
- Ca (09011C)
- P (09012C)
- Alk-P (09027C)
- Bil(T) (09029C)
- Bil(D) (09030C)
- r-GT (09031C)

### 關注影像清單設定

點擊「關注影像清單設定」按鈕可開啟設定對話框，您可以：
- 勾選或取消勾選要在總覽頁面顯示的影像檢查項目
- 點擊「重置為預設」恢復系統建議的預設影像檢查項目
- 點擊「保存」儲存您的自訂設定，或「取消」放棄變更

**預設影像檢查項目清單**：

已預設啟用的影像檢查：
- 磁振造影(MRI) (33085B,33084B)
- 電腦斷層(CT) (33072B,33070B)
- 腹部超音波 (19009C,19001C)
- 其他超音波 (19009C)
- 心臟超音波 (18006C)
- 胃鏡 (28016C)

預設未啟用的影像檢查：
- CXR (32001C)
- EKG (18001C)

## 設定生效方式
修改這些設定後，變更會立即儲存並同步到您的 Chrome 瀏覽器。若您在已開啟的頁面中看不到變更效果，可能需要重新整理頁面。

## 最佳實踐建議
- 根據您的健康管理需求調整追蹤天數，慢性病患者可能需要較長的追蹤期
- 自訂關注檢驗清單時，將最常關注的重要指標排在前面
- 針對特定疾病或健康狀況，啟用對應的相關檢驗指標（如：腎功能、血糖、血脂等）
- 僅啟用您實際需要追蹤的檢驗和影像項目，以保持總覽頁面的簡潔和重點
- 定期檢視並更新您的設定，以確保總覽頁面提供最相關的健康數據
`,
  },
  {
    id: 'setting_medication',
    title: '設定：西藥',
    content: `# 西藥顯示設定 - 使用者指南

西藥顯示設定頁面讓您可以自訂擴充功能對於藥物資訊的顯示方式、複製格式，以及設定藥物類型的顏色分類功能。

IMAGE_PLACEHOLDER(western_medication_display_settings, 西藥顯示設定頁面內容)


## 基本顯示選項

- **藥物商品名精簡顯示**：開啟此選項可以簡化藥物名稱顯示，移除不必要的資訊。
- **顯示主診斷資訊**：開啟此選項可以顯示與藥物相關的診斷資訊。
- **顯示藥品學名**：開啟此選項將顯示藥物的學名（成分名稱）。
- **顯示ATC5分類名稱**：開啟此選項將顯示藥物的 ATC5 分類系統名稱。

## ATC5 變色功能

ATC5 變色功能可讓您依照藥物分類為不同藥物設定顏色標示，幫助您快速識別不同類型的藥物。

- **開啟ATC5變色功能**：啟用或停用藥物分類的顏色標示功能。

啟用此功能後，您可以進一步設定：

### 設定 ATC5 群組
點擊「設定ATC5群組」按鈕，您可以：
- 查看現有的藥物分類群組
- 新增群組：點擊「新增群組」按鈕
- 編輯群組：修改群組名稱和 ATC5 代碼
- 刪除群組：移除不需要的群組

新增或編輯群組時，需要：
- 輸入群組名稱（例如：「心血管藥物」）
- 輸入 ATC5 代碼，多個代碼請以空格分隔（例如：「C01AA C01BA C01BB」）

**預設 ATC5 群組設定**：
- NSAID (非類固醇消炎止痛藥)：M01AA, M01AB, M01AC, M01AE, M01AG, M01AH
- ACEI (血管收縮素轉化酶抑制劑)：C09AA, C09BA, C09BB, C09BX
- ARB (血管收縮素接受器阻斷劑)：C09CA, C09DA, C09DB, C09DX
- STATIN (他汀類藥物)：C10AA, C10BA, C10BX
- SGLT2 (鈉-葡萄糖共同運輸蛋白2抑制劑)：A10BK, A10BD15, A10BD16, A10BD19, A10BD20, A10BD21, A10BD25, A10BD27, A10BD29, A10BD30
- GLP1 (胰高血糖素樣胜肽-1受體激動劑)：A10BJ, A10AE54, A10AE56
- 抗凝 (抗血小板+抗凝血濟): B01A

### 設定群組顏色
點擊「設定群組顏色」按鈕，您可以：
- 將不同的 ATC5 群組指派為紅色、橘色或綠色
- 每個群組只能指派一種顏色
- 移除已指派的顏色設定

指派顏色步驟：
1. 從下拉選單中選擇尚未指派顏色的群組
2. 選擇要指派的顏色（紅色、橘色或綠色）
3. 點擊「指派」按鈕確認

**預設顏色群組設定**：
- 紅色群組：抗凝血藥物、NSAID (非類固醇消炎止痛藥)
- 橘色群組：ARB (血管收縮素接受器阻斷劑), ACEI (血管收縮素轉化酶抑制劑), STATIN (他汀類藥物)
- 綠色群組：SGLT2 , GLP1 

## 短天數藥物分欄顯示
啟用後，系統會將藥物分為「長期用藥 >= 14天」和「短期用藥 < 14天」兩個獨立欄位顯示。
分類規則說明：

- **長期用藥**：任何處方中只要有一種藥物的用藥天數大於等於 14 天，整個處方就會被歸類為「長期用藥」。
- **短期用藥**：處方中所有藥物的用藥天數均小於 14 天的處方。

這樣區分的好處：

- 帮助使用者快速區分需長期服用的慢性病用藥和短期治療的急性症狀用藥
- 協助使用者更清楚了解哪些藥物是短期使用，哪些需要長期持續使用
- 便於追蹤長期用藥的連續性和依從性
IMAGE_PLACEHOLDER(short_term_medication_columned_display, 短天數藥物分欄顯示示例)

## 藥物複製格式

此選項控制當您在系統中複製藥物資訊時的格式：

- **關閉複製功能**：停用藥物資訊的複製功能
- **複製商品名(直式)**：僅複製藥物商品名，每個藥物一行
- **複製商品名+使用量(直式)**：複製藥物商品名及使用量資訊，每個藥物一行
- **複製商品名(橫式)**：僅複製藥物商品名，所有藥物在同一行，以逗號分隔
- **複製商品名+使用量(橫式)**：複製藥物商品名及使用量資訊，所有藥物在同一行
IMAGE_PLACEHOLDER(western_medication_copy_format_example, 藥物複製格式示例)

## 使用建議
- 如果您需要快速辨識不同類別的藥物，建議開啟 ATC5 變色功能並設定相關群組
- 醫療專業人員可依照不同專科需求，自訂藥物群組和顏色
- 針對**腎臟科**需求，可注意 NSAID, ACEI, ARB 等可能影響腎功能的藥物
- 針對**心臟科**需求，可重點關注 ACEI, ARB, STATIN 等常用心臟用藥
- 針對**內分泌科**需求，可突顯 SGLT2, GLP1 等降血糖藥物
- 複製格式建議根據您的記錄習慣選擇，編寫病歷時通常使用直式格式較佳
- 對於藥物相互作用的監測，建議顯示藥品學名和 ATC5 分類名稱

## 顯示藥物外觀功能(需連接外網)
**注意：此功能需連接外網**
將在藥物的右側出現圖片的icon，點擊即可顯示藥物的外觀圖片。
IMAGE_PLACEHOLDER(show_medication_appearance_feature)
IMAGE_PLACEHOLDER(medication_image_viewer, 藥物外觀圖片示例)

`,
  },
  {
    id: 'setting_chinesemedication',
    title: '設定：中藥',
    content: `# 中藥顯示設定 - 使用者指南

中藥顯示設定頁面讓您能夠自訂擴充功能中對於中藥資訊的顯示方式及複製格式，幫助您更有效地管理與檢視中藥處方資料。



## 功能說明

### 顯示選項

- **顯示主診斷資訊**：啟用此選項後，系統將顯示與中藥處方相關的主診斷資訊，幫助您了解處方的臨床適應症。預設為關閉。

- **顯示效能名稱**：啟用此選項後，系統將顯示中藥的效能名稱（如：清熱解毒、補氣養血等），方便您了解中藥的主要功效。預設為關閉。

### 劑量顯示格式

- **每日劑量**：顯示每日方劑的劑量

- **每次劑量**：顯示每次方劑的劑量

**注意**：有些院所的中藥頻次上傳不完整，會導致此功能無法正常顯示

### 中藥複製格式

此設定控制當您複製中藥資訊時的格式，有以下選項：

- **關閉複製功能**：停用中藥資訊的複製功能
- **複製中藥名稱(直式)**：僅複製中藥名稱，每種中藥一行
- **複製中藥名稱+使用量(直式)**：複製中藥名稱及劑量資訊，每種中藥一行，預設選項
- **複製中藥名稱(橫式)**：僅複製中藥名稱，所有中藥在同一行，以逗號分隔
- **複製中藥名稱+使用量(橫式)**：複製中藥名稱及劑量資訊，所有中藥在同一行

## 使用建議

- 若您需要仔細分析中藥處方與患者病況的關聯，建議開啟「顯示主診斷資訊」
- 中醫師或中藥專業人員可能會希望開啟「顯示效能名稱」，便於快速辨識處方的治療目的(不是所有中藥廠商都有提供效能名稱)
- 複製格式的選擇取決於您的文件記錄需求：
  - 撰寫詳細病歷時，建議使用直式格式
  - 需要簡潔摘要時，可使用橫式格式
  - 若需同時記錄劑量資訊，選擇含「使用量」的選項`,
  },
  {
    id: 'setting_labdata',
    title: '設定：檢驗',
    content: `# 檢驗報告設定 - 使用者指南

檢驗報告設定頁面讓您能夠自訂檢驗數據的顯示方式、格式，以及複製選項，幫助您更有效地查看和分析檢驗結果。

IMAGE_PLACEHOLDER(lab_report_settings, 檢驗顯示設定頁面內容)

## 功能說明

### 顯示選項

- **顯示檢驗單位**：啟用此選項將在檢驗數值旁顯示測量單位（如：mg/dL、mmol/L）。預設為關閉。

- **顯示檢驗參考值**：啟用此選項將顯示每個檢驗項目的正常參考範圍，方便您判斷結果是否正常。預設為關閉。

- **顯示檢驗縮寫**：啟用此選項將顯示檢驗項目的英文縮寫（如：BUN、Cr、AST），便於醫療專業人員快速識別。預設為開啟。

- **開啟異常值變色**：啟用此選項後，異常的檢驗結果將以不同顏色顯示（通常是偏高為紅色，偏低為藍色），幫助您快速識別異常值。預設為開啟。

- **開始自訂複製項目功能**：啟用此選項後，您可以在檢驗報告中自訂複製項目，幫助您快速提取需要的數據。
IMAGE_PLACEHOLDER(auto_copy_lab_results, 自訂複製項目，讓每次都會自動勾選)
IMAGE_PLACEHOLDER(lab_test_selection_diagram, 複製項目勾選)

### 檢驗報告呈現方式

您可以選擇檢驗報告的版面配置：

- **直式呈現**：每個檢驗項目獨立顯示，上下排列
- **橫式呈現**：檢驗項目並排顯示，適合比較不同時間的同一項目
- **雙欄呈現**：將檢驗項目分為兩欄顯示，提高空間利用率
- **三欄呈現**：將檢驗項目分為三欄顯示，最大化空間利用
- **依檢驗類型分組**：按照檢驗類型（如：血液學、生化、電解質等）分類顯示，預設選項

### 檢驗報告複製格式

此設定控制複製檢驗數據時的格式：

- **直式格式**：每個檢驗項目獨立一行，適合製作詳細報告
- **橫式格式**：檢驗項目並排顯示，便於在電子病歷中插入，預設選項
IMAGE_PLACEHOLDER(lab_report_copy_format_example, 複製格式示例)

## 使用建議

- 如果您需要詳細分析檢驗結果，建議開啟「顯示檢驗單位」和「顯示檢驗參考值」
- 醫療專業人員通常習慣開啟「顯示檢驗縮寫」以快速識別項目
- 「開啟異常值變色」功能非常實用，可幫助您在大量數據中快速找出需要關注的異常值
- 根據您的螢幕大小和閱讀習慣選擇適合的呈現方式：
  - **小螢幕裝置**可能適合使用「直式呈現」
  - **大螢幕**時「雙欄」或「三欄」呈現可以更有效利用空間
  - 專業人士通常偏好「依檢驗類型分組」，因為這與臨床思考方式一致
- 複製格式的選擇應基於您的文檔需求：
  - 撰寫詳細病歷時，「直式格式」較為適合
  - 製作簡報或摘要時，「橫式格式」更為簡潔
`,
  },
  {
    id: 'icon_status',
    title: '狀態指示器標記',
    content: `## 狀態指示器 - 功能說明

狀態指示器是一組視覺化標記，顯示於頁面右上方，幫助您快速掌握重要的患者健康狀況與近期醫療活動。這些指示器會根據患者資料自動顯示，無需手動設定。

IMAGE_PLACEHOLDER(icon_status, 狀態指示器)

## 可用指示器一覽

系統會根據患者資料分析結果，顯示以下幾種狀態指示器：

### 1. 腎臟狀況指示器 (CKD)
- **觸發條件**：當患者的 eGFR 數值顯示有慢性腎臟病時
- **顯示內容**：根據 eGFR 數值自動判定 CKD 階段
  - CKD 3 期：eGFR 介於 30-59 之間
  - CKD 4 期：eGFR 介於 15-29 之間
  - CKD 5 期：eGFR 低於 15
- **用途**：提醒醫護人員注意患者腎功能狀況，尤其是在藥物劑量調整和影像檢查方面

### 2. CT 檢查指示器
- **觸發條件**：患者在過去 90 天內有接受 CT 檢查
  - 檢查代碼：33072B, 33070B
- **顯示內容**：「CT」標籤
- **用途**：避免不必要的重複檢查，並提醒醫護人員參考已有的檢查結果

### 3. MRI 檢查指示器
- **觸發條件**：患者在過去 90 天內有接受 MRI 檢查
  - 檢查代碼：33085B, 33084B
- **顯示內容**：「MRI」標籤
- **用途**：避免不必要的重複檢查，並提醒醫護人員參考已有的檢查結果

### 4. 過敏狀態指示器
- **觸發條件**：患者有記錄的過敏史
- **顯示內容**：「過敏」標籤
- **用途**：提醒醫護人員在處方藥物時注意患者的過敏情況

### 5. 手術紀錄指示器
- **觸發條件**：患者有手術紀錄
- **顯示內容**：「手術」標籤
- **用途**：提醒醫護人員患者有手術史，可能需要特別照護或考慮

### 6. 出院紀錄指示器
- **觸發條件**：患者有出院紀錄
- **顯示內容**：「出院」標籤
- **用途**：提醒醫護人員患者有住院史，可能需要查看出院摘要和後續照護計畫

## 指示器顯示規則

- 指示器僅在有相關資料時顯示，沒有資料時不會出現對應標籤
- 顯示的字體大小會根據「一般顯示設定」中的「備註文字大小」設定進行調整
- 在較窄的螢幕上，指示器會調整位置以確保良好的版面配置

## 使用建議

- 初次查看患者資料時，先留意這些指示器，了解患者的重要狀況
- 指示器只是提示工具，詳細資訊仍需查閱完整的患者紀錄
- 若需要進一步了解特定指示器的觸發理由，可將滑鼠懸停在指示器上方查看提示文字
- 腎臟狀況指示器尤其重要，當它顯示時，請特別注意患者的用藥選擇與劑量調整
`,
  },
];

const Instructions = () => {
  const generalDisplaySettings = useGeneralDisplaySettings();
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
        // 分割圖片變數名和說明文字（如果有）
        const paramsArray = part.split(',').map(item => item.trim());
        const imgVarName = paramsArray[0];
        // 如果提供了說明，則使用提供的說明，否則使用默認文字
        const captionText = paramsArray.length > 1 ? paramsArray[1] : '說明圖片';

        // 從映射對象獲取圖片
        const imgSrc = images[imgVarName];

        // 檢查是否為需要調整大小的特定圖片
        const reducedSizeImages = [
          'updated_settings_page',
          'general_display_settings',
          'western_medication_display_settings',
          'lab_report_settings',
          'auto_copy_lab_results'
        ];

        const isReducedSizeImage = reducedSizeImages.includes(imgVarName);

        return imgSrc ? (
          <Box key={`img-${index}`} sx={{ my: 2, textAlign: 'center' }}>
            <img
              src={imgSrc}
              alt={captionText}
              style={{
                maxWidth: isReducedSizeImage ? '40%' : '100%',
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