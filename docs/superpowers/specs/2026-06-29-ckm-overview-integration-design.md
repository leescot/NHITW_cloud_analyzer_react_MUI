# CKM 整合進 Overview 設計文件

> 日期：2026-06-29
> 狀態：已確認
> 分支：feature-CKM

## 目標

將 CKM（Cardiovascular-Kidney-Metabolic）Tab 的關鍵功能融合進 Overview Tab，讓開啟 CKM 功能的使用者在 Overview 就能看到加強版的 CKM 資訊，不再需要切換到獨立的 CKM Tab。

## 觸發條件

- 所有 CKM 加強內容僅在 `enableCKMTab === true` 時生效
- 未開啟的使用者，Overview 完全不受影響

## 設計方案：融合式（方案 B）

### 區塊一：SummaryBar — 頂部摘要列

**位置**：Overview 最頂部，三欄 Grid 之上

**條件**：`enableCKMTab === true` 且 `ckmData?.hasCKMData === true`

**內容**：
- 左半：90天內關鍵用藥 badge（ACEI、ARB、ARNI、MRA、Statin、PCSK9i、SGLT2i、GLP1）
- 右半：CKD Stage Chip + eGFR / HbA1c / LDL / UACR / LVEF 數值 Chip

**做法**：
- 將 `SummaryBar` 從 `CKMData.jsx` 抽出為共用元件（或直接 export）
- `Overview.jsx` 新增 `ckmData` prop

### 區塊二：左欄藥物 — CKM 關鍵用藥群組 + ATC5 去重

**位置**：左欄，現有 `Overview_ImportantMedications` 元件內

**顯示順序**：
1. CKM 關鍵用藥區（上方）— 按 `CKM_ATC_PREFIXES` 六大治療群組分類（血糖/血壓/利尿/血脂/血栓/心臟）
2. 原有 ATC5 色彩群組藥物（下方）— 排除已出現在 CKM 區的藥物

**CKM 關鍵用藥區邏輯**：
- 從 `groupedMedications` 全部藥物中，用 `CKM_ATC_PREFIXES` 篩出 CKM 相關藥物，不受 ATC5 群組設定限制
- 按六大治療群組分類顯示（血糖、血壓、利尿、血脂、血栓、心臟）
- 在群組內，如果藥物同時符合 `KEY_DRUG_CLASSES`（ACEI/ARB/SGLT2i/Statin 等），額外顯示 badge Chip

**ATC5 去重邏輯**：
- 下方 ATC5 色彩群組藥物，排除已出現在 CKM 關鍵用藥區的藥物（用 drugcode 或 name + date 去重）
- 如果去重後無剩餘藥物，不顯示下方區塊

**改動範圍**：
- `Overview_ImportantMedications.jsx` 新增 props：`enableCKMBadge: boolean`、`groupedMedications`（需全量，不只是 ATC5 篩後的）
- 抽出 `getKeyDrugLabel()` 為共用 util
- 抽出 CKM 藥物分類邏輯為共用 util

### 區塊三：中欄檢驗 — CKM 項目合併進關注檢驗

**位置**：中欄，現有 `Overview_LabTests` 元件內

**做法**：
- 當 `enableCKMTab` 開啟時，將 `CKM_LAB_ITEMS` 中使用者 `focusedLabTests` 未涵蓋的項目，自動追加到檢驗表底部
- 追加項目用細分隔線 + 小標題「CKM」標示
- 追蹤天數：CKM 開啟時自動擴展為 180 天（取 Overview 預設 90 天和 CKM 180 天的較大值）
- 腎臟報告列印按鈕加在檢驗區標題右側（PrintIcon）
- CKM 特有的分類邏輯（`classifyLabItem`）一併帶入，用於區分 Cr/eGFR/eGFR(健保署)、BNP/NT-proBNP 等

**不做的事**：
- 不取代使用者自選的 `focusedLabTests`
- 已被 `focusedLabTests` 涵蓋的項目不重複追加

**改動範圍**：
- `Overview_LabTests.jsx` 新增 props：`enableCKM: boolean`、`groupedLabs`（已有）、`userInfo`（用於腎臟報告）
- 抽出 `classifyLabItem()` 為共用 util
- 引入 `nephroReportBuilder` 相關函數

### 區塊四：右欄 — ExtraLabCard + CKM ImagingCard 取代部分區塊

**位置**：右欄

**CKM 開啟時的結構**（由上到下）：
1. ExtraLabCard（TSH、FT4、iPTH、Lp(a) 等）— 從 `CKMData.jsx` 抽出
2. CKM ImagingCard（CKM 相關影像報告，含 EKG alert 標註、LVEF 標註、報告 tooltip/dialog）— 從 `CKMData.jsx` 抽出
3. 手術紀錄（保留）
4. 病患摘要（保留）

**移除**（CKM 開啟時）：
- `Overview_DischargeRecords`（住院紀錄）
- `Overview_AllergyRecords`（過敏紀錄）
- `Overview_ImagingTests`（通用影像）

**CKM 未開啟時**：右欄完全不變

**改動範圍**：
- `Overview.jsx` 加條件渲染控制右欄區塊
- 抽出 `ExtraLabCard` 和 `ImagingCard` 為可共用元件
- `Overview.jsx` 需接收 `ckmData`、`imagingData`（CKM 版）相關 props

## Overview.jsx 需新增的 Props

| Prop | 類型 | 來源 | 用途 |
|------|------|------|------|
| `ckmData` | object | `ckmProcessor.processCKMData()` | SummaryBar、藥物、影像 |
| `enableCKMTab` | boolean | `generalDisplaySettings` | 控制所有 CKM 加強內容 |
| `userInfo` | object | 上層傳入 | 腎臟報告列印 |

## 需抽出為共用的函數/元件

| 名稱 | 原位置 | 用途 |
|------|--------|------|
| `SummaryBar` | `CKMData.jsx` | Overview 頂部 + CKM Tab |
| `ExtraLabCard` | `CKMData.jsx` | Overview 右欄 + CKM Tab |
| `ImagingCard` | `CKMData.jsx` | Overview 右欄 + CKM Tab |
| `getKeyDrugLabel()` | `CKMData.jsx` | Overview 藥物 badge |
| `getRecentKeyDrugs()` | `CKMData.jsx` | SummaryBar |
| `classifyLabItem()` | `CKMData.jsx` | Overview 檢驗分類 |
| `KEY_DRUG_CLASSES` | `CKMData.jsx` | 藥物 badge 定義 |
| `CKM_LAB_ITEMS` | `CKMData.jsx` | 檢驗項目定義 |

## CKM Tab 的處置

整合完成後，關閉 CKM 獨立 Tab：
- `FloatingIcon.jsx` 中移除 CKM Tab 的渲染
- `enableCKMTab` 設定保留，改為控制 Overview 的 CKM 加強內容
- 設定 UI 文字可調整為「啟用 CKM 加強 Overview」
