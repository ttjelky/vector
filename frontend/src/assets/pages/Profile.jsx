import React, { useState, useEffect } from "react";
import { fetchProfile, updateProfile } from "../../api/profile";
import styles from "../components/styles/profile.module.css";
import NavBar from "../components/NavBar";

const Profile = () => {
    const [profile, setProfile] = useState(null);
    const [editMode, setEditMode] = useState(false);
    const [formData, setFormData] = useState({
        first_name: "",
        last_name: "",
        email: "",
        avatar: null,
    });
    const [preview, setPreview] = useState(null);
    const [loading, setLoading] = useState(true);
    const [toast, setToast] = useState(false);

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
                setPreview(
                    data.avatar ? `http://127.0.0.1:8000${data.avatar}` : null
                );
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
        setPreview(
            updated.avatar ? `http://127.0.0.1:8000${updated.avatar}` : null
        );

        const fullName = `${updated.first_name} ${updated.last_name}`.trim();
        localStorage.setItem("fullUserName", fullName);

        window.dispatchEvent(new CustomEvent("profile-updated", {
            detail: {
                fullUserName: fullName,
                avatar: updated.avatar ? `http://127.0.0.1:8000${updated.avatar}` : null,
            }
        }));

        setToast(true);
        setTimeout(() => setToast(false), 2500);
    };

    const handleCancel = () => {
        setEditMode(false);
        setFormData({
            first_name: profile.first_name || "",
            last_name: profile.last_name || "",
            email: profile.email || "",
            avatar: null,
        });
        setPreview(
            profile.avatar ? `http://127.0.0.1:8000${profile.avatar}` : null
        );
    };

    const getInitials = (first, last) => {
        const f = first?.[0]?.toUpperCase() || "";
        const l = last?.[0]?.toUpperCase() || "";
        return f + l || "?";
    };

    if (loading)
        return (
            <NavBar>
                <p className={styles.loading}>Завантаження...</p>
            </NavBar>
        );

    if (!profile || !profile.first_name)
        return <p className={styles.error}>Не вдалося завантажити профіль</p>;

    return (
        <NavBar>
            <div className={styles.pageWrapper}>
                <div className={styles.profileCard}>
                    <h2 className={styles.cardTitle}>Профіль користувача</h2>

                    {/* Аватар */}
                    <div className={styles.avatarSection}>
                        <label
                            className={styles.avatarWrapper}
                            htmlFor={editMode ? "avatarInput" : undefined}
                            style={{ cursor: editMode ? "pointer" : "default" }}
                        >
                            {preview ? (
                                <img src={preview} alt="avatar" className={styles.avatarImg} />
                            ) : (
                                <div className={styles.avatarPlaceholder}>
                                    {getInitials(
                                        editMode ? formData.first_name : profile.first_name,
                                        editMode ? formData.last_name : profile.last_name
                                    )}
                                </div>
                            )}
                            {editMode && (
                                <div className={styles.avatarOverlay}>
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
                                        stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                                        <circle cx="12" cy="13" r="4"/>
                                    </svg>
                                </div>
                            )}
                        </label>
                        {editMode && (
                            <input
                                id="avatarInput"
                                type="file"
                                name="avatar"
                                accept="image/*"
                                onChange={handleChange}
                                className={styles.fileInput}
                            />
                        )}
                        {editMode && (
                            <span className={styles.avatarHint}>Натисніть, щоб змінити фото</span>
                        )}
                    </div>

                    {/* Інфо / Форма */}
                    {editMode ? (
                        <form onSubmit={handleSubmit} className={styles.form}>
                            <div className={styles.fieldRow}>
                                <div className={styles.fieldGroup}>
                                    <label className={styles.fieldLabel}>Ім'я</label>
                                    <input
                                        type="text"
                                        name="first_name"
                                        value={formData.first_name}
                                        onChange={handleChange}
                                        placeholder="Ім'я"
                                        className={styles.fieldInput}
                                    />
                                </div>
                                <div className={styles.fieldGroup}>
                                    <label className={styles.fieldLabel}>Прізвище</label>
                                    <input
                                        type="text"
                                        name="last_name"
                                        value={formData.last_name}
                                        onChange={handleChange}
                                        placeholder="Прізвище"
                                        className={styles.fieldInput}
                                    />
                                </div>
                            </div>

                            <div className={styles.fieldGroup}>
                                <label className={styles.fieldLabel}>Email</label>
                                <input
                                    type="email"
                                    value={formData.email}
                                    readOnly
                                    className={`${styles.fieldInput} ${styles.fieldInputReadonly}`}
                                />
                            </div>

                            <div className={styles.cardFooter}>
                                <button type="button" onClick={handleCancel} className={styles.btnSecondary}>
                                    Скасувати
                                </button>
                                <button type="submit" className={styles.btnPrimary}>
                                    Зберегти
                                </button>
                            </div>
                        </form>
                    ) : (
                        <>
                            <div className={styles.infoSection}>
                                <div className={styles.infoRow}>
                                    <span className={styles.infoLabel}>Ім'я</span>
                                    <span className={styles.infoValue}>
                                        {profile.first_name} {profile.last_name}
                                    </span>
                                </div>
                                <div className={styles.infoRow} style={{ borderBottom: "none" }}>
                                    <span className={styles.infoLabel}>Email</span>
                                    <span className={styles.infoValue}>{profile.email}</span>
                                </div>
                            </div>
                            <div className={styles.cardFooter}>
                                <button onClick={() => setEditMode(true)} className={styles.btnPrimary}>
                                    Редагувати
                                </button>
                            </div>
                        </>
                    )}
                </div>

                {/* Toast */}
                <div className={`${styles.toast} ${toast ? styles.toastShow : ""}`}>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
                        stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12"/>
                    </svg>
                    Профіль оновлено
                </div>
            </div>
        </NavBar>
    );
};

export default Profile;
