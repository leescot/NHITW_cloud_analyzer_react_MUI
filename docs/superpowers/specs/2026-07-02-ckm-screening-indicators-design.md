# CKM SummaryBar 篩檢指標設計文件

> 日期：2026-07-02
> 狀態：已確認
> 分支：feature-CKM
> 前置：本功能建立在 [2026-06-29-ckm-overview-integration-design.md](2026-06-29-ckm-overview-integration-design.md) 的 SummaryBar 之上

## 目標

在 CKM SummaryBar（Overview 頂部摘要列）新增第三個區塊「篩檢」，自動計算並顯示四項心代謝/肝腎篩檢指標：**FIB-4、TyG、KFRE、HOMA-IR**，以風險分級著色的 chip 呈現，hover 顯示計算所用數值與判讀。

## 觸發條件

- 僅在 `enableCKMTab === true`（CKM 加強 Overview 已開啟）**且** 新設定 `enableCKMScreening === true` 時顯示
- 算不出的指標（資料不足）**不顯示**，不佔版面

## 資料來源與抓取

計算在 **`CKMSummaryBar.jsx`** 內以 `useMemo` 進行，資料來源：

- **成分檢驗值**：從 `groupedLabs`（labProcessor 輸出，每組含 `date` 與 `labs[]`，每筆含 `orderCode`、`itemName`、`abbrName`、`value`、`unit`）撈取
- **eGFR / UACR**：沿用 `ckmData.summary.latestEGFR` / `latestUACR`（ckmProcessor 已算好，數值為 float，單位分別為 ml/min/1.73m²、mg/g）
- **age / sex**：來自 `userInfo`（`userInfo.age`、`userInfo.gender`，gender 為 `'M'`/`'F'`/`'男'`/`'女'`）

**不修改 ckmProcessor**：避免其執行時 `userInfo` 尚未取得的時序問題。

### 成分檢驗代碼

| 成分 | orderCode | 額外條件 | 備註 |
|------|-----------|---------|------|
| AST | `09025C` | — | GOT |
| ALT | `09026C` | — | GPT |
| Platelet | `08011C` | 項目名符合 `/platelet\|血小板/i` | 藏在 CBC；單位 `x10³/µL` = 10⁹/L，數值直接代入 |
| TG | `09004C` | — | Triglyceride |
| Glucose | `09005C` | — | fasting glucose |
| Insulin | `09086B` | — | 單位 µU/mL（uIU/mL） |
| eGFR | — | — | 用 `summary.latestEGFR` |
| UACR | — | — | 用 `summary.latestUACR`（mg/g 比值，非 microalbumin 濃度） |

### 單位防呆

- Glucose / TG：若 `unit` 含 `mmol` → ×18（glucose）/ ×88.57（TG）換為 mg/dL
- Insulin：若 `unit` 含 `pmol` → ÷6.945 換為 µU/mL
- UACR：若 `unit` 含 `mg/mmol` → ×8.84 換為 mg/g
- 所有進入 √ / ln / 除法的輸入必須為**有限正數**，否則該指標回傳 `null`

## 時間窗策略

- **FIB-4、TyG（同次抽血）**：groupedLabs 已按檢驗日期分組。取「最近一個同時具備所有必要成分的日期」計算。
  - FIB-4 需同日有 AST + ALT + Platelet（Platelet 從當日該組的 CBC labs 撈）
  - TyG 需同日有 TG + Glucose
- **HOMA-IR（放寬 ±7 天）**：取最近一筆 Insulin，於 ±7 天內配對最近一筆 Glucose；兩者皆有才計算
- **KFRE（放寬）**：eGFR<60 且有 UACR 時，各取最新一筆（沿用 summary），不要求同日

## 計算公式與判讀切點

### FIB-4

```
FIB-4 = Age × AST / (Platelet × √ALT)
```
單位：Age 歲、AST/ALT U/L、Platelet 10⁹/L（= x10³/µL 的數值）

| FIB-4 | band | 顏色 |
|-------|------|------|
| < 1.3（≥65 歲改 < 2.0） | low | 綠 |
| 1.3–2.67（≥65 歲 2.0–2.67） | indeterminate | 橘 |
| > 2.67 | high | 紅 |

需要 `userInfo.age`，缺 age 則不計算。

### TyG

```
TyG = ln(TG × Glucose / 2)      // TG、Glucose 皆 mg/dL
```

| TyG | band | 顏色 |
|-----|------|------|
| < 8.5 | not high | 綠 |
| 8.5–8.9 | elevated | 橘 |
| ≥ 9.0 | high | 紅 |

註：非診斷切點。固定用 `ln(TG×Glucose/2)`（結果約 8–10），不用 `ln(TG×Glucose)/2`。

### KFRE（4 變數，non-North America）

```
male = (sex ∈ {M, 男}) ? 1 : 0

LP = -0.2201 × (Age/10  - 7.036)
   + 0.2467 × (male     - 0.5642)
   - 0.5567 × (eGFR/5   - 7.222)
   + 0.4510 × (ln(UACR) - 5.137)      // UACR mg/g

KFRE_2y = 1 - 0.9832 ^ exp(LP)
KFRE_5y = 1 - 0.9365 ^ exp(LP)
```

- **計算條件**：eGFR < 60 且 UACR > 0 且有 age 且有 sex，否則不顯示
- chip 顯示 5 年風險百分比（如 `KFRE 5y 8%`），tooltip 另附 2 年風險
- 著色（CKD G3 分級）：

| KFRE 5y | band | 顏色 |
|---------|------|------|
| < 5% | low | 綠 |
| 5–15% | intermediate | 橘 |
| ≥ 15% | high | 紅 |

### HOMA-IR

```
HOMA-IR = Insulin(µU/mL) × Glucose(mg/dL) / 405
```

| HOMA-IR | band | 顏色 |
|---------|------|------|
| < 2.0 | low | 綠 |
| 2.0–2.5 | borderline | 橘 |
| ≥ 2.5 | high（≥3.0 明顯 IR，tooltip 註明） | 紅 |

註：需 fasting insulin，實務上常缺，多數病人此項不顯示。

## 顯示（SummaryBar 第三區塊）

- 沿用現有 lab chips 的 outlined chip 風格
- 區塊前綴 `篩檢 -`，以 `|` 與前兩區塊分隔（同現有「90天內用藥」「近期檢驗」之間的分隔）
- 每指標一個 chip，label 例：`FIB-4 3.2`、`TyG 9.1`、`KFRE 5y 8%`、`HOMA-IR 2.8`
- chip 顏色依 band：low=`success`、indeterminate/borderline/elevated=`warning`、high=`error`
- hover tooltip：列出計算所用數值 + 各自日期 + 判讀文字（如「FIB-4 >2.67：進階纖維化風險較高」）
- 全部指標皆 `null` 時，第三區塊不顯示

## 架構與檔案

### 新增

- **`src/utils/screeningIndicators.js`**（純邏輯，可被瀏覽器 Mocha 直接 import，**不 import 任何 npm 套件**）
  - `computeScreeningIndicators({ groupedLabs, summary, userInfo })` → `{ fib4, tyg, kfre, homaIr }`，每項為以下結構或 `null`：
    ```
    {
      value: number,           // 原始數值（KFRE 為 5y 機率 0–1）
      label: string,           // chip 顯示文字，如 'FIB-4 3.2'
      band: 'low'|'mid'|'high',// 對應 success/warning/error
      note: string,            // 判讀文字（tooltip 用）
      inputs: [{ name, value, date }]  // 計算所用成分
    }
    ```
  - 另外 export 供單元測試：`computeFib4`、`computeTyg`、`computeKfre`、`computeHomaIr`（純函數，收數值參數）、以及各自的 band 判定函數
- **`tests/test_screeningIndicators.js`**（註冊進 `tests/test.js`）

### 修改

- **`src/components/tabs/ckm/CKMSummaryBar.jsx`**：新增 props `groupedLabs`、`userInfo`；讀 `gds?.enableCKMScreening`；`useMemo` 算指標並渲染第三區塊
- **`src/components/tabs/Overview.jsx`**：SummaryBar 呼叫處補傳 `groupedLabs={groupedLabs}`、`userInfo={userInfo}`
- **`src/components/tabs/CKMData.jsx`**：CKM tab 的 `<CKMSummaryBar>` 補傳 `groupedLabs`、`userInfo`（皆已是該元件現有 props）
- **設定串接**（新增 `enableCKMScreening`，預設 `false`，位於 `generalDisplaySettings`）：
  - `src/config/defaultSettings.js`：`general.enableCKMScreening: false`
  - `src/utils/settingsManager.js`：`loadAllSettings` 的 `chrome.storage.sync.get` key、general 巢狀映射、`settingChanged` 事件的 allSettings 映射
  - `src/components/settings/AdvancedSettings.jsx`：local state + 在 `enableCKMTab` 開啟時顯示的子開關「顯示篩檢指標（FIB-4/TyG/KFRE/HOMA-IR）」

### 測試資料

- 在 `.test_data/ckm_mock_patient.json` 補一筆 2026/05/11 的 AST（`09025C`，item `AST(GOT)`，合理值如 `28`，unit `U/L`），使 FIB-4 可示範。其餘四項所需值 mock 已具備（Platelet 177、TG 87、Glucose 191、ALT 17 同為 05/11；Insulin 18.5 於 05/10）。

## 測試計畫

`tests/test_screeningIndicators.js` 於瀏覽器 Mocha 驗證：

1. **各公式數值正確**（用固定輸入對照手算）：
   - FIB-4：Age50, AST40, ALT30, PLT200 → 50×40/(200×√30)=2000/1095.4≈1.826
   - TyG：TG150, Glu100 → ln(150×100/2)=ln(7500)≈8.923
   - KFRE：Age50, male1, eGFR45, UACR100 → 依 LP 公式 5y≈（測試取實算值±0.001）
   - HOMA-IR：Ins15, Glu100 → 15×100/405≈3.704
2. **band 切點**：各指標邊界值（含 FIB-4 年齡 ≥65 用 <2.0）
3. **時間窗**：
   - FIB-4/TyG 僅在同日湊齊才算；不同日不算
   - HOMA-IR insulin 與 glucose 差 7 天內算、差 8 天不算
   - KFRE 僅 eGFR<60 且有 UACR 才算
4. **單位防呆**：glucose mmol/L、insulin pmol/L 換算
5. **無效輸入**：缺 age、UACR=0、platelet=0 等回傳 null

## 不做的事（YAGNI）

- 不做每指標獨立開關（單一總開關）
- 不做 North America 版 KFRE 切換
- 不在 ckmProcessor 內計算（維持 groupedLabs + summary + userInfo 於元件層計算）
- 不做趨勢圖（僅顯示最新一次可計算結果）
