import axios from 'axios';

<<<<<<< HEAD
const API_URL = 'http://127.0.0.1:8000/api/users/';

const API = axios.create({
    baseURL: "http://127.0.0.1:8000/api",
});

export const registerUser = (userData) => {
    return axios.post(`${API_URL}register/`, userData);
};

export const loginUser = (credentials) => {
    return axios.post(`${API_URL}login/`, credentials);
};

export const getProfile = () => API.get("/users/profile/");

API.interceptors.request.use((req) => {
    const token = localStorage.getItem("accesToken");

    if (token) {
        req.headers.Authorization = `Bearer ${token}`;
    }

    return reg;
});
=======
const API_URL = 'http://127.0.0.1:8000/api';

const API = axios.create({
    baseURL: API_URL,
});

export const getToken = () => localStorage.getItem("accessToken");

API.interceptors.request.use((config) => {
  const token = getToken();

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

// AUTH
export const registerUser = (userData) => {
    return API.post('/register/', userData);
};

export const loginUser = (credentials) => {
    return API.post('/login/', credentials);
};

// PROFILE
export const getProfile = () => {
    return API.get('/profile/');
};

export default API;
>>>>>>> 6604d3b (Сделав имя, аватарку в профиле)
