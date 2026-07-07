// tests/overviewFocusOverlay.test.jsx
// 回歸測試(Finding 1):總覽關注檢驗表格列順序必須依 labFocusOverlay 解析後的順序,
// 不可再讀凍結的舊 focusedLabTests(舊鍵刻意給「不同順序」的預設值,用來反證沒有誤讀)。
import { describe, it, assert, afterEach, vi } from 'vitest';
import React from 'react';
import { render, cleanup } from '@testing-library/react';

// Mock LabItemTrendPopover to avoid MUI x-charts ESM import issues
vi.mock('../src/components/tabs/lab/LabItemTrendPopover.jsx', () => ({
  default: () => null,
}));

import Overview_LabTests from '../src/components/tabs/Overview_LabTests.jsx';
import { SettingsProvider } from '../src/contexts/SettingsContext.jsx';
import { DEFAULT_LAB_TESTS } from '../src/config/labTests.js';

afterEach(() => cleanup());

function daysAgo(n) {
  const d = new Date(Date.now() - n * 24 * 60 * 60 * 1000);
  return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`;
}

// overlay:交換 BUN(內建 order 3)與 GPT(內建 order 20)的 order → 解析後 GPT 應排在 BUN 之前。
const overviewSettings = {
  labTrackingDays: 90,
  focusedLabTests: DEFAULT_LAB_TESTS, // 舊鍵維持預設順序(BUN 在前、GPT 在後)──刻意與 overlay 相反,證明沒被誤讀
  labFocusOverlay: {
    overrides: { bun: { order: 20 }, gpt: { order: 3 } },
    additions: [],
    removals: [],
  },
};

const labGroups = () => [{
  date: daysAgo(2),
  labs: [
    { orderCode: '09002C', itemName: 'BUN', value: '23.4', unit: 'mg/dL' },
    { orderCode: '09026C', itemName: 'GPT', value: '18.0', unit: 'U/L' },
  ],
}];

describe('Overview_LabTests 列順序(overlay 回歸)', () => {
  it('overlay 交換 order 後,表格列順序依 overlay 而非舊 focusedLabTests', () => {
    const { container } = render(
      <SettingsProvider>
        <Overview_LabTests
          groupedLabs={labGroups()}
          overviewSettings={overviewSettings}
          labSettings={{ highlightAbnormalLab: true }}
        />
      </SettingsProvider>
    );

    // 列名放在每列第一個 <th scope="row">,依渲染順序收集文字
    const rowLabels = [...container.querySelectorAll('th[scope="row"]')].map(th => th.textContent);
    const bunIndex = rowLabels.indexOf('BUN');
    const gptIndex = rowLabels.indexOf('GPT');

    assert.isAbove(bunIndex, -1, 'BUN 應出現在表格中');
    assert.isAbove(gptIndex, -1, 'GPT 應出現在表格中');
    assert.isBelow(gptIndex, bunIndex, 'overlay 將 GPT order 改小於 BUN,GPT 應排在 BUN 之前');
  });
});
