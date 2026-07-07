// CodeSet 純函數層(DOC/07 方向五):overlay 合成、遷移、diff。
// 不碰 chrome API——vitest headless 直測;storage 讀寫在 codeSetMigration.js 與 UI 層。

const isPlainObject = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);

const isValidItem = (it) =>
  isPlainObject(it) &&
  typeof it.id === 'string' && it.id !== '' &&
  typeof it.label === 'string' &&
  Array.isArray(it.codes) && it.codes.length > 0 &&
  it.codes.every(c => typeof c === 'string' && c !== '') &&
  typeof it.enabled === 'boolean' &&
  typeof it.order === 'number';

/** 防禦性解析 overlay:壞結構整份視同 null(用內建),壞欄位逐項丟棄。 */
export const sanitizeOverlay = (raw) => {
  if (raw == null) return null;
  if (!isPlainObject(raw)) {
    console.warn('[codeSet] overlay 結構不合法,改用內建預設', raw);
    return null;
  }
  const overrides = {};
  if (isPlainObject(raw.overrides)) {
    for (const [id, patch] of Object.entries(raw.overrides)) {
      if (!isPlainObject(patch)) continue;
      const clean = {};
      if (typeof patch.label === 'string' && patch.label !== '') clean.label = patch.label;
      if (typeof patch.enabled === 'boolean') clean.enabled = patch.enabled;
      if (typeof patch.order === 'number') clean.order = patch.order;
      if (Object.keys(clean).length > 0) overrides[id] = clean;
    }
  }
  const additions = Array.isArray(raw.additions)
    ? raw.additions.filter(isValidItem).map(it => ({
        id: it.id, label: it.label, codes: [...it.codes], enabled: it.enabled, order: it.order,
      }))
    : [];
  const removals = Array.isArray(raw.removals)
    ? raw.removals.filter(r => typeof r === 'string')
    : [];
  return { overrides, additions, removals };
};

/** 內建基底 + overlay delta → 最終清單(依 order 升冪)。 */
export const resolveCodeSet = (builtin, overlay) => {
  const safe = sanitizeOverlay(overlay);
  const overrides = safe?.overrides ?? {};
  const removals = new Set(safe?.removals ?? []);
  const base = builtin.map(item => ({ ...item, ...(overrides[item.id] ?? {}) }));
  const additions = (safe?.additions ?? []).filter(a => !removals.has(a.id));
  return [...additions, ...base].sort((a, b) => a.order - b.order);
};

/**
 * 舊 focusedLabTests/focusedImageTests 全量陣列 → overlay(一次性遷移)。
 * 以「codes 集合相等」對回內建項(舊影像逗號串拆陣列比對);對不上者轉 addition。
 * 與內建無差異也回傳空 overlay 物件——寫入後新鍵非 null 即「已遷移」標記(冪等)。
 */
export const migrateLegacyFocusList = (legacy, builtin) => {
  if (!Array.isArray(legacy)) return null;
  const codesKey = (codes) => [...codes].sort().join(',');
  const byCodes = new Map(builtin.map(item => [codesKey(item.codes), item]));
  const overrides = {};
  const additions = [];
  legacy.forEach((entry, index) => {
    if (!isPlainObject(entry) || typeof entry.orderCode !== 'string' || entry.orderCode === '') return;
    const codes = entry.orderCode.split(',').map(c => c.trim()).filter(Boolean);
    const match = byCodes.get(codesKey(codes));
    const enabled = !!entry.enabled;
    const label = typeof entry.displayName === 'string' && entry.displayName !== '' ? entry.displayName : null;
    if (match) {
      const patch = {};
      if (enabled !== match.enabled) patch.enabled = enabled;
      if (index !== match.order) patch.order = index;
      if (label !== null && label !== match.label) patch.label = label;
      if (Object.keys(patch).length > 0) overrides[match.id] = patch;
    } else {
      additions.push({
        id: `legacy:${entry.orderCode}`,
        label: label ?? entry.orderCode,
        codes,
        enabled,
        order: index,
      });
    }
  });
  return { overrides, additions, removals: [] };
};

/**
 * 編輯器工作清單(全量、依顯示順序)→ overlay delta。
 * workingList 的 index 即有效 order;內建項只記與基底不同的欄位。
 */
export const diffToOverlay = (builtin, workingList) => {
  const builtinById = new Map(builtin.map(item => [item.id, item]));
  const overrides = {};
  const additions = [];
  workingList.forEach((item, index) => {
    const base = builtinById.get(item.id);
    if (base) {
      const patch = {};
      if (item.label !== base.label) patch.label = item.label;
      if (item.enabled !== base.enabled) patch.enabled = item.enabled;
      if (index !== base.order) patch.order = index;
      if (Object.keys(patch).length > 0) overrides[item.id] = patch;
    } else {
      additions.push({ id: item.id, label: item.label, codes: [...item.codes], enabled: item.enabled, order: index });
    }
  });
  return { overrides, additions, removals: [] };
};
