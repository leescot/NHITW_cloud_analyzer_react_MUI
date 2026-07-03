// ageUtils.js
// 民國年生日字串(YYYMMDD,7 碼)相關計算

/**
 * 由民國年生日字串計算足歲年齡
 * @param {string} rocBirthday - 7 碼民國年生日,如 '0790115'
 * @returns {number|null} 足歲;無效輸入回傳 null
 */
export const calculateAgeFromROCBirthday = (rocBirthday) => {
  if (!rocBirthday || typeof rocBirthday !== 'string' || rocBirthday.length !== 7) return null;
  const rocYear = parseInt(rocBirthday.substring(0, 3), 10);
  const month = parseInt(rocBirthday.substring(3, 5), 10);
  const day = parseInt(rocBirthday.substring(5, 7), 10);
  if (Number.isNaN(rocYear) || Number.isNaN(month) || Number.isNaN(day)) return null;

  const birthDate = new Date(rocYear + 1911, month - 1, day);
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  if (
    today.getMonth() < month - 1 ||
    (today.getMonth() === month - 1 && today.getDate() < day)
  ) {
    age--;
  }
  return age;
};

/**
 * 由本地 JSON 匯入的使用者資料組出 userInfo 物件
 * @param {Object|null} local - window._localUserInfo 的內容
 * @returns {Object|null}
 */
export const buildUserInfoFromLocal = (local) => {
  if (!local) return null;
  return {
    name: local.name,
    userId: local.userId,
    gender: local.gender,
    birthday: local.birthday,
    age: calculateAgeFromROCBirthday(local.birthday),
  };
};
