// MainDialogHeader tab registry(DOC/07 方向三 / 地雷 #2)行為測試:
// 每個 Tab 有穩定字串 id(tabIds.js 單一來源),onTabChange 回報 id 而非數字 index,
// 插入/移除 tab 不再使後面的 tab 位移。
import { describe, it, assert, vi, afterEach } from 'vitest';
import React from 'react';
import { render, fireEvent, cleanup } from '@testing-library/react';

import MainDialogHeader from '../src/components/MainDialogHeader.jsx';
import { TAB } from '../src/components/tabs/tabIds.js';

const baseProps = (overrides = {}) => ({
  tabValue: false,
  onTabChange: vi.fn(),
  onOverviewClick: vi.fn(),
  userInfo: null,
  groupedMedications: [],
  groupedChineseMeds: [],
  groupedLabs: [],
  imagingData: { withReport: [], withoutReport: [] },
  medDaysData: [],
  allergyData: [],
  surgeryData: [],
  dischargeData: [],
  patientSummaryData: [],
  showAdvancedTab: false,
  ...overrides,
});

describe('components/MainDialogHeader(tab 字串 id)', function () {
  // 專案未開 vitest globals,RTL 不會自動 cleanup,手動清避免跨測試 DOM 殘留
  afterEach(() => cleanup());

  it('點擊「西藥」tab 時 onTabChange 收到字串 id(非數字 index)', function () {
    const props = baseProps();
    const { getByText } = render(<MainDialogHeader {...props} />);

    fireEvent.click(getByText(/西藥/));

    assert.equal(props.onTabChange.mock.calls.length, 1);
    assert.strictEqual(props.onTabChange.mock.calls[0][1], TAB.medication);
  });

  it('點擊「說明」tab 時收到 help id——即使前面的 tab 增減也不位移', function () {
    const props = baseProps();
    const { getByText } = render(<MainDialogHeader {...props} />);

    fireEvent.click(getByText('說明'));

    assert.strictEqual(props.onTabChange.mock.calls[0][1], TAB.help);
  });

  it('showAdvancedTab 開啟時「進階」tab 回報 advanced id', function () {
    const props = baseProps({ showAdvancedTab: true });
    const { getByText } = render(<MainDialogHeader {...props} />);

    fireEvent.click(getByText('進階'));

    assert.strictEqual(props.onTabChange.mock.calls[0][1], TAB.advanced);
  });

  it('tabValue 為字串 id 時對應 tab 呈選中狀態', function () {
    const props = baseProps({ tabValue: TAB.lab });
    const { getByText } = render(<MainDialogHeader {...props} />);

    const labTab = getByText(/檢驗 \(/).closest('button');
    assert.equal(labTab.getAttribute('aria-selected'), 'true');
  });
});
