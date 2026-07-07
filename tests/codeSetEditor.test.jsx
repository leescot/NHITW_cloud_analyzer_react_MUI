// tests/codeSetEditor.test.jsx
import { describe, it, assert, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { render, fireEvent, waitFor, within, cleanup } from '@testing-library/react';
import CodeSetEditor from '../src/components/settings/CodeSetEditor.jsx';

let store, setCalls;
// 專案未開 vitest globals,RTL 不會自動 cleanup,手動清避免跨測試 DOM 殘留
afterEach(() => cleanup());
beforeEach(() => {
  store = {};
  setCalls = [];
  globalThis.chrome.storage.sync.get = (defaults, cb) => {
    const base = Array.isArray(defaults)
      ? Object.fromEntries(defaults.map(k => [k, undefined]))
      : { ...defaults };
    cb({ ...base, ...store });
  };
  globalThis.chrome.storage.sync.set = (items, cb) => {
    setCalls.push(items);
    Object.assign(store, items);
    cb?.();
  };
  globalThis.chrome.tabs = {
    query: (_q, cb) => cb([]),
    sendMessage: () => {},
  };
});

describe('CodeSetEditor(labFocus)', () => {
  // 提示:catalog 302 筆常駐 DOM(MUI Collapse 預設不 unmount 未展開內容,依 brief 設計不虛擬化),
  // 在整套 suite 平行跑時的 render/effect 耗時偶爾超過 vitest 預設 5000ms,故個別測試延長逾時。
  it('開啟時渲染內建清單(依 order),代碼以小字顯示', async () => {
    const { findByText, getByText } = render(
      <CodeSetEditor codeSetId="labFocus" open onClose={() => {}} />
    );
    await findByText('Hb');            // 內建項 label
    getByText('BUN');
    getByText('09002C');               // 代碼小字
  }, 15000);

  it('切換啟用+保存 → 寫入 overlay delta 並關閉', async () => {
    let closed = false;
    const { findByText, getAllByRole, getByRole } = render(
      <CodeSetEditor codeSetId="labFocus" open onClose={() => { closed = true; }} />
    );
    await findByText('Hb');
    // 第一個 checkbox 是 WBC(內建停用)→ 勾選改啟用
    fireEvent.click(getAllByRole('checkbox')[0]);
    fireEvent.click(getByRole('button', { name: '保存' }));
    await waitFor(() => assert.isTrue(closed));
    assert.equal(setCalls.length, 1);
    assert.deepEqual(setCalls[0].labFocusOverlay.overrides.wbc, { enabled: true });
    assert.deepEqual(setCalls[0].labFocusOverlay.additions, []);
  }, 15000);

  it('從目錄加入一對一項、從 alias 組加入 CBC → 保存進 additions', async () => {
    const { findByText, getByText, getByRole } = render(
      <CodeSetEditor codeSetId="labFocus" open onClose={() => {}} />
    );
    await findByText('Hb');
    fireEvent.click(getByRole('button', { name: '從常用項目加入' }));
    fireEvent.click(getByText('CRP'));          // 目錄項:點擊即加入
    fireEvent.click(getByText('CBC'));          // alias 組:點擊即加入
    fireEvent.click(getByRole('button', { name: '保存' }));
    await waitFor(() => assert.equal(setCalls.length, 1));
    const adds = setCalls[0].labFocusOverlay.additions;
    assert.deepEqual(adds.map(a => a.id), ['catalog:12015C', 'alias:cbc']);
    assert.deepEqual(adds[1].codes, ['08011C', '08003C']);
  }, 15000);

  it('全部還原預設:二次確認後寫 null', async () => {
    store.labFocusOverlay = { overrides: { wbc: { enabled: true } }, additions: [], removals: [] };
    const { findByText, getByRole } = render(
      <CodeSetEditor codeSetId="labFocus" open onClose={() => {}} />
    );
    await findByText('Hb');
    fireEvent.click(getByRole('button', { name: '全部還原預設' }));
    fireEvent.click(getByRole('button', { name: '確認還原' }));
    await waitFor(() => assert.equal(setCalls.length, 1));
    assert.isNull(setCalls[0].labFocusOverlay);
  }, 15000);

  it('sync quota 超額:保存失敗時不關閉對話框,顯示錯誤訊息', async () => {
    let closed = false;
    const { findByText, getByRole, findByText: findByTextAgain } = render(
      <CodeSetEditor codeSetId="labFocus" open onClose={() => { closed = true; }} />
    );
    await findByText('Hb');

    globalThis.chrome.storage.sync.set = (items, cb) => {
      setCalls.push(items);
      globalThis.chrome.runtime.lastError = { message: 'QUOTA_BYTES_PER_ITEM quota exceeded' };
      cb?.();
      globalThis.chrome.runtime.lastError = undefined;
    };

    fireEvent.click(getByRole('button', { name: '保存' }));
    await findByTextAgain(/儲存失敗/);
    assert.isFalse(closed);
    assert.equal(setCalls.length, 1);

    // 修復後(儲存不再出錯)再次保存應成功關閉
    globalThis.chrome.storage.sync.set = (items, cb) => {
      setCalls.push(items);
      Object.assign(store, items);
      cb?.();
    };
    fireEvent.click(getByRole('button', { name: '保存' }));
    await waitFor(() => assert.isTrue(closed));
    assert.equal(setCalls.length, 2);
  }, 15000);
});
