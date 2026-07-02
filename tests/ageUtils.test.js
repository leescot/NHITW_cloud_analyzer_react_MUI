import { describe, it, assert, beforeEach, afterEach, vi } from 'vitest';

import { calculateAgeFromROCBirthday, buildUserInfoFromLocal } from '../src/utils/ageUtils.js';

describe('utils/ageUtils', function () {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); });

  describe('.calculateAgeFromROCBirthday', function () {
    // '0790115' = 民國79年1月15日 = 1990-01-15
    it('今年生日已過 → 足歲', function () {
      vi.setSystemTime(new Date(2026, 6, 2)); // 2026-07-02
      assert.equal(calculateAgeFromROCBirthday('0790115'), 36);
    });

    it('今年生日未到(月份未到)→ 少一歲', function () {
      vi.setSystemTime(new Date(2026, 0, 10)); // 2026-01-10
      assert.equal(calculateAgeFromROCBirthday('0790115'), 35);
    });

    it('當月但日期未到 → 少一歲', function () {
      vi.setSystemTime(new Date(2026, 0, 14)); // 2026-01-14
      assert.equal(calculateAgeFromROCBirthday('0790115'), 35);
    });

    it('生日當天 → 足歲', function () {
      vi.setSystemTime(new Date(2026, 0, 15)); // 2026-01-15
      assert.equal(calculateAgeFromROCBirthday('0790115'), 36);
    });

    it('無效輸入回傳 null', function () {
      assert.isNull(calculateAgeFromROCBirthday(null));
      assert.isNull(calculateAgeFromROCBirthday(undefined));
      assert.isNull(calculateAgeFromROCBirthday(''));
      assert.isNull(calculateAgeFromROCBirthday('123'));      // 長度不是 7
      assert.isNull(calculateAgeFromROCBirthday('abcdefg')); // 非數字
    });
  });

  describe('.buildUserInfoFromLocal', function () {
    it('組出含年齡的 userInfo', function () {
      vi.setSystemTime(new Date(2026, 6, 2));
      const local = { name: '王小明', userId: 'A123456789', gender: 'M', birthday: '0790115' };
      assert.deepEqual(buildUserInfoFromLocal(local), {
        name: '王小明',
        userId: 'A123456789',
        gender: 'M',
        birthday: '0790115',
        age: 36,
      });
    });

    it('null 輸入回傳 null', function () {
      assert.isNull(buildUserInfoFromLocal(null));
    });
  });
});
