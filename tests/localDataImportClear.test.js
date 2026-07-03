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
});
