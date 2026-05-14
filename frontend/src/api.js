import axios from "axios";

export const MEDIA_URL = import.meta.env.VITE_MEDIA_URL ?? 'http://127.0.0.1:8000';

// Конвертує відносний /media/... URL в абсолютний.
// Якщо вже абсолютний — повертає як є.
export function mediaUrl(path) {
  if (!path) return null;
  if (path.startsWith('http')) return path;
  return `${MEDIA_URL}${path}`;
}

const API_URL = 'http://127.0.0.1:8000/api/users/';

const BASE = "/api";  // проксюється через Vite → 127.0.0.1:8000, cookie same-site

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
  } catch (err) {
    // 401/403 — refresh cookie немає або протухла, сесію не відновити
    const status = err.response?.status;
    if (status === 401 || status === 403) return null;
    // Мережева помилка або бекенд недоступний — повертаємо спеціальний маркер
    // щоб App.jsx не видаляв локальні дані і не кидав юзера на лендінг
    return { networkError: true };
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

export { API };