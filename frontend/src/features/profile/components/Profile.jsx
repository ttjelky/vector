import React, { useState, useEffect } from "react";
import { fetchProfile, updateProfile } from "../api/profile";
import { mediaUrl } from "@api";
import styles from "../styles/profile.module.css";
import { NavBar } from "@shared/components/NavBar";

const Profile = () => {
    const [profile, setProfile] = useState(null);
    const [editMode, setEditMode] = useState(false);
    const [formData, setFormData] = useState({
        first_name: "",
        last_name: "",
        avatar: null,
    });
    const [preview, setPreview] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadProfile = async () => {
            const data = await fetchProfile();
            if (data) {
                setProfile(data);
                setFormData({
                    first_name: data.first_name || "",
                    last_name: data.last_name || "",
                    email: data.email || "",
                    avatar: null,
                });
                setPreview(data.avatar ? mediaUrl(data.avatar) : null);
            }
            setLoading(false);
        };
        loadProfile();
    }, []);

    const handleChange = (e) => {
        const { name, value, files } = e.target;

        if (name === "avatar") {
            const file = files[0];
            setFormData(prev => ({ ...prev, avatar: file }));
            setPreview(URL.createObjectURL(file));
        } else {
            setFormData(prev => ({ ...prev, [name]: value }));
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        const updated = await updateProfile(formData);

        setProfile(updated);
        setEditMode(false);
        setPreview(updated.avatar);
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
        <div className={styles.profileContainer}>
            <h1>Профіль користувача</h1>

            <div className={styles.avatarWrapper}>
                <img
                    src={preview || "/default-avatar.png"}
                    alt="Avatar"
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
                            name="first_name"
                            value={formData.first_name}
                            onChange={handleChange}
                            placeholder="Ім'я"
                            className={styles.input}
                        />

                        <input
                            type="email"
                            name="email"
                            value={formData.email}
                            onChange={handleChange}
                            placeholder="Email"
                            className={styles.input}
                        />

                        <button type="submit" className={styles.saveButton}>Зберегти</button>
                        <button type="button" onClick={() => setEditMode(false)} className={styles.cancelButton}>Скасувати</button>
                    </form>
                ) : (
                    <>
                        <p><strong>Ім'я:</strong> {profile.first_name} {profile.last_name}</p>
                        <p><strong>Email:</strong> {profile.email}</p>
                        <button onClick={() => setEditMode(true)} className={styles.editButton}>Редагувати</button>
                    </>
                )}
            </div>
        </div>
        </NavBar>
    );
};

export { Profile };