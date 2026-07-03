// useUserInfo.js
// 使用者資訊：dialog 開啟時從 JWT token 取得，無 token 時 fallback 本地匯入資訊
// （window._localUserInfo，由 localDataHandler 於本地 JSON 匯入時寫入）。
import { useState, useEffect } from "react";

import { extractUserInfoFromToken } from "../utils/userInfoUtils";
import { buildUserInfoFromLocal } from "../utils/ageUtils";

export function useUserInfo(open) {
  const [userInfo, setUserInfo] = useState(null);

  useEffect(() => {
    if (open) {
      let info = extractUserInfoFromToken();
      // Fallback: 本地 JSON 匯入的使用者資訊
      if (!info && window._localUserInfo) {
        info = buildUserInfoFromLocal(window._localUserInfo);
      }
      setUserInfo(info);
    }
  }, [open]);

  return { userInfo, setUserInfo };
}
