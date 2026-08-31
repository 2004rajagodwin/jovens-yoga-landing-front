const TOKEN_KEY = "jovens_admin_token";
const ADMIN_KEY = "jovens_admin_info";

export function getAdminToken() {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function getAdminInfo() {
  try {
    const raw = localStorage.getItem(ADMIN_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function setAdminSession(token, adminInfo) {
  try {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(ADMIN_KEY, JSON.stringify(adminInfo));
  } catch {
    // localStorage unavailable — session simply won't persist across reloads.
  }
}

export function clearAdminSession() {
  try {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(ADMIN_KEY);
  } catch {
    // ignore
  }
}

export function isAdminAuthenticated() {
  return Boolean(getAdminToken());
}
