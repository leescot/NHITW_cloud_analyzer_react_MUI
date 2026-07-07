// 匯入覆蓋率掃描:用「真實的 processLocalData」逐檔匯入下載 JSON,
// 回報檔內有哪些資料 key 沒被匯入對照表(LOCAL_KEY_TO_STORE_TYPE)吃掉。
// 動過匯入邏輯(localDataHandler / coreTypes exportKey)後,對本機測資跑一輪
// 即可回歸「舊下載檔零遺漏」——只輸出 key 名與筆數,不輸出任何病歷內容。
//
// 用法(於 repo 根目錄):
//   npx vite-node scripts/check-import-coverage.mjs                      # 預設掃 .test_data/json
//   npx vite-node scripts/check-import-coverage.mjs -- <目錄或檔案...>   # 指定目標
//
// 注意:.test_data/ 為真實個資(gitignore),本工具僅供本機使用;輸出請勿貼進版控。
import fs from 'node:fs';
import path from 'node:path';

// ---- 瀏覽器/chrome 環境最小 stub(processLocalData 執行期需要) ----
globalThis.chrome = { runtime: { sendMessage: () => {} } };
globalThis.localStorage = {
  _m: new Map(),
  getItem(k) { return this._m.get(k) ?? null; },
  setItem(k, v) { this._m.set(k, v); },
  removeItem(k) { this._m.delete(k); },
};
if (typeof globalThis.window === 'undefined') globalThis.window = globalThis;
if (!globalThis.dispatchEvent) globalThis.dispatchEvent = () => {};

// stub 就緒後才載入(模組內函式執行期會用到 window/localStorage/chrome)
const { dataStore, DATA_TYPES } = await import('../src/store/dataStore.js');
const { processLocalData } = await import('../src/localDataHandler.js');

// loadedTypes 的顯示標籤 → 檔內 jsonKey(localDataHandler 的 LOADED_TYPE_LABEL 反查)
const LABEL_TO_JSON_KEY = new Map([['labData', 'lab'], ['chineseMed', 'chinesemed']]);
const META_KEYS = new Set(['UserName', 'UserID', 'UserSex', 'UserBirthday', 'ClientTime']);

const args = process.argv.slice(2).filter((a) => a !== '--');
const targets = args.length > 0 ? args : ['.test_data/json'];
const files = targets.flatMap((a) => {
  if (!fs.existsSync(a)) {
    console.error(`找不到目標:${a}`);
    process.exit(1);
  }
  const st = fs.statSync(a);
  if (st.isDirectory()) {
    return fs.readdirSync(a).filter((f) => f.endsWith('.json')).map((f) => path.join(a, f));
  }
  return [a];
});

let filesWithDrops = 0;
const droppedKeyTally = new Map(); // key → 出現在幾個檔案
let firstDetailPrinted = false;

for (const file of files) {
  let json;
  try {
    json = JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    console.log(`✗ ${path.basename(file)}: JSON 解析失敗,略過`);
    continue;
  }
  const result = await processLocalData(json, path.basename(file));
  if (!result.success) {
    console.log(`✗ ${path.basename(file)}: 匯入失敗 — ${result.message}`);
    filesWithDrops += 1;
    continue;
  }
  const consumedJsonKeys = new Set(
    result.loadedTypes.map((label) => LABEL_TO_JSON_KEY.get(label) ?? label)
  );
  // 值為 falsy(null/空)的鍵本來就無資料可匯,不列入應匯入清單
  const fileDataKeys = Object.keys(json).filter((k) => !META_KEYS.has(k) && json[k]);
  const dropped = fileDataKeys.filter((k) => !consumedJsonKeys.has(k));

  for (const k of dropped) droppedKeyTally.set(k, (droppedKeyTally.get(k) ?? 0) + 1);
  if (dropped.length > 0) filesWithDrops += 1;

  // 第一個檔案印各型別筆數當樣本;其餘只在有遺漏時列出
  if (!firstDetailPrinted) {
    firstDetailPrinted = true;
    console.log(`── 樣本詳細:${path.basename(file)} ──`);
    for (const t of DATA_TYPES) {
      const d = dataStore.getData(t);
      if (d == null) continue;
      const n = Array.isArray(d?.rObject) ? d.rObject.length
        : d?.nodes ? `permission(nodes=${d.nodes.length})` : '(非 rObject 形狀)';
      console.log(`   ${t}: ${n}`);
    }
    console.log(`   檔內資料鍵 ${fileDataKeys.length} 個,匯入 ${consumedJsonKeys.size} 種`);
  }
  if (dropped.length > 0) {
    console.log(`✗ ${path.basename(file)} 有被丟棄的 key:${dropped.join(', ')}`);
  }
}

console.log('\n=== 總結 ===');
console.log(`檔案數:${files.length};有遺漏/失敗的檔案:${filesWithDrops}`);
if (droppedKeyTally.size === 0) {
  console.log('全部檔案的所有資料 key 都被匯入,無遺漏。');
} else {
  console.log('被丟棄的 key(出現檔數):');
  for (const [k, n] of [...droppedKeyTally.entries()].sort((a, b) => b[1] - a[1])) {
    console.log(`   ${k}: ${n}`);
  }
  process.exitCode = 1;
}
