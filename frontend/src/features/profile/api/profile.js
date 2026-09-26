import { API } from '@api';

export const fetchProfile = async () => {
  const res = await API.get("/users/profile/");
  return res.data;
};

export const updateProfile = async (data) => {
  const formData = new FormData();

  formData.append("first_name", data.first_name);
  formData.append("last_name", data.last_name);
  formData.append("bio", data.bio ?? "");
  formData.append("phone", data.phone ?? "");

  if (data.avatar) {
    formData.append("avatar", data.avatar);
  }
  if (data.banner) {
    formData.append("banner", data.banner);
  }

  const res = await API.put("/users/profile/", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });

  return res.data;
};