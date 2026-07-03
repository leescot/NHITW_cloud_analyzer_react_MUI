import { describe, it, assert } from 'vitest';

import { maskIdForFilename } from '../src/apiInterceptor/messageHandlers.js';

describe('apiInterceptor/messageHandlers.maskIdForFilename', function () {
  it('遮罩身分證號:前3碼 + xxxx + 末1碼(檔名安全,不用 *)', function () {
    assert.equal(maskIdForFilename('U100116529'), 'U10xxxx9');
    assert.notInclude(maskIdForFilename('A123456789'), '*');
  });

  it('過短或無效輸入回傳安全預設值', function () {
    assert.equal(maskIdForFilename('AB'), 'xxxx');
    assert.equal(maskIdForFilename(null), 'unknown');
    assert.equal(maskIdForFilename(undefined), 'unknown');
    assert.equal(maskIdForFilename(123), 'unknown');
  });
});
