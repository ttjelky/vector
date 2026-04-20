import axios from 'axios';

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

    return req;
});