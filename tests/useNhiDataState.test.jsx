import { describe, it, assert, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';

import { useNhiDataState } from '../src/hooks/useNhiDataState.js';
import { dataStore } from '../src/store/dataStore.js';

describe('hooks/useNhiDataState — 本地匯入 userInfo 更新', function () {
  const appSettingsRef = { current: { lab: {}, western: {}, chinese: {} } };
  // 必須是穩定參考:handleData 內多次 setState 會觸發 host 元件重新 render,
  // 若每次 render 都產生新的 labSettings 物件,會使 mount effect 的
  // [labSettings] 依賴持續變動而無限重新觸發 handleData(與待測 bug 無關的測試陷阱)。
  const labSettings = {};

  beforeEach(() => {
    dataStore.clearAll();
    delete window._localUserInfo;
  });
  afterEach(() => { delete window._localUserInfo; });

  it('換人匯入時 setUserInfo 以新資料呼叫(regression: 姓名不會換人)', async function () {
    const setUserInfo = vi.fn();
    const personA = { name: '甲', userId: 'A1', gender: 'M', birthday: '0790115' };
    const personB = { name: '乙', userId: 'B2', gender: 'F', birthday: '0800202' };

    window._localUserInfo = personA;
    const { result, rerender } = renderHook(
      ({ userInfo }) => useNhiDataState({ appSettingsRef, labSettings, userInfo, setUserInfo }),
      { initialProps: { userInfo: null } }
    );
    await act(async () => { await result.current.handleData(); });
    assert.equal(setUserInfo.mock.calls.at(-1)[0].name, '甲');

    // 模擬 FloatingIcon 已把 userInfo 設為甲後,匯入乙的資料
    rerender({ userInfo: setUserInfo.mock.calls.at(-1)[0] });
    window._localUserInfo = personB;
    await act(async () => { await result.current.handleData(); });
    assert.equal(setUserInfo.mock.calls.at(-1)[0].name, '乙'); // ← 修復前會 FAIL(仍是甲)
  });

  it('同一人重複匯入不重複呼叫 setUserInfo', async function () {
    const setUserInfo = vi.fn();
    const personA = { name: '甲', userId: 'A1', gender: 'M', birthday: '0790115' };
    window._localUserInfo = personA;
    const { result, rerender } = renderHook(
      ({ userInfo }) => useNhiDataState({ appSettingsRef, labSettings, userInfo, setUserInfo }),
      { initialProps: { userInfo: null } }
    );
    await act(async () => { await result.current.handleData(); });
    const callsAfterFirst = setUserInfo.mock.calls.length;
    rerender({ userInfo: setUserInfo.mock.calls.at(-1)[0] });
    await act(async () => { await result.current.handleData(); });
    assert.equal(setUserInfo.mock.calls.length, callsAfterFirst);
  });
});
