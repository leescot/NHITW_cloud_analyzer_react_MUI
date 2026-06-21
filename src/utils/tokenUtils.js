export function getRawToken() {
  return sessionStorage.getItem('token') || null;
}

export function getAuthToken() {
  const token = getRawToken();
  if (!token) return null;
  return 'Bearer ' + token;
}

export function getTokenPayload() {
  const token = getRawToken();
  if (!token) return null;
  try {
    const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    const json = decodeURIComponent(
      atob(base64).split('').map(c =>
        '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)
      ).join('')
    );
    return JSON.parse(json);
  } catch {
    return null;
  }
}

export function getPatientId() {
  return getTokenPayload()?.UserID || null;
}

export function getPermissions() {
  const p = getTokenPayload()?.Permission;
  return p ? p.split(',') : [];
}

export function getApiHeaders() {
  return {
    Authorization: getAuthToken(),
    Accept: 'application/json, text/plain, */*',
    'X-Requested-With': 'XMLHttpRequest',
  };
}

export function isTokenExpired() {
  const payload = getTokenPayload();
  if (!payload?.exp) return true;
  return Date.now() / 1000 > payload.exp;
}
