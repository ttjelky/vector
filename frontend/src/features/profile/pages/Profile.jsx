import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Phone } from "lucide-react";
import { fetchProfile, updateProfile } from "../api/profile";
import styles from "../styles/profile.module.css";
import { NavBar } from "@shared/components/NavBar";
import { API, mediaUrl, getAccessToken, clearAccessToken, logoutUser } from "@api";
import { ConfirmDeleteModal } from "@features/tournaments";

// ── helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso) {
    if (!iso) return "—";
    return new Date(iso).toLocaleDateString("uk-UA", {
        day: "2-digit", month: "long", year: "numeric",
    });
}

function calcTotal(scores) {
    if (!scores || typeof scores !== "object") return null;
    const vals = Object.values(scores).map(Number).filter(v => !isNaN(v));
    return vals.length === 0 ? null : vals.reduce((a, b) => a + b, 0);
}

const BIO_PLACEHOLDERS = [
    "Хм, біографії ще немає...",
    "Користувач не розказав про себе",
    "Біографії ще немає",
    "Тут поки порожньо — розкажіть про себе",
];

// ── Profile ───────────────────────────────────────────────────────────────────

const Profile = () => {
    const role = localStorage.getItem("userRole") ?? "participant";
    const navigate = useNavigate();

    const [profile,  setProfile]  = useState(null);
    const [editMode, setEditMode] = useState(false);
    const [formData, setFormData] = useState({ first_name: "", last_name: "", email: "", avatar: null, bio: "", phone: "", banner: null });
    const [preview,  setPreview]  = useState(null);
    const [bannerPreview, setBannerPreview] = useState(null);
    const [loading,  setLoading]  = useState(true);
    const [toast,    setToast]    = useState(false);

    const [logoutConfirm, setLogoutConfirm] = useState(false);
    const [logoutLoading, setLogoutLoading] = useState(false);

    const bioPlaceholder = useMemo(
        () => BIO_PLACEHOLDERS[Math.floor(Math.random() * BIO_PLACEHOLDERS.length)],
        []
    );

    // jury
    const [submissions,   setSubmissions]   = useState([]);
    const [subsLoading,   setSubsLoading]   = useState(false);

    useEffect(() => {
        const loadProfile = async () => {
            const data = await fetchProfile();
            if (data) {
                setProfile(data);
                setFormData({
                    first_name: data.first_name || "",
                    last_name:  data.last_name  || "",
                    email:      data.email      || "",
                    avatar:     null,
                    bio:        data.bio        || "",
                    phone:      data.phone      || "",
                    banner:     null,
                });
                setPreview(mediaUrl(data.avatar));
                setBannerPreview(mediaUrl(data.banner));
            }
            setLoading(false);
        };
        loadProfile();
    }, []);

    useEffect(() => {
        if (role !== "jury") return;
        setSubsLoading(true);
        API.get("/profile/jury-submissions/")
            .then(r => setSubmissions(r.data ?? []))
            .catch(() => {})
            .finally(() => setSubsLoading(false));
    }, [role]);

    const handleChange = (e) => {
        const { name, value, files } = e.target;
        if (name === "avatar") {
            const file = files[0];
            if (!file) return;
            setFormData(prev => ({ ...prev, avatar: file }));
            setPreview(URL.createObjectURL(file));
        } else if (name === "banner") {
            const file = files[0];
            if (!file) return;
            setFormData(prev => ({ ...prev, banner: file }));
            setBannerPreview(URL.createObjectURL(file));
        } else {
            setFormData(prev => ({ ...prev, [name]: value }));
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const updated = await updateProfile(formData);
        if (!updated) return;

        setProfile(updated);
        setEditMode(false);

        const avatarAbsolute = mediaUrl(updated.avatar);
        setPreview(avatarAbsolute);
        setBannerPreview(mediaUrl(updated.banner));

        const fullName = `${updated.first_name} ${updated.last_name}`.trim();
        localStorage.setItem("fullUserName", fullName);

        window.dispatchEvent(new CustomEvent("profile-updated", {
            detail: {
                fullUserName: fullName,
                avatar: avatarAbsolute,
            },
        }));

        // +200ms щоб анімація виходу встигла відпрацювати
        setToast(true);
        setTimeout(() => setToast(false), 2700);
    };

    const handleCancel = () => {
        setEditMode(false);
        setFormData({
            first_name: profile.first_name || "",
            last_name:  profile.last_name  || "",
            email:      profile.email      || "",
            avatar:     null,
            bio:        profile.bio        || "",
            phone:      profile.phone      || "",
            banner:     null,
        });
        setPreview(mediaUrl(profile.avatar));
        setBannerPreview(mediaUrl(profile.banner));
    };

    const doLogout = async () => {
        setLogoutLoading(true);
        try { await logoutUser(); } catch {}
        clearAccessToken();
        localStorage.removeItem("userRole");
        localStorage.removeItem("fullUserName");
        localStorage.removeItem("role");
        localStorage.removeItem("userName");
        localStorage.removeItem("userId");
        window.dispatchEvent(new Event("auth-changed"));
        navigate("/");
    };

    const getInitials = (first, last) => {
        const f = first?.[0]?.toUpperCase() || "";
        const l = last?.[0]?.toUpperCase() || "";
        return f + l || "?";
    };

    if (loading)
        return <NavBar><p className={styles.loading}>Завантаження...</p></NavBar>;

    if (!profile || !profile.first_name)
        return <p className={styles.error}>Не вдалося завантажити профіль</p>;

    return (
        <NavBar>
            <div className={styles.pageWrapper}>
                <div className={styles.profileLayout}>

                    {/* ── Ліва колонка: картка профілю ── */}
                    <div className={styles.profileCard}>
                        <div className={styles.banner}>
                            {bannerPreview ? (
                                <img src={bannerPreview} alt="" className={styles.bannerImg} />
                            ) : (
                                <div className={styles.bannerPlaceholder} />
                            )}
                            {editMode && (
                                <label className={styles.bannerOverlay} htmlFor="bannerInput">
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
                                        stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                                        <circle cx="12" cy="13" r="4"/>
                                    </svg>
                                    Змінити обкладинку
                                </label>
                            )}
                        </div>
                        {editMode && (
                            <input id="bannerInput" type="file" name="banner"
                                accept="image/*" onChange={handleChange} className={styles.fileInput} />
                        )}
                        <div className={styles.profileBody}>
                        <div className={`${styles.avatarSection} ${styles.avatarPull}`}>
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
                                            editMode ? formData.last_name  : profile.last_name
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
                                <input id="avatarInput" type="file" name="avatar"
                                    accept="image/*" onChange={handleChange} className={styles.fileInput} />
                            )}
                            {editMode && <span className={styles.avatarHint}>Натисніть, щоб змінити фото</span>}
                        </div>
                        {!editMode && (
                            <>
                                <div className={styles.profileName}>{profile.first_name} {profile.last_name}</div>
                                <div className={styles.profileEmail}>{profile.email}</div>
                                <div className={styles.profileBio}>
                                    {profile.bio || <span className={styles.placeholder}>{bioPlaceholder}</span>}
                                </div>
                                <div className={styles.phoneRow}>
                                    <Phone size={15} strokeWidth={2} />
                                    {profile.phone || <span className={styles.placeholder}>Додати телефон</span>}
                                </div>
                            </>
                        )}

                        {editMode ? (
                            <form onSubmit={handleSubmit} className={styles.form}>
                                <div className={styles.fieldRow}>
                                    <div className={styles.fieldGroup}>
                                        <label className={styles.fieldLabel}>Ім'я</label>
                                        <input type="text" name="first_name" value={formData.first_name}
                                            onChange={handleChange} placeholder="Ім'я" className="input" />
                                    </div>
                                    <div className={styles.fieldGroup}>
                                        <label className={styles.fieldLabel}>Прізвище</label>
                                        <input type="text" name="last_name" value={formData.last_name}
                                            onChange={handleChange} placeholder="Прізвище" className="input" />
                                    </div>
                                </div>
                                <div className={styles.fieldGroup}>
                                    <label className={styles.fieldLabel}>Про себе</label>
                                    <textarea name="bio" value={formData.bio} rows={3} maxLength={300}
                                        onChange={handleChange} placeholder="Кілька слів про себе"
                                        className="input input-area" />
                                </div>
                                <div className={styles.fieldGroup}>
                                    <label className={styles.fieldLabel}>Телефон</label>
                                    <input type="tel" name="phone" value={formData.phone}
                                        onChange={handleChange} placeholder="+380 …" className="input" />
                                </div>
                                <div className={styles.fieldGroup}>
                                    <label className={styles.fieldLabel}>Email</label>
                                    <input type="email" value={formData.email} readOnly
                                        className="input" />
                                </div>
                                <div className={styles.cardFooter}>
                                    <button type="button" onClick={handleCancel} className="btn-secondary">
                                        Скасувати
                                    </button>
                                    <button type="submit" className="btn-primary">Зберегти</button>
                                </div>
                            </form>
                        ) : (
                            <>
                                <div className={styles.cardFooter}>
                                    <button onClick={() => setEditMode(true)} className="btn-primary">
                                        Редагувати
                                    </button>
                                    <button
                                        onClick={() => setLogoutConfirm(true)}
                                        className={styles.btnDanger}
                                    >
                                        Вийти
                                    </button>
                                </div>
                            </>
                        )}
                        </div>
                    </div>

                    {/* ── Права колонка: деталі по ролі ── */}
                    {role === "jury" && (
                        <div className={styles.detailsCard}>
                            <h2 className={styles.cardTitle}>Мої оцінені роботи</h2>
                            <JurySubmissions submissions={submissions} loading={subsLoading} />
                        </div>
                    )}
                </div>

                {/* ── Toast ── */}
                <div className={`${styles.toast} ${toast ? styles.toastShow : ""}`}>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
                        stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12"/>
                    </svg>
                    Профіль оновлено
                </div>
            </div>

            {logoutConfirm && (
                <ConfirmDeleteModal
                    icon={null}
                    title="Вийти з акаунту?"
                    description="Ви впевнені, що хочете вийти? Всі незбережені дані буде втрачено."
                    confirmLabel="Так, вийти"
                    onConfirm={doLogout}
                    onCancel={() => setLogoutConfirm(false)}
                    loading={logoutLoading}
                />
            )}
        </NavBar>
    );
};

// ── JurySubmissions ───────────────────────────────────────────────────────────

function JurySubmissions({ submissions, loading }) {
    const [filter, setFilter] = useState("all");

    if (loading) return <p className={styles.detailsLoading}>Завантаження...</p>;
    if (!submissions.length) return <p className={styles.detailsEmpty}>Робіт ще немає</p>;

    const filtered = submissions.filter(s => {
        if (filter === "graded")  return s.my_grade != null;
        if (filter === "pending") return s.my_grade == null;
        return true;
    });

    const gradedCount  = submissions.filter(s => s.my_grade != null).length;
    const pendingCount = submissions.filter(s => s.my_grade == null).length;

    return (
        <div>
            <div className={styles.statsRow}>
                <div className={styles.statChip}>
                    <span className={styles.statValue}>{submissions.length}</span>
                    <span className={styles.statLabel}>Всього</span>
                </div>
                <div className={`${styles.statChip} ${styles.statChipSuccess}`}>
                    <span className={styles.statValue}>{gradedCount}</span>
                    <span className={styles.statLabel}>Оцінено</span>
                </div>
                <div className={`${styles.statChip} ${styles.statChipWarning}`}>
                    <span className={styles.statValue}>{pendingCount}</span>
                    <span className={styles.statLabel}>Очікують</span>
                </div>
            </div>

            <div className={styles.filterRow}>
                {[
                    { key: "all",     label: "Всі" },
                    { key: "graded",  label: "Оцінені" },
                    { key: "pending", label: "Не оцінені" },
                ].map(f => (
                    <button
                        key={f.key}
                        className={`${styles.filterBtn} ${filter === f.key ? styles.filterBtnActive : ""}`}
                        onClick={() => setFilter(f.key)}
                    >
                        {f.label}
                    </button>
                ))}
            </div>

            <div className={styles.submissionList}>
                {filtered.map(sub => {
                    const isGraded = sub.my_grade != null;
                    const total = isGraded
                        ? (sub.my_grade.total ?? calcTotal(sub.my_grade.scores))
                        : null;
                    return (
                        <div key={sub.id} className={styles.submissionItem}>
                            <div className={styles.submissionMain}>
                                <span className={styles.submissionTitle}>{sub.task_title || "Без назви"}</span>
                                <span className={styles.submissionRound}>{sub.round_title}</span>
                            </div>
                            <div className={styles.submissionMeta}>
                                <span className={styles.submissionDate}>{formatDate(sub.submitted_at)}</span>
                                <span className={`${styles.statusPill} ${isGraded ? styles.statusGraded : styles.statusPending}`}>
                                    {isGraded ? (total != null ? `${total} балів` : "Оцінено") : "Не оцінено"}
                                </span>
                            </div>
                        </div>
                    );
                })}
                {filtered.length === 0 && (
                    <p className={styles.detailsEmpty}>Немає робіт у цій категорії</p>
                )}
            </div>
        </div>
    );
}

export { Profile };