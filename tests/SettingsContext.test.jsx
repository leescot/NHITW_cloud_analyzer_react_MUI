import { describe, it, assert } from 'vitest';
import React from 'react';
import { renderHook } from '@testing-library/react';

import {
  SettingsProvider,
  useAppSettings,
  useGeneralDisplaySettings,
} from '../src/contexts/SettingsContext.jsx';
import { DEFAULT_SETTINGS } from '../src/config/defaultSettings.js';

describe('contexts/SettingsContext', function () {
  it('useGeneralDisplaySettings 無 Provider 時回傳預設值', function () {
    const { result } = renderHook(() => useGeneralDisplaySettings());
    assert.deepEqual(result.current, DEFAULT_SETTINGS.general);
  });

  it('useGeneralDisplaySettings 回傳 Provider 提供的值', function () {
    const provided = { ...DEFAULT_SETTINGS.general, contentTextSize: 'large' };
    const wrapper = ({ children }) => (
      <SettingsProvider appSettings={{}} generalDisplaySettings={provided}>
        {children}
      </SettingsProvider>
    );
    const { result } = renderHook(() => useGeneralDisplaySettings(), { wrapper });
    assert.equal(result.current.contentTextSize, 'large');
  });

  it('useAppSettings 回傳 Provider 提供的值', function () {
    const provided = { western: { showDiagnosis: true } };
    const wrapper = ({ children }) => (
      <SettingsProvider appSettings={provided} generalDisplaySettings={DEFAULT_SETTINGS.general}>
        {children}
      </SettingsProvider>
    );
    const { result } = renderHook(() => useAppSettings(), { wrapper });
    assert.deepEqual(result.current, provided);
  });

  it('useAppSettings 無 Provider 時回傳預設 shape(含 western/lab/general 等)', function () {
    const { result } = renderHook(() => useAppSettings());
    assert.isObject(result.current.western);
    assert.isObject(result.current.lab);
  });

  it('Provider 更新 generalDisplaySettings 後,useGeneralDisplaySettings 回傳新值', function () {
    // 注意:@testing-library/react v16 的 renderHook 不會把 initialProps/rerender(props)
    // 傳給 wrapper(這些參數只會傳給 hook callback 本身)。wrapper 在每次 rerender 時仍會
    // 重新執行,因此改用外部可變變數,讓 wrapper 在重新執行時讀到新值,藉此驗證
    // Provider 本身在拿到新的 generalDisplaySettings 物件時,消費端 hook 會拿到新值。
    const first = { ...DEFAULT_SETTINGS.general, contentTextSize: 'small' };
    const second = { ...DEFAULT_SETTINGS.general, contentTextSize: 'large' };
    let current = first;
    const wrapper = ({ children }) => (
      <SettingsProvider appSettings={{}} generalDisplaySettings={current}>
        {children}
      </SettingsProvider>
    );
    const { result, rerender } = renderHook(() => useGeneralDisplaySettings(), { wrapper });
    assert.equal(result.current.contentTextSize, 'small');
    current = second;
    rerender();
    assert.equal(result.current.contentTextSize, 'large');
  });

  it('Provider 更新 appSettings 後,useAppSettings 回傳新值', function () {
    const first = { western: { showDiagnosis: false } };
    const second = { western: { showDiagnosis: true } };
    let current = first;
    const wrapper = ({ children }) => (
      <SettingsProvider appSettings={current} generalDisplaySettings={DEFAULT_SETTINGS.general}>
        {children}
      </SettingsProvider>
    );
    const { result, rerender } = renderHook(() => useAppSettings(), { wrapper });
    assert.equal(result.current.western.showDiagnosis, false);
    current = second;
    rerender();
    assert.equal(result.current.western.showDiagnosis, true);
  });
});
