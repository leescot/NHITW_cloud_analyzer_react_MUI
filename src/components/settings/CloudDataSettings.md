# CloudDataSettings 設定流程說明

## 設定變數流程

當使用者在 CloudDataSettings.jsx 中改變 `fetchAdultHealthCheck` 和 `fetchCancerScreening` 設定時，數據的流動過程如下：

## 1. 設定值保存流程

1. **使用者點選開關** - 當使用者在 CloudDataSettings 元件中切換開關時，觸發 `handleLocalSettingChange` 函式。

2. **本地狀態更新** - 首先更新元件內的 `settings` 狀態，以即時反映在 UI 上：
   ```jsx
   setSettings(prev => ({
     ...prev,
     [settingName]: value
   }));
   ```

3. **Chrome Storage 儲存** - 然後透過 `handleSettingChange` 函式將設定保存到 Chrome 的儲存空間：
   ```jsx
   handleSettingChange(settingName, value, null, null, 'cloud');
   ```

4. **settingsHelper.js 處理** - `handleSettingChange` 函式將設定存入 Chrome Storage：
   ```jsx
   chrome.storage.sync.set({ [settingName]: value });
   ```

5. **通知內容腳本** - 同時發送消息到內容腳本，通知設定已更改：
   ```jsx
   chrome.tabs.sendMessage(tabs[0].id, {
     action: 'settingChanged',
     setting: settingName,
     value: value,
     settingType: 'cloud'
   });
   ```

## 2. 資料抓取邏輯

設定更改後，影響 legacyContent.js 中的資料抓取邏輯：

1. **檢查是否應抓取資料** - 當執行 `fetchAllDataTypes()` 函式時，會根據設定決定是否抓取特殊資料型別：
   ```jsx
   const specialDataTypes = ["adultHealthCheck", "cancerScreening"];
   const specialFetchPromises = specialDataTypes.map((dataType) => {
     return shouldFetchData(dataType).then((shouldFetch) => {
       if (shouldFetch && isDataTypeAuthorized(dataType)) {
         console.log(`${dataType} 已授權且設定要抓取，開始擷取資料`);
         return enhancedFetchData(dataType);
       } else {
         console.log(`${dataType} 設定不抓取或無授權，返回空集合`);
         return Promise.resolve(createEmptyDataResult(dataType));
       }
     });
   });
   ```

2. **shouldFetchData 函式** - 此函式從 Chrome Storage 讀取設定值來決定是否抓取資料：
   ```jsx
   function shouldFetchData(dataType) {
     if (dataType === "adultHealthCheck") {
       return new Promise((resolve) => {
         chrome.storage.sync.get({ fetchAdultHealthCheck: true }, (items) => {
           console.log("目前 fetchAdultHealthCheck 的值:", items.fetchAdultHealthCheck);
           resolve(items.fetchAdultHealthCheck);
         });
       });
     } else if (dataType === "cancerScreening") {
       return new Promise((resolve) => {
         chrome.storage.sync.get({ fetchCancerScreening: true }, (items) => {
           console.log("目前 fetchCancerScreening 的值:", items.fetchCancerScreening);
           resolve(items.fetchCancerScreening);
         });
       });
     }
     return Promise.resolve(true);
   }
   ```

## 3. 資料處理流程

抓取的資料如何被處理：

1. **資料保存** - 抓取的資料會被保存在全局變數中：
   ```jsx
   window.lastInterceptedAdultHealthCheckData = data;
   window.lastInterceptedCancerScreeningData = data;
   ```

2. **dataManager.js 處理** - 當資料需要處理時，會通過 `handleAllData` 函式處理：
   ```jsx
   // 處理雲端資料
   if (dataSources.adultHealthCheck) {
     const processedAdultHealthCheck = adultHealthCheckProcessor.processAdultHealthCheckData(
       dataSources.adultHealthCheck
     );
     
     // 使用 safeSetter 處理可能不存在的 setter
     safeSetter(setters, 'setAdultHealthCheckData', processedAdultHealthCheck, 'adultHealthCheck');
     results.adultHealthCheck = processedAdultHealthCheck;
   }
   ```

3. **safeSetter 函式** - 因為某些元件可能尚未註冊相應的 setter，所以使用 safeSetter 函式來安全地設置資料：
   ```jsx
   const safeSetter = (setters, setterName, data, dataName) => {
     const setterFn = setters[setterName];
     
     if (typeof setterFn === 'function') {
       console.log(`Calling setter function: ${setterName}`);
       setterFn(data);
     } else {
       console.log(`Setter ${setterName} not found, storing data in window.${dataName}Data`);
       window[`${dataName}Data`] = data;
     }
   };
   ```

## 4. 顯示邏輯

資料如何在 Overview 頁面顯示：

1. **判斷是否顯示元件** - 在 Overview.jsx 中，根據 cloudSettings 決定是否顯示這些元件：
   ```jsx
   // 檢查是否應該顯示成人預防保健資料
   const shouldShowAdultHealthCheck = useMemo(() => 
     cloudSettings?.fetchAdultHealthCheck === true, 
     [cloudSettings]
   );

   // 檢查是否應該顯示四癌篩檢資料
   const shouldShowCancerScreening = useMemo(() => 
     cloudSettings?.fetchCancerScreening === true, 
     [cloudSettings]
   );
   ```

2. **條件渲染元件** - 只有當設定允許時才顯示相應元件：
   ```jsx
   {/* 成人預防保健 - only display if setting is enabled */}
   {shouldShowAdultHealthCheck && (
     <Overview_AdultHealthCheck
       adultHealthCheckData={adultHealthCheckData}
       generalDisplaySettings={generalDisplaySettings}
     />
   )}

   {/* 四癌篩檢 - only display if setting is enabled */}
   {shouldShowCancerScreening && (
     <Overview_CancerScreening
       cancerScreeningData={cancerScreeningData}
       generalDisplaySettings={generalDisplaySettings}
     />
   )}
   ```

3. **元件資料擷取** - 即使沒有從父元件傳遞資料，各元件也會嘗試從全局變數擷取資料：
   ```jsx
   useEffect(() => {
     // 如果有 prop 資料，使用它
     if (adultHealthCheckData) {
       setCombinedData(adultHealthCheckData);
       return;
     }
     
     // 否則，嘗試從全局變數擷取資料
     if (window.adultHealthCheckData) {
       console.log("Found adult health check data in window global:", window.adultHealthCheckData);
       setCombinedData(window.adultHealthCheckData);
     }
   }, [adultHealthCheckData]);
   ```

## 5. 設定問題與解決方案

當出現 "Setter setAdultHealthCheckData not found, storing data in window.adultHealthCheckData" 訊息時，說明：

1. 資料已被抓取且處理
2. `dataManager.js` 中的 `safeSetter` 函式找不到已註冊的 `setAdultHealthCheckData` 函式
3. 系統會自動將資料存在 `window.adultHealthCheckData` 全局變數中

這不是錯誤，而是一種備用機制，因為 Overview_AdultHealthCheck 元件會檢查全局變數來擷取資料，所以資料仍然可以正確顯示。

## 總結

設定的變更流程是：
1. UI 操作 → 
2. Chrome Storage 儲存 → 
3. 內容腳本接收設定變更 → 
4. 下次資料抓取時根據設定決定是否抓取 → 
5. 資料處理後保存在 React 狀態或全局變數 → 
6. UI 根據設定決定是否顯示相應元件 → 
7. 元件從 props 或全局變數擷取資料顯示
