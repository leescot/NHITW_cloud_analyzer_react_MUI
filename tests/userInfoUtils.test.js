// userInfoUtils 測試(技術債 #1 年齡計算整併):
// 1. characterization——token 路徑(extractUserInfoFromToken)與本地匯入路徑
//    (ageUtils.calculateAgeFromROCBirthday)對同一生日必須算出同一足歲。
// 2. 新行為——垃圾生日字串 age 應為 null(整併前 token 路徑會算出 NaN,
//    formatUserInfoDisplay 會顯示「NaN」)。
import { describe, it, assert, beforeEach, afterEach, vi } from 'vitest';

import { extractUserInfoFromToken, formatUserInfoDisplay } from '../src/utils/userInfoUtils.js';
import { calculateAgeFromROCBirthday } from '../src/utils/ageUtils.js';

// 對齊 tokenUtils.getTokenPayload 的解碼方式(base64 + UTF-8 percent-decode)
const setToken = (payload) => {
  const b64 = btoa(unescape(encodeURIComponent(JSON.stringify(payload))));
  sessionStorage.setItem('token', `header.${b64}.sig`);
};

describe('utils/userInfoUtils', function () {
  beforeEach(() => {
    vi.useFakeTimers();
    sessionStorage.removeItem('token');
  });
  afterEach(() => {
    vi.useRealTimers();
    sessionStorage.removeItem('token');
  });

  describe('.extractUserInfoFromToken', function () {
    it('由 token payload 組出 userInfo(含足歲)', function () {
      vi.setSystemTime(new Date(2026, 6, 2)); // 2026-07-02
      setToken({ UserName: '王小明', UserID: 'A123456789', UserSex: 'M', UserBirthday: '0790115' });
      assert.deepEqual(extractUserInfoFromToken(), {
        name: '王小明',
        userId: 'A123456789',
        gender: 'M',
        birthday: '0790115',
        age: 36,
      });
    });

    it('無 token 時回傳 null', function () {
      assert.isNull(extractUserInfoFromToken());
    });

    it('生日缺漏或長度不對時 age 為 null', function () {
      setToken({ UserName: '王小明', UserBirthday: '' });
      assert.isNull(extractUserInfoFromToken().age);
      setToken({ UserName: '王小明', UserBirthday: '790115' }); // 6 碼
      assert.isNull(extractUserInfoFromToken().age);
    });

    it('生日為 7 碼垃圾字串時 age 為 null(不可是 NaN,避免顯示「NaN」)', function () {
      setToken({ UserName: '王小明', UserBirthday: 'abcdefg' });
      assert.isNull(extractUserInfoFromToken().age);
    });
  });

  describe('token 路徑與本地匯入路徑的年齡一致性(兩條 userInfo 組裝路徑)', function () {
    const birthdays = ['0790115', '0791231', '0800101', '0350630', '1130229'];
    const todays = [
      new Date(2026, 0, 1),   // 年初
      new Date(2026, 0, 15),  // 其中一個生日當天
      new Date(2026, 5, 30),  // 年中(其中一個生日當天)
      new Date(2026, 11, 31), // 年末(其中一個生日當天)
    ];

    for (const today of todays) {
      it(`以 ${today.getFullYear()}/${today.getMonth() + 1}/${today.getDate()} 為今天,兩路徑足歲一致`, function () {
        vi.setSystemTime(today);
        for (const birthday of birthdays) {
          setToken({ UserBirthday: birthday });
          const tokenAge = extractUserInfoFromToken().age;
          const localAge = calculateAgeFromROCBirthday(birthday);
          assert.strictEqual(tokenAge, localAge, `birthday=${birthday}`);
        }
      });
    }
  });

  describe('.formatUserInfoDisplay', function () {
    it('姓名 + 年齡 + 性別', function () {
      assert.equal(
        formatUserInfoDisplay({ name: '王小明', userId: 'A1', gender: 'M', age: 36 }),
        '王小明(36M)'
      );
    });

    it('age 為 null 時只顯示性別', function () {
      assert.equal(
        formatUserInfoDisplay({ name: '王小明', userId: 'A1', gender: 'M', age: null }),
        '王小明(M)'
      );
    });

    it('null userInfo 回傳空字串', function () {
      assert.equal(formatUserInfoDisplay(null), '');
    });
  });
});
