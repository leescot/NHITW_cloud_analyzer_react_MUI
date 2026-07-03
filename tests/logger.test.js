import { describe, it, assert, beforeEach, afterEach, vi } from 'vitest';

import { debugLog, _resetDebugCache } from '../src/utils/logger.js';

describe('utils/logger', function () {
  let logSpy;

  beforeEach(() => {
    logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    _resetDebugCache();
    localStorage.removeItem('nhitw_debug');
  });

  afterEach(() => {
    logSpy.mockRestore();
    localStorage.removeItem('nhitw_debug');
    _resetDebugCache();
  });

  it('預設(無 debug flag)不輸出', function () {
    debugLog('hello');
    assert.equal(logSpy.mock.calls.length, 0);
  });

  it('localStorage nhitw_debug=1 時輸出', function () {
    localStorage.setItem('nhitw_debug', '1');
    _resetDebugCache();
    debugLog('hello', 123);
    assert.equal(logSpy.mock.calls.length, 1);
    assert.deepEqual(logSpy.mock.calls[0], ['hello', 123]);
  });

  it('localStorage 不可用時安全地不輸出(不拋錯)', function () {
    const original = globalThis.localStorage;
    Object.defineProperty(globalThis, 'localStorage', {
      get() { throw new Error('unavailable'); },
      configurable: true,
    });
    _resetDebugCache();
    assert.doesNotThrow(() => debugLog('hello'));
    Object.defineProperty(globalThis, 'localStorage', { value: original, configurable: true, writable: true });
  });

  it('flag 值非 "1" 時維持靜默', function () {
    localStorage.setItem('nhitw_debug', 'true');
    _resetDebugCache();
    debugLog('hello');
    assert.equal(logSpy.mock.calls.length, 0);

    localStorage.setItem('nhitw_debug', '0');
    _resetDebugCache();
    debugLog('hello');
    assert.equal(logSpy.mock.calls.length, 0);
  });

  it('啟用狀態會被快取,需呼叫 _resetDebugCache 才會重新讀取', function () {
    debugLog('hello');
    assert.equal(logSpy.mock.calls.length, 0);

    localStorage.setItem('nhitw_debug', '1');
    debugLog('hello');
    assert.equal(logSpy.mock.calls.length, 0);

    _resetDebugCache();
    debugLog('hello');
    assert.equal(logSpy.mock.calls.length, 1);
  });

  it('localStorage 為 undefined 時(MV3 service worker 情境)安全地不輸出', function () {
    const original = globalThis.localStorage;
    Object.defineProperty(globalThis, 'localStorage', {
      value: undefined,
      configurable: true,
    });
    _resetDebugCache();
    assert.doesNotThrow(() => debugLog('hello'));
    assert.equal(logSpy.mock.calls.length, 0);
    Object.defineProperty(globalThis, 'localStorage', { value: original, configurable: true, writable: true });
  });
});
