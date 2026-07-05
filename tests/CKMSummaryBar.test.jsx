// CKMSummaryBar 遷移 SettingsContext(技術債 #2)的行為測試:
// 篩檢開關 enableCKMScreening 改由 useGeneralDisplaySettings() 讀取,不再吃 gds prop。
import { describe, it, assert } from 'vitest';
import React from 'react';
import { render } from '@testing-library/react';

import CKMSummaryBar from '../src/components/tabs/ckm/CKMSummaryBar.jsx';
import { SettingsProvider } from '../src/contexts/SettingsContext.jsx';
import { DEFAULT_SETTINGS } from '../src/config/defaultSettings.js';

function daysAgo(n) {
  const d = new Date(Date.now() - n * 24 * 60 * 60 * 1000);
  return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`;
}

// 可算出 FIB-4 與 TyG 的同日抽血(fixture 對齊 test_screeningIndicators.js)
const screenableLabs = () => [{
  date: daysAgo(3),
  labs: [
    { orderCode: '09025C', value: '40', unit: 'U/L' },        // AST
    { orderCode: '09026C', value: '30', unit: 'U/L' },        // ALT
    { orderCode: '08011C', itemName: 'Platelet', value: '200', unit: 'x10^3/uL' },
    { orderCode: '09004C', value: '150', unit: 'mg/dL' },     // TG
    { orderCode: '09005C', value: '100', unit: 'mg/dL' },     // Glucose
  ],
}];

const baseProps = () => ({
  // latestHbA1c 讓「近期檢驗」區塊必定渲染,bar 不會因三區皆空而 return null
  summary: { latestHbA1c: { value: 6.5, date: daysAgo(3) } },
  medications: [],
  groupedLabs: screenableLabs(),
  userInfo: { age: 50, gender: 'M' },
});

const renderWithScreening = (enabled) => render(
  <SettingsProvider
    appSettings={{}}
    generalDisplaySettings={{ ...DEFAULT_SETTINGS.general, enableCKMScreening: enabled }}
  >
    <CKMSummaryBar {...baseProps()} />
  </SettingsProvider>
);

describe('components/tabs/ckm/CKMSummaryBar(SettingsContext 遷移)', function () {
  it('Provider 開啟 enableCKMScreening 時顯示篩檢區(不需 gds prop)', function () {
    const { container } = renderWithScreening(true);
    assert.include(container.textContent, '篩檢');
    assert.match(container.textContent, /FIB-4/);
  });

  it('Provider 關閉 enableCKMScreening 時不顯示篩檢區,近期檢驗照常顯示', function () {
    const { container } = renderWithScreening(false);
    assert.notInclude(container.textContent, '篩檢');
    assert.include(container.textContent, '近期檢驗');
    assert.match(container.textContent, /HbA1c/);
  });

  it('無 Provider 時走預設值(enableCKMScreening: false),不顯示篩檢區且不拋錯', function () {
    const { container } = render(<CKMSummaryBar {...baseProps()} />);
    assert.notInclude(container.textContent, '篩檢');
    assert.include(container.textContent, '近期檢驗');
  });

  it('summary 為 null 時不渲染(既有行為 pin)', function () {
    const { container } = render(
      <CKMSummaryBar summary={null} medications={[]} groupedLabs={[]} userInfo={null} />
    );
    assert.equal(container.innerHTML, '');
  });
});
