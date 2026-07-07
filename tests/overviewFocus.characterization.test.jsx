// tests/overviewFocus.characterization.test.jsx
// 總覽關注檢驗/影像比對行為基準(CodeSet 重構前鎖定;重構後必須原樣保持綠)。
// overviewSettings 同時提供新舊兩種設定形態:重構前讀 focusedLabTests/focusedImageTests,
// 重構後讀 labFocusOverlay/imageFocusOverlay(null = 用內建預設,兩者等價)。
import { describe, it, assert, vi } from 'vitest';
import React from 'react';
import { render } from '@testing-library/react';

// Mock LabItemTrendPopover to avoid MUI x-charts ESM import issues
vi.mock('../src/components/tabs/lab/LabItemTrendPopover.jsx', () => ({
  default: () => null,
}));

import Overview_LabTests from '../src/components/tabs/Overview_LabTests.jsx';
import Overview_ImagingTests from '../src/components/tabs/Overview_ImagingTests.jsx';
import { SettingsProvider } from '../src/contexts/SettingsContext.jsx';
import { DEFAULT_LAB_TESTS } from '../src/config/labTests.js';
import { DEFAULT_IMAGE_TESTS } from '../src/config/imageTests.js';

function daysAgo(n) {
  const d = new Date(Date.now() - n * 24 * 60 * 60 * 1000);
  return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`;
}

const overviewSettings = {
  labTrackingDays: 90,
  imageTrackingDays: 90,
  focusedLabTests: DEFAULT_LAB_TESTS,
  focusedImageTests: DEFAULT_IMAGE_TESTS,
  labFocusOverlay: null,
  imageFocusOverlay: null,
};

const labGroups = () => [{
  date: daysAgo(3),
  labs: [
    // CBC 子項:資料端 orderCode 是 08011C,靠 orderName 含 CBC + itemName 判子項(偽代碼 08011C-Hb)
    { orderCode: '08011C', orderName: 'CBC-I(WBC,RBC,HB,HCT,PLATELET COUNT,MCV,MCH,MCHC)', itemName: 'Hb', value: '13.5', unit: 'g/dL' },
    // 09015C 三分:無 GFR 字樣 → Cr;assayMethod 健保署計算 → eGFR(健保署)
    { orderCode: '09015C', itemName: 'Creatinine', value: '1.08', unit: 'mg/dL' },
    { orderCode: '09015C', itemName: 'GFR', assayMethod: '健保署計算', value: '85.2' },
    // 09040C:itemName 含 UPCR 才顯示
    { orderCode: '09040C', itemName: 'Urine protein/Creatinine ratio(UPCR)', value: '150.7' },
    // 標準碼
    { orderCode: '09002C', itemName: 'BUN', value: '23.4', unit: 'mg/dL' },
    // 預設停用(Ca)→ 不顯示
    { orderCode: '09011C', itemName: 'Ca', value: '9.87' },
    // 不在清單(Cl)→ 不顯示
    { orderCode: '09023C', itemName: 'Cl', value: '104.3' },
  ],
}];

describe('Overview 關注清單 characterization(重構行為基準)', () => {
  it('關注檢驗:CBC 子項/09015C 三分/UPCR 過濾/標準碼/停用與未列碼', () => {
    const { container } = render(
      <SettingsProvider>
        <Overview_LabTests
          groupedLabs={labGroups()}
          overviewSettings={overviewSettings}
          labSettings={{ highlightAbnormalLab: true }}
        />
      </SettingsProvider>
    );
    const text = container.textContent;
    assert.include(text, 'Hb');
    assert.include(text, '13.5');
    assert.include(text, '1.08');           // Cr
    assert.include(text, 'eGFR(健保署)');
    assert.include(text, '85.2');
    assert.include(text, 'UPCR');
    assert.include(text, '150.7');
    assert.include(text, 'BUN');
    assert.include(text, '23.4');
    assert.notInclude(text, '9.87');        // Ca 預設停用
    assert.notInclude(text, '104.3');       // 09023C 不在清單
  });

  it('關注影像:啟用碼(MRI)顯示、停用碼(CXR)隱藏', () => {
    const imagingData = {
      withReport: [
        { date: daysAgo(5), order_code: '33084B', orderName: '磁振造影檢查', inspectResult: 'Imaging findings: no acute lesion' },
      ],
      withoutReport: [
        { date: daysAgo(6), order_code: '32001C', orderName: '胸腔檢查' },
      ],
    };
    const { container } = render(
      <Overview_ImagingTests imagingData={imagingData} overviewSettings={overviewSettings} />
    );
    const text = container.textContent;
    assert.include(text, '磁振造影檢查');
    assert.notInclude(text, '胸腔檢查');
  });
});
