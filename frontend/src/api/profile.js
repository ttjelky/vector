import API from "../api";

export const fetchProfile = async () => {
    const res = await API.get("/users/profile/");
    return res.data;
};

export const updateProfile = async (data) => {
    const formData = new FormData();

    formData.append("first_name", data.first_name);
    formData.append("last_name", data.last_name);
    formData.append("email", data.email);

    if (data.avatar) {
        formData.append("avatar", data.avatar);
    }

    const res = await API.put("/users/profile/", formData, {
        headers: {
            "Content-Type": "multipart/form-data",
        },
    });

    return res.data;
};