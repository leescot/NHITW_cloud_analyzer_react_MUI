import { getTokenPayload } from './tokenUtils';
import { calculateAgeFromROCBirthday } from './ageUtils';

export const extractUserInfoFromToken = () => {
  try {
    const payload = getTokenPayload();
    if (!payload) return null;

    const name = payload.UserName || "";
    const userId = payload.UserID || "";
    const gender = payload.UserSex || "";
    const birthday = payload.UserBirthday || "";

    // 年齡計算與本地匯入路徑(ageUtils.buildUserInfoFromLocal)共用單一來源
    const age = calculateAgeFromROCBirthday(birthday);

    return { name, userId, gender, birthday, age };
  } catch (error) {
    console.error("Error extracting user info from token:", error);
    return null;
  }
};

export const formatUserInfoDisplay = (userInfo) => {
  if (!userInfo) return "";

  const { name, userId, gender, age } = userInfo;
  let displayName = name || userId || "";
  if (!displayName) return "";

  const parts = [];
  if (age !== null) parts.push(age.toString());
  if (gender) parts.push(gender);

  if (parts.length > 0) {
    return `${displayName}(${parts.join("")})`;
  }
  return displayName;
};
