// 代碼集宣告(DOC/07 方向五)。通用編輯器與 resolver 都吃這份宣告;
// 未來收斂 labChooseCopyItems/atc5 = 再加一份宣告,不再複製編輯 UI。
import { LAB_FOCUS_BUILTIN } from './labTests';
import { IMAGE_FOCUS_BUILTIN } from './imageTests';
import {
  LAB_CATALOG, IMAGE_CATALOG, LAB_ALIAS_PRESETS, IMAGE_ALIAS_PRESETS,
} from './codeSetCatalog';

export const CODE_SETS = [
  {
    id: 'labFocus',
    shape: 'list',
    title: '關注檢驗清單設定',
    builtin: LAB_FOCUS_BUILTIN,
    catalog: LAB_CATALOG,
    aliasPresets: LAB_ALIAS_PRESETS,
    storageKey: 'labFocusOverlay',
    legacyStorageKey: 'focusedLabTests',
  },
  {
    id: 'imageFocus',
    shape: 'list',
    title: '關注影像清單設定',
    builtin: IMAGE_FOCUS_BUILTIN,
    catalog: IMAGE_CATALOG,
    aliasPresets: IMAGE_ALIAS_PRESETS,
    storageKey: 'imageFocusOverlay',
    legacyStorageKey: 'focusedImageTests',
  },
];

export const getCodeSet = (id) => CODE_SETS.find(cs => cs.id === id);
