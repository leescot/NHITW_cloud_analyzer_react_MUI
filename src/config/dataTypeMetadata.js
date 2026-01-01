/**
 * 醫療資料類型元數據
 *
 * 定義 9 種醫療資料類型的顯示資訊、圖示、描述
 * 用於 UI 顯示與資料選擇器
 */

export const DATA_TYPE_METADATA = {
  diagnosis: {
    id: 'diagnosis',
    label: '診斷/收案',
    icon: 'Assignment',
    description: '就醫診斷與各項收案資訊',
    color: '#7b1fa2',
    category: 'history'
  },
  medication: {
    id: 'medication',
    label: '西藥',
    icon: 'Medication',
    description: '近期處方用藥',
    color: '#f57c00',
    category: 'medication'
  },
  chinesemed: {
    id: 'chinesemed',
    label: '中藥',
    icon: 'Spa',
    description: '中醫處方記錄',
    color: '#689f38',
    category: 'medication'
  },
  lab: {
    id: 'lab',
    label: '檢驗',
    icon: 'Science',
    description: '實驗室檢驗數值',
    color: '#0097a7',
    category: 'lab'
  },
  imaging: {
    id: 'imaging',
    label: '影像',
    icon: 'ImageSearch',
    description: '影像學檢查報告',
    color: '#5e35b1',
    category: 'imaging'
  },
  surgery: {
    id: 'surgery',
    label: '手術史',
    icon: 'LocalHospital',
    description: '手術記錄',
    color: '#7b1fa2',
    category: 'history'
  },
  discharge: {
    id: 'discharge',
    label: '住院史',
    icon: 'Hotel',
    description: '住院與出院記錄',
    color: '#0288d1',
    category: 'history'
  },
  allergy: {
    id: 'allergy',
    label: '過敏史',
    icon: 'HealthAndSafety',
    description: '藥物過敏記錄',
    color: '#d32f2f',
    category: 'basic'
  },
  hbcvdata: {
    id: 'hbcvdata',
    label: 'BC肝',
    icon: 'Biotech',
    description: 'B型、C型肝炎相關資料',
    color: '#388e3c',
    category: 'lab'
  },
  patientSummary: {
    id: 'patientSummary',
    label: '備註資料',
    icon: 'Person',
    description: '雲端註記資料、基本資訊',
    color: '#1976d2',
    category: 'basic'
  }
};

/**
 * 取得所有資料類型的 ID 列表
 * @returns {string[]} 資料類型 ID 陣列
 */
export const getAllDataTypeIds = () => {
  return Object.keys(DATA_TYPE_METADATA);
};

/**
 * 取得資料類型元數據
 * @param {string} id - 資料類型 ID
 * @returns {Object|null} 元數據物件或 null
 */
export const getDataTypeMetadata = (id) => {
  return DATA_TYPE_METADATA[id] || null;
};

/**
 * 按分類取得資料類型
 * @param {string} category - 分類 ('basic', 'history', 'medication', 'lab', 'imaging')
 * @returns {Object[]} 該分類的資料類型陣列
 */
export const getDataTypesByCategory = (category) => {
  return Object.values(DATA_TYPE_METADATA).filter(dt => dt.category === category);
};

/**
 * 資料類型分類定義
 */
export const DATA_TYPE_CATEGORIES = {
  basic: {
    id: 'basic',
    label: '基本資訊',
    order: 1
  },
  history: {
    id: 'history',
    label: '病史記錄',
    order: 2
  },
  medication: {
    id: 'medication',
    label: '用藥相關',
    order: 3
  },
  lab: {
    id: 'lab',
    label: '檢驗相關',
    order: 4
  },
  imaging: {
    id: 'imaging',
    label: '影像相關',
    order: 5
  }
};
