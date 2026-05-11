import React, { useState } from 'react';
import styles from "../components/styles/registerPage.module.css";
import cross from "../components/static/icons/cross.svg";
import { registerUser, loginUser } from '../../api';
import { useNavigate } from 'react-router-dom';
import { ROLE_HOME } from '../../navConfig';

const ROLES = [
  {
    value: "admin",
    label: "Адміністратор",
    desc: "Створюю та керую турнірами",
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
      </svg>
    ),
  },
  {
    value: "participant",
    label: "Учасник",
    desc: "Беру участь у турнірах та змагаюся",
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
        <circle cx="9" cy="7" r="4"/>
        <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
        <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
      </svg>
    ),
  },
  {
    value: "jury",
    label: "Журі",
    desc: "Оцінюю роботи та виставляю бали",
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="3" width="20" height="14" rx="2"/>
        <path d="M8 21h8M12 17v4"/>
        <path d="M7 8l3 3 5-5"/>
      </svg>
    ),
  },
];

const emailTranslations = {
  "user with this email already exists": "Акаунт з такою поштою вже існує. Спробуйте увійти.",
  "Enter a valid email address.": "Введіть коректну адресу електронної пошти.",
};

const passwordTranslations = {
  "This password is too short. It must contain at least 8 characters.": "Пароль занадто короткий. Мінімум 8 символів.",
  "This password is too common.": "Пароль занадто простий. Оберіть надійніший.",
  "This password is entirely numeric.": "Пароль не може складатися лише з цифр.",
};

const Register = ({ isOpen, onClose, onSwitchToLogin }) => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [role, setRole] = useState("");
  const [formData, setFormData] = useState({ first_name: '', last_name: '', email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrors({});
    setIsLoading(true);

    // ── Крок 1: реєстрація ────────────────────────────────────────
    try {
      await registerUser({ ...formData, role });
    } catch (error) {
      const serverErrors = error.response?.data;

      if (serverErrors && typeof serverErrors === "object" && !Array.isArray(serverErrors)) {
        const translatedErrors = { ...serverErrors };

        if (serverErrors.email) {
          translatedErrors.email = serverErrors.email.map(
            (msg) => emailTranslations[msg] || msg
          );
        }
        if (serverErrors.password) {
          translatedErrors.password = serverErrors.password.map(
            (msg) => passwordTranslations[msg] || msg
          );
        }

        setErrors(translatedErrors);
        // Якщо помилка у полях форми — повертаємось на крок 1
        if (serverErrors.email || serverErrors.first_name || serverErrors.last_name || serverErrors.password) {
          setStep(1);
        }
      } else {
        setErrors({ detail: "Сталася помилка. Спробуйте ще раз." });
        setStep(1);
      }

      setIsLoading(false);
      return; // зупиняємось — не йдемо до логіну
    }

    // ── Крок 2: автологін після успішної реєстрації ───────────────
    try {
      const response = await loginUser({ email: formData.email, password: formData.password });
      const { access, first_name, last_name, role: returnedRole = "participant" } = response.data;

      localStorage.setItem("accessToken", access);
      localStorage.setItem("userRole", returnedRole);
      localStorage.setItem(
        "fullUserName",
        `${first_name || formData.first_name} ${last_name || formData.last_name}`.trim()
      );

      onClose();
      navigate(ROLE_HOME[returnedRole] ?? ROLE_HOME.participant);

    } catch {
      // Реєстрація пройшла успішно, але автологін не вдався
      // (наприклад, сервер тимчасово недоступний)
      setErrors({ detail: "Акаунт створено! Тепер увійдіть вручну." });
      // Не повертаємось на крок 1 — показуємо повідомлення на кроці 2
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setStep(1);
    setRole("");
    setFormData({ first_name: '', last_name: '', email: '', password: '' });
    setErrors({});
    onClose();
  };

  const step1Valid = formData.first_name && formData.last_name && formData.email && formData.password;

  if (!isOpen) return null;

  return (
    <div className={styles.overlay} onClick={handleClose}>
      <div className={styles.register} onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">

        {/* Floating header */}
        <div className={styles.header}>
          <div className={styles.stepIndicator}>
            <div className={`${styles.stepDot} ${step >= 1 ? styles.stepDotActive : ''}`} />
            <div className={`${styles.stepLine} ${step >= 2 ? styles.stepLineActive : ''}`} />
            <div className={`${styles.stepDot} ${step >= 2 ? styles.stepDotActive : ''}`} />
          </div>
          <img src={cross} alt="Закрити" className={styles.cross} onClick={handleClose} />
        </div>

        <form onSubmit={handleSubmit} noValidate className={styles.form}>

          {/* ── STEP 1 ── */}
          {step === 1 && (
            <div className={styles.stepContent}>
              <div className={styles.stepMeta}>
                <span className={styles.stepNum}>Крок 1 з 2</span>
                <h2 className={styles.stepTitle}>Ваші дані</h2>
                <p className={styles.stepSub}>Введіть основну інформацію для створення акаунту</p>
              </div>

              <div className={styles.twoCol}>
                <div className={styles.field}>
                  <label className={styles.fieldLabel}>Ім'я</label>
                  <input type="text" name="first_name" value={formData.first_name}
                    onChange={handleChange} className={styles.input} placeholder="Іван" required />
                  {errors.first_name && <span className={styles.errorText}>{errors.first_name[0]}</span>}
                </div>
                <div className={styles.field}>
                  <label className={styles.fieldLabel}>Прізвище</label>
                  <input type="text" name="last_name" value={formData.last_name}
                    onChange={handleChange} className={styles.input} placeholder="Шевченко" required />
                  {errors.last_name && <span className={styles.errorText}>{errors.last_name[0]}</span>}
                </div>
              </div>

              <div className={styles.field}>
                <label className={styles.fieldLabel}>Email</label>
                <input type="email" name="email" value={formData.email}
                  onChange={handleChange} className={styles.input} placeholder="ivan@example.com" required />
                {errors.email && (
                  <span className={styles.errorText}>
                    {errors.email[0]}
                    {errors.email[0]?.includes("вже існує") && (
                      <>
                        {" "}
                        <span
                          onClick={onSwitchToLogin}
                          style={{ cursor: "pointer", textDecoration: "underline", color: "inherit" }}
                        >
                          Увійти
                        </span>
                      </>
                    )}
                  </span>
                )}
              </div>

              <div className={styles.field}>
                <label className={styles.fieldLabel}>Пароль</label>
                <input type="password" name="password" value={formData.password}
                  onChange={handleChange} className={styles.input} placeholder="Мінімум 8 символів" required />
                {errors.password && <span className={styles.errorText}>{errors.password[0]}</span>}
              </div>

              <hr className={styles.divider} />

              <div className={styles.underform}>
                <div onClick={onSwitchToLogin} style={{ cursor: "pointer" }}>
                  <span>Вже маєте акаунт? </span>
                  <a>Увійти</a>
                </div>
              </div>
            </div>
          )}

          {/* ── STEP 2 ── */}
          {step === 2 && (
            <div className={styles.stepContent}>
              <div className={styles.stepMeta}>
                <span className={styles.stepNum}>Крок 2 з 2</span>
                <h2 className={styles.stepTitle}>Ваша роль</h2>
                <p className={styles.stepSub}>Оберіть як ви плануєте використовувати платформу</p>
              </div>

              <div className={styles.roleGrid}>
                {ROLES.map(({ value, label, desc, icon }) => (
                  <button
                    key={value}
                    type="button"
                    className={`${styles.roleCard} ${role === value ? styles.roleCardActive : ''}`}
                    onClick={() => setRole(value)}
                  >
                    <div className={`${styles.roleIcon} ${role === value ? styles.roleIconActive : ''}`}>
                      {icon}
                    </div>
                    <span className={styles.roleLabel}>{label}</span>
                    <span className={styles.roleDesc}>{desc}</span>
                    {role === value && (
                      <div className={styles.roleCheck}>
                        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                          <path d="M2 6l3 3 5-5" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </div>
                    )}
                  </button>
                ))}
              </div>

              {errors.detail && <p className={styles.errorText}>{errors.detail}</p>}
            </div>
          )}

          {/* Floating footer */}
          <div className={styles.footer}>
            {step === 1 ? (
              <>
                <button type="button" className={styles.btnCancel} onClick={handleClose}>Скасувати</button>
                <button type="button" className={styles.btnSubmit} disabled={!step1Valid}
                  onClick={() => setStep(2)}>
                  Далі →
                </button>
              </>
            ) : (
              <>
                <button type="button" className={styles.btnCancel} onClick={() => setStep(1)}>← Назад</button>
                <button type="submit" className={styles.btnSubmit} disabled={!role || isLoading}>
                  {isLoading ? "Завантаження..." : "Зареєструватися"}
                </button>
              </>
            )}
          </div>

        </form>
      </div>
    </div>
  );
};

export default Register;
