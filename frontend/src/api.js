import axios from 'axios';

export const MEDIA_URL = import.meta.env.VITE_MEDIA_URL ?? 'http://127.0.0.1:8000';

// Конвертує відносний /media/... URL в абсолютний.
// Якщо вже абсолютний — повертає як є.
export function mediaUrl(path) {
  if (!path) return null;
  if (path.startsWith('http')) return path;
  return `${MEDIA_URL}${path}`;
}

const API_URL = 'http://127.0.0.1:8000/api/users/';

const API = axios.create({
    baseURL: "http://127.0.0.1:8000/api",
});

API.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const registerUser = (userData) => {
    return axios.post(`${API_URL}register/`, userData);
};

export const loginUser = (credentials) => {
    return axios.post(`${API_URL}login/`, credentials);
};

export const getProfile = () => API.get("/users/profile/");

export default API;