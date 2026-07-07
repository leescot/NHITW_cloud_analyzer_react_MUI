import { describe, it, assert, beforeEach } from 'vitest';

import { dataStore } from '../src/store/dataStore.js';
import { processLocalData } from '../src/localDataHandler.js';

describe('localDataHandler.processLocalData — 換人完整替換', function () {
  beforeEach(() => {
    dataStore.clearAll();
    delete window._localUserInfo;
  });

  it('新 JSON 缺少的型別要被清空(不殘留前一人資料)', async function () {
    // 甲:有西藥 + 中藥
    await processLocalData({
      UserName: '甲', UserID: 'A1',
      medication: { rObject: [{ drug: 'A藥' }] },
      chinesemed: { rObject: [{ herb: 'A方' }] },
    }, 'a.json');
    assert.isNotNull(dataStore.getData('chinesemed'));

    // 乙:只有西藥
    await processLocalData({
      UserName: '乙', UserID: 'B2',
      medication: { rObject: [{ drug: 'B藥' }] },
    }, 'b.json');

    assert.deepEqual(dataStore.getData('medication'), { rObject: [{ drug: 'B藥' }] });
    assert.isNull(dataStore.getData('chinesemed')); // ← 修復前 FAIL:仍是甲的中藥
  });

  it('無效輸入不清空既有資料', async function () {
    await processLocalData({ medication: { rObject: [{ drug: 'A藥' }] } }, 'a.json');
    await processLocalData(null, 'bad.json'); // processLocalData 內部會顯式擋下無效輸入,回傳 success:false(不再依賴 null 存取的意外例外)
    assert.isNotNull(dataStore.getData('medication'));
  });

  // round-trip 補完:labdraw / permission / 開發者補抓型別可匯入回 dataStore(spec v2 §7.2)
  it('匯入含 labdraw / permission / 開發者補抓型別的 JSON,dataStore 有值且 loadedTypes 正確', async function () {
    const result = await processLocalData({
      UserName: '丙', UserID: 'C3',
      medication: { rObject: [{ drug: 'C藥' }] },
      labdraw: { rObject: [{ img: 'C圖' }] },
      permission: { nodes: ['4.1', '9.1'], dataTypes: ['dental', 'rehabilitation'] },
      dental: { rObject: [{ tooth: 'C牙' }] },
      rehabilitationSummary: { rObject: [{ type: 'C復健' }] },
    }, 'c.json');

    assert.isTrue(result.success);
    assert.deepEqual(dataStore.getData('labdraw'), { rObject: [{ img: 'C圖' }] });
    assert.deepEqual(dataStore.getData('permission'), { nodes: ['4.1', '9.1'], dataTypes: ['dental', 'rehabilitation'] });
    assert.deepEqual(dataStore.getData('dental'), { rObject: [{ tooth: 'C牙' }] });
    assert.deepEqual(dataStore.getData('rehabilitationSummary'), { rObject: [{ type: 'C復健' }] });
    // loadedTypes 應含新型別(無自訂 label 者原樣回傳 key)
    assert.includeMembers(result.loadedTypes, ['labdraw', 'permission', 'dental', 'rehabilitationSummary']);
  });

  it('JSON 未含開發者補抓型別時,不影響既有型別匯入', async function () {
    const result = await processLocalData({
      medication: { rObject: [{ drug: 'D藥' }] },
    }, 'd.json');
    assert.isTrue(result.success);
    assert.deepEqual(dataStore.getData('medication'), { rObject: [{ drug: 'D藥' }] });
    assert.isNull(dataStore.getData('dental'));
    assert.isNull(dataStore.getData('permission'));
  });

  it('舊版下載 JSON(小寫 patientsummary + masterMenu)可完整匯入(round-trip 修復)', async function () {
    const result = await processLocalData({
      UserName: '丁', UserID: 'D4',
      lab: { rObject: [{ lab: 'D檢' }] },
      patientsummary: { rObject: [{ s: 'D摘' }] },
      masterMenu: { rObject: [{ m: 'D單' }] },
    }, 'd-legacy.json');
    assert.isTrue(result.success);
    assert.deepEqual(dataStore.getData('labdata'), { rObject: [{ lab: 'D檢' }] });
    assert.deepEqual(dataStore.getData('patientsummary'), { rObject: [{ s: 'D摘' }] });
    assert.deepEqual(dataStore.getData('masterMenu'), { rObject: [{ m: 'D單' }] });
    assert.includeMembers(result.loadedTypes, ['labData', 'patientsummary', 'masterMenu']);
  });
});
