import { describe, it, assert, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

import { useUserInfo } from '../src/hooks/useUserInfo.js';

describe('hooks/useUserInfo', function () {
  beforeEach(() => {
    sessionStorage.removeItem('token');
    delete window._localUserInfo;
  });

  afterEach(() => {
    delete window._localUserInfo;
  });

  it('open=false 時不取使用者資訊', function () {
    window._localUserInfo = { name: '測試', userId: 'A1', gender: 'M', birthday: '0790115' };
    const { result } = renderHook(() => useUserInfo(false));
    assert.isNull(result.current.userInfo);
  });

  it('open=true 且無 token 時 fallback 到本地匯入資訊', function () {
    window._localUserInfo = { name: '測試', userId: 'A1', gender: 'M', birthday: '0790115' };
    const { result } = renderHook(() => useUserInfo(true));
    assert.equal(result.current.userInfo?.name, '測試');
    assert.isNumber(result.current.userInfo?.age);
  });

  it('open=true 且無任何來源時 userInfo 為 null', function () {
    const { result } = renderHook(() => useUserInfo(true));
    assert.isNull(result.current.userInfo);
  });

  it('回傳 setUserInfo 可手動更新(供本地匯入路徑)', function () {
    const { result } = renderHook(() => useUserInfo(false));
    const info = { name: '手動', userId: 'B2' };
    act(() => result.current.setUserInfo(info));
    assert.strictEqual(result.current.userInfo, info);
  });
});
