import { describe, it, assert } from 'vitest';

import {
  getAuthorizedDataTypes,
  shouldFetchSpecialData,
  SPECIAL_DATA_TYPE_SETTING_KEYS,
} from '../src/apiInterceptor/authorization.js';
import { NODE_TO_DATA_TYPE } from '../src/apiInterceptor/permissionMap.js';

describe('apiInterceptor/authorization', function () {
  describe('.getAuthorizedDataTypes', function () {
    it('maps a single permission node to its data type(s) per NODE_TO_DATA_TYPE', function () {
      const authorized = getAuthorizedDataTypes(['2.1']);
      assert.isTrue(authorized.has('medication'));
      // 只有 2.1 對應的型別 + 強制加入的 chronicMed
      assert.deepEqual([...authorized].sort(), ['chronicMed', 'medication'].sort());
    });

    it('expands a node that maps to multiple data types (6.1 → labdata + labdraw)', function () {
      const authorized = getAuthorizedDataTypes(['6.1']);
      assert.isTrue(authorized.has('labdata'));
      assert.isTrue(authorized.has('labdraw'));
    });

    it('unions data types across multiple permission nodes', function () {
      const authorized = getAuthorizedDataTypes(['2.1', '5.1', '7.1']);
      assert.isTrue(authorized.has('medication'));
      assert.isTrue(authorized.has('allergy'));
      assert.isTrue(authorized.has('surgery'));
    });

    it('ignores unknown/unmapped permission nodes without throwing', function () {
      const authorized = getAuthorizedDataTypes(['9.9', 'not-a-node']);
      assert.deepEqual([...authorized], ['chronicMed']);
    });

    it('always force-adds chronicMed even when permissions is empty', function () {
      const authorized = getAuthorizedDataTypes([]);
      assert.isTrue(authorized.has('chronicMed'));
      assert.strictEqual(authorized.size, 1);
    });

    it('always force-adds chronicMed alongside other authorized types', function () {
      const authorized = getAuthorizedDataTypes(['2.1']);
      assert.isTrue(authorized.has('chronicMed'));
    });

    it('covers every node declared in NODE_TO_DATA_TYPE', function () {
      const allNodes = Object.keys(NODE_TO_DATA_TYPE);
      const authorized = getAuthorizedDataTypes(allNodes);
      const expectedTypes = new Set(['chronicMed']);
      for (const node of allNodes) {
        NODE_TO_DATA_TYPE[node].forEach(t => expectedTypes.add(t));
      }
      assert.deepEqual([...authorized].sort(), [...expectedTypes].sort());
    });
  });

  describe('.shouldFetchSpecialData', function () {
    it('returns true when the corresponding cloud setting is enabled (adultHealthCheck)', function () {
      const result = shouldFetchSpecialData('adultHealthCheck', { fetchAdultHealthCheck: true });
      assert.isTrue(result);
    });

    it('returns false when the corresponding cloud setting is disabled (adultHealthCheck)', function () {
      const result = shouldFetchSpecialData('adultHealthCheck', { fetchAdultHealthCheck: false });
      assert.isFalse(result);
    });

    it('returns true when the corresponding cloud setting is enabled (cancerScreening)', function () {
      const result = shouldFetchSpecialData('cancerScreening', { fetchCancerScreening: true });
      assert.isTrue(result);
    });

    it('returns false when the corresponding cloud setting is disabled (cancerScreening)', function () {
      const result = shouldFetchSpecialData('cancerScreening', { fetchCancerScreening: false });
      assert.isFalse(result);
    });

    it('returns true when the corresponding cloud setting is enabled (hbcvdata)', function () {
      const result = shouldFetchSpecialData('hbcvdata', { fetchHbcvdata: true });
      assert.isTrue(result);
    });

    it('returns false when the corresponding cloud setting is disabled (hbcvdata)', function () {
      const result = shouldFetchSpecialData('hbcvdata', { fetchHbcvdata: false });
      assert.isFalse(result);
    });

    it('returns true for a non-special data type regardless of cloudSettings content', function () {
      assert.isTrue(shouldFetchSpecialData('labdraw', {}));
      assert.isTrue(shouldFetchSpecialData('medication', { fetchAdultHealthCheck: false }));
    });

    it('does not throw and returns true for a non-special type when cloudSettings is undefined', function () {
      assert.doesNotThrow(() => shouldFetchSpecialData('labdraw', undefined));
      assert.isTrue(shouldFetchSpecialData('labdraw', undefined));
    });

    it('exposes SPECIAL_DATA_TYPE_SETTING_KEYS matching the three special data types', function () {
      assert.deepEqual(SPECIAL_DATA_TYPE_SETTING_KEYS, {
        adultHealthCheck: 'fetchAdultHealthCheck',
        cancerScreening: 'fetchCancerScreening',
        hbcvdata: 'fetchHbcvdata',
      });
    });
  });
});
