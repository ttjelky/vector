<<<<<<< HEAD
const API_URL = "http://127.0.0.1:8000/api";

export const fetchProfile = async () => {
  const token = localStorage.getItem("accessToken");
  const response = await fetch(`${API_URL}/profile/`, {
    headers: {
      "Authorization": `Bearer ${token}`
    }
  });
  if (!response.ok) throw new Error("Не вдалося завантажити профіль");
  return await response.json();
};

export const updateProfile = async (data) => {
  const token = localStorage.getItem("accessToken");
  const response = await fetch(`${API_URL}/profile/`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`
    },
    body: JSON.stringify(data)
  });
  if (!response.ok) throw new Error("Не вдалося оновити профіль");
  return await response.json();
=======
import API from "../api";

export const fetchProfile = () => API.get("/profile/");
export const updateProfile = (data) => {
    const formData = new FormData();

    formData.append("first_name", data.first_name);
    formData.append("last_name", data.last_name);
    formData.append("email", data.email);

    if (data.avatar instanceof File) {
        formData.append("avatar", data.avatar);
    }

    return API.patch("/profile/", formData);
>>>>>>> 6604d3b (Сделав имя, аватарку в профиле)
};