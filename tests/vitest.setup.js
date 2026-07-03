// 提供最小 chrome API stub,讓引用 chrome.* 的模組(如 medicationProcessor)可在 node 環境載入執行
if (!globalThis.chrome) {
  globalThis.chrome = {
    storage: {
      sync: {
        get: (defaults, cb) => {
          if (Array.isArray(defaults) || typeof defaults === 'string') return cb?.({});
          return cb?.(typeof defaults === 'object' && defaults !== null ? { ...defaults } : {});
        },
        set: (_items, cb) => cb?.(),
      },
      local: {
        get: (_defaults, cb) => cb?.({}),
        set: (_items, cb) => cb?.(),
      },
      onChanged: { addListener: () => {}, removeListener: () => {} },
    },
    runtime: {
      sendMessage: () => {},
      onMessage: { addListener: () => {}, removeListener: () => {} },
    },
  };
}
