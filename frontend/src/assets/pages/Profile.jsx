import React, { useState, useEffect } from "react";
import { fetchProfile, updateProfile } from "../../api/profile";
import styles from "../components/styles/profile.module.css";

const Profile = () => {
    const [profile, setProfile] = useState(null);
    const [editMode, setEditMode] = useState(false);
    const [formData, setFormData] = useState({
        username: "",
        avatar: null,
    });
    const [preview, setPreview] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadProfile = async () => {
            const data = await fetchProfile();
            if (data) {
                setProfile(data);
                setFormData({ username: data.username, avatar: null });
                setPreview(data.avatar);
            }
            setLoading(false);
        };
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
                            name="username"
                            value={formData.username}
                            onChange={handleChange}
                            className={styles.input}
                            placeholder="Ім'я користувача"
                        />
                        <button type="submit" className={styles.saveButton}>Зберегти</button>
                        <button type="button" onClick={() => setEditMode(false)} className={styles.cancelButton}>Скасувати</button>
                    </form>
                ) : (
                    <>
                        <p><strong>Ім'я:</strong> {profile.username}</p>
                        <p><strong>Email:</strong> {profile.email}</p>
                        <button onClick={() => setEditMode(true)} className={styles.editButton}>Редагувати</button>
                    </>
                )}
            </div>
        </div>
    );
};

export default Profile;