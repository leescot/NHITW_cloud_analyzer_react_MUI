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
