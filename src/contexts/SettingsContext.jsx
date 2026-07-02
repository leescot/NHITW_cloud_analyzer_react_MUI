// SettingsContext.jsx
// 提供 appSettings 與 generalDisplaySettings 給 FloatingIcon 樹下所有元件,
// 取代逐層 prop 傳遞。popup 是獨立 React root、自有設定 state,不掛此 Provider;
// hooks 在無 Provider 時回傳 DEFAULT_SETTINGS 對應值,確保任何環境下皆安全。
import { createContext, useContext, useMemo } from 'react';

import { DEFAULT_SETTINGS } from '../config/defaultSettings';

// 注意:DEFAULT_SETTINGS 目前並無 "display" 頂層欄位(僅有
// western/atc5/chinese/lab/overview/general/cloud),故此處未納入 display。
const FALLBACK_APP_SETTINGS = {
  western: DEFAULT_SETTINGS.western,
  atc5: DEFAULT_SETTINGS.atc5,
  chinese: DEFAULT_SETTINGS.chinese,
  lab: DEFAULT_SETTINGS.lab,
  overview: DEFAULT_SETTINGS.overview,
  cloud: DEFAULT_SETTINGS.cloud,
};

const SettingsContext = createContext(null);

// eslint-disable-next-line react/prop-types -- 專案未使用 prop-types,遵循既有元件慣例
export const SettingsProvider = ({ appSettings, generalDisplaySettings, children }) => {
  const value = useMemo(
    () => ({ appSettings, generalDisplaySettings }),
    [appSettings, generalDisplaySettings]
  );
  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
};

export const useAppSettings = () => {
  return useContext(SettingsContext)?.appSettings ?? FALLBACK_APP_SETTINGS;
};

export const useGeneralDisplaySettings = () => {
  return useContext(SettingsContext)?.generalDisplaySettings ?? DEFAULT_SETTINGS.general;
};
