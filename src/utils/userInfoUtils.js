import { getRawToken, getTokenPayload } from './tokenUtils';

export const extractUserInfoFromToken = () => {
  try {
    const payload = getTokenPayload();
    if (!payload) return null;

    const name = payload.UserName || "";
    const userId = payload.UserID || "";
    const gender = payload.UserSex || "";
    const birthday = payload.UserBirthday || "";

    let age = null;
    if (birthday && birthday.length === 7) {
      const rocYear = parseInt(birthday.substring(0, 3), 10);
      const month = parseInt(birthday.substring(3, 5), 10);
      const day = parseInt(birthday.substring(5, 7), 10);
      const adYear = rocYear + 1911;
      const birthDate = new Date(adYear, month - 1, day);
      const today = new Date();
      age = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
      }
    }

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
