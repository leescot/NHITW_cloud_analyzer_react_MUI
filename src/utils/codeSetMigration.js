// 舊 focusedLabTests/focusedImageTests → overlay 的一次性遷移(冪等)。
// 舊鍵保留不動(可回滾、舊版降級不炸);新鍵非 null 即視為已遷移。
import { CODE_SETS } from '../config/codeSets';
import { migrateLegacyFocusList } from './codeSetResolver';

export const runCodeSetMigrations = () => new Promise((resolve) => {
  const keys = CODE_SETS.flatMap(cs => [cs.storageKey, cs.legacyStorageKey]);
  chrome.storage.sync.get(keys, (items) => {
    const updates = {};
    CODE_SETS.forEach(cs => {
      if (items[cs.storageKey] != null) return; // 已遷移(或使用者已有 overlay)
      const legacy = items[cs.legacyStorageKey];
      if (!Array.isArray(legacy) || legacy.length === 0) return; // 新安裝或垃圾:不動
      const overlay = migrateLegacyFocusList(legacy, cs.builtin);
      if (overlay) updates[cs.storageKey] = overlay;
    });
    if (Object.keys(updates).length > 0) {
      chrome.storage.sync.set(updates, () => {
        if (chrome.runtime.lastError) {
          console.warn('[codeSet] 遷移寫入失敗', chrome.runtime.lastError.message);
        }
        resolve(updates);
      });
    } else {
      resolve(updates);
    }
  });
});
