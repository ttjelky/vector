import React, { useState, useEffect } from "react";
import { fetchProfile, updateProfile } from "../../api/profile";
import styles from "../components/styles/profile.module.css";
<<<<<<< HEAD

const Profile = () => {
    const [profile, setProfile] = useState(null);
    const [editMode, setEditMode] = useState(false);
    const [formData, setFormData] = useState({
        username: "",
=======
import NavBar from "../components/NavBar";

const Profile = () => {
    const [profile, setProfile] = useState(null);
    const [draft, setDraft] = useState(null);
    const [editMode, setEditMode] = useState(false);
    const [formData, setFormData] = useState({
        first_name: "",
        last_name: "",
        email: "",
>>>>>>> 6604d3b (Сделав имя, аватарку в профиле)
        avatar: null,
    });
    const [preview, setPreview] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadProfile = async () => {
<<<<<<< HEAD
            const data = await fetchProfile();
            if (data) {
                setProfile(data);
                setFormData({ username: data.username, avatar: null });
                setPreview(data.avatar);
            }
            setLoading(false);
        };
=======
            try {
                const response = await fetchProfile();

                const profileData = response.data;

                setProfile(profileData);

                setFormData({
                    first_name: profileData.first_name || "",
                    last_name: profileData.last_name || "",
                    email: profileData.email || "",
                    avatar: null
                });

                const avatarUrl = profileData.avatar
                    ? profileData.avatar.startsWith("http")
                        ? profileData.avatar
                        : `http://127.0.0.1:8000${profileData.avatar}`
                    : "/default-avatar.png";
                setPreview(avatarUrl);
            } catch (err) {
                console.error("PROFILE ERROR:", err);
                setProfile(null);
            } finally {
                setLoading(false);
            }
        };

>>>>>>> 6604d3b (Сделав имя, аватарку в профиле)
        loadProfile();
    }, []);

    const handleChange = (e) => {
        if (e.target.name === "avatar") {
            const file = e.target.files[0];
            setFormData({ ...formData, avatar: file });
            setPreview(URL.createObjectURL(file));
        } else {
            setFormData({ ...formData, [e.target.name]: e.target.value });
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
<<<<<<< HEAD
        const updated = await updateProfile(formData);
        if (updated) {
            setProfile(updated);
            setEditMode(false);
            if (updated.avatar) setPreview(updated.avatar);
        }
    };

    if (loading) return <p className={styles.loading}>Завантаження...</p>;
    if (!profile) return <p className={styles.error}>Не вдалося завантажити профіль</p>;

    return (
=======

        try {
            await updateProfile(formData);

            const fresh = (await fetchProfile()).data;

            setProfile(fresh);
            setEditMode(false);
            setPreview(fresh?.avatar || "/default-avatar.png");

        } catch (err) {
            console.error("UPDATE ERROR:", err);
        }
    };
    
    if (loading)
    return (
    <NavBar>
    <p className={styles.loading}>Завантаження...</p>
    </NavBar>   
    );
    if (!profile) return <p className={styles.error}>Не вдалося завантажити профіль</p>;

    return (
        <NavBar>
>>>>>>> 6604d3b (Сделав имя, аватарку в профиле)
        <div className={styles.profileContainer}>
            <h1>Профіль користувача</h1>

            <div className={styles.avatarWrapper}>
                <img
                    src={preview || "/default-avatar.png"}
                    alt="Аватар"
                    className={styles.avatar}
                />
                {editMode && (
                    <input type="file" name="avatar" accept="image/*" onChange={handleChange} />
                )}
            </div>

            <div className={styles.info}>
                {editMode ? (
                    <form onSubmit={handleSubmit} className={styles.form}>
                        <input
                            type="text"
<<<<<<< HEAD
                            name="username"
                            value={formData.username}
                            onChange={handleChange}
                            className={styles.input}
                            placeholder="Ім'я користувача"
                        />
=======
                            name="first_name"
                            value={formData.first_name}
                            onChange={handleChange}
                            placeholder="Ім'я"
                        />

                        <input
                            type="text"
                            name="last_name"
                            value={formData.last_name}
                            onChange={handleChange}
                            placeholder="Прізвище"
                        />

                        <input
                            type="email"
                            name="email"
                            value={formData.email}
                            onChange={handleChange}
                            placeholder="Email"
                        />

>>>>>>> 6604d3b (Сделав имя, аватарку в профиле)
                        <button type="submit" className={styles.saveButton}>Зберегти</button>
                        <button type="button" onClick={() => setEditMode(false)} className={styles.cancelButton}>Скасувати</button>
                    </form>
                ) : (
                    <>
<<<<<<< HEAD
                        <p><strong>Ім'я:</strong> {profile.username}</p>
                        <p><strong>Email:</strong> {profile.email}</p>
=======
                        <p><strong>Ім'я:</strong>{" "}{(profile.first_name || profile.last_name) ? `${profile.first_name ?? ""} ${profile.last_name ?? ""}`.trim() : profile.username || "—"}</p>
                        <p><strong>Email:</strong> {profile.email || "Немає email"}</p>
>>>>>>> 6604d3b (Сделав имя, аватарку в профиле)
                        <button onClick={() => setEditMode(true)} className={styles.editButton}>Редагувати</button>
                    </>
                )}
            </div>
        </div>
<<<<<<< HEAD
=======
        </NavBar>
>>>>>>> 6604d3b (Сделав имя, аватарку в профиле)
    );
};

export default Profile;