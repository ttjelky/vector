/**
 * api.js
 *
 * Схема:
 *  • Access token — зберігається ТІЛЬКИ у змінній пам'яті (_accessToken).
 *  • User role    — зберігається ТІЛЬКИ у змінній пам'яті (_userRole).
 *    Ніякого localStorage для чутливих даних. Не доступні скриптам після перезавантаження.
 *  • Refresh token — httpOnly cookie, JS його не бачить взагалі.
 *
 *  • При кожному запиті — додаємо Authorization: Bearer <_accessToken>.
 *  • При 401 — автоматично викликаємо /token/refresh/, отримуємо новий access,
 *    зберігаємо в пам'яті і повторюємо оригінальний запит.
 *  • При перезавантаженні сторінки — restoreSession() відновлює access token
 *    через refresh cookie (якщо вона ще жива).
 */

import axios from "axios";

const BASE = "http://127.0.0.1:8000/api";

// ── In-memory стан ────────────────────────────────────────────────────────────
let _accessToken = null;
let _userRole    = null;

export const setAccessToken   = (token) => { _accessToken = token; };
export const getAccessToken   = ()      => _accessToken;
export const clearAccessToken = ()      => { _accessToken = null; _userRole = null; };

export const setUserRole = (role) => { _userRole = role; };
export const getUserRole = ()     => _userRole;

// ── Axios instance ────────────────────────────────────────────────────────────
const API = axios.create({
  baseURL:         BASE,
  withCredentials: true,   // обов'язково — щоб cookie надсилалась
});

// ── Request interceptor: додаємо access token ─────────────────────────────────
API.interceptors.request.use((config) => {
  if (_accessToken) {
    config.headers.Authorization = `Bearer ${_accessToken}`;
  }
  return config;
});

// ── Response interceptor: авто-рефреш при 401 ────────────────────────────────
let _refreshPromise = null;  // гарантує що паралельні запити роблять 1 рефреш

API.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;

    if (
      error.response?.status === 401 &&
      !original._retry &&
      !original.url?.includes("/token/refresh/") &&
      !original.url?.includes("/login/")
    ) {
      original._retry = true;

      try {
        if (!_refreshPromise) {
          _refreshPromise = axios
            .post(`${BASE}/users/token/refresh/`, {}, { withCredentials: true })
            .finally(() => { _refreshPromise = null; });
        }

        const { data } = await _refreshPromise;
        setAccessToken(data.access);
        if (data.role) setUserRole(data.role);

        original.headers.Authorization = `Bearer ${data.access}`;
        return API(original);

      } catch (refreshError) {
        clearAccessToken();
        // Актуальні ключі
        localStorage.removeItem("userRole");
        localStorage.removeItem("fullUserName");
        // Legacy-ключі старого коду
        localStorage.removeItem("role");
        localStorage.removeItem("userName");
        localStorage.removeItem("userId");
        window.dispatchEvent(new Event("auth-expired"));
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

// ── Session restore ───────────────────────────────────────────────────────────
/**
 * Викликати один раз при старті додатку (у App.jsx).
 * Якщо refresh cookie є — отримує новий access token і повертає дані юзера.
 * Повертає: { access, role, first_name, last_name } або null.
 */
export async function restoreSession() {
  try {
    const { data } = await axios.post(
      `${BASE}/users/token/refresh/`,
      {},
      { withCredentials: true }
    );
    setAccessToken(data.access);
    if (data.role) setUserRole(data.role);
    return data;
  } catch {
    return null;
  }
}

// ── Auth helpers ──────────────────────────────────────────────────────────────
export const loginUser    = (credentials) =>
  axios.post(`${BASE}/users/login/`,    credentials, { withCredentials: true });

export const registerUser = (userData)    =>
  axios.post(`${BASE}/users/register/`, userData,    { withCredentials: true });

export const logoutUser   = ()            =>
  axios.post(`${BASE}/users/logout/`,   {},          { withCredentials: true });

export const getProfile   = ()            => API.get("/users/profile/");

export default API;
