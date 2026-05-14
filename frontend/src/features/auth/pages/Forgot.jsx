import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import styles from "../styles/forgotPage.module.css";
import cross from "@static/icons/cross.svg";

const Forgot = ({ isOpen, onClose, onBackToLogin }) => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');
    setError('');

    try {
      const response = await fetch('http://127.0.0.1:8000/api/password_reset/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      if (response.ok) {
        setMessage('Посилання для скидання пароля відправлено на вашу пошту!');
      } else {
        setError('Користувача з таким email не знайдено.');
      }
    } catch (err) {
      setError("Помилка з'єднання з сервером.");
    }
  };

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.forgot} onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="forgot-title">

        {/* Floating header */}
        <div className={styles.header}>
          <h2 id="forgot-title" className={styles.title}>Забули пароль?</h2>
          <img src={cross} alt="Закрити" className={styles.cross} onClick={onClose} />
        </div>

        <form onSubmit={handleSubmit} noValidate className={styles.form}>

          <p className={styles.subtitle}>
            Вкажіть електронну пошту, пов'язану з вашим акаунтом, щоб скинути пароль.
          </p>

          {/* Email */}
          <div>
            <p className={styles.fieldLabel}>Email</p>
            <input
              type="email"
              className={styles.input}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          {message && <p className={styles.successText}>{message}</p>}
          {error   && <p className={styles.errorText}>{error}</p>}

          <hr className={styles.sectionDivider} />

          {/* Back link */}
          <div>
            <a className={styles.backToLogin} onClick={onBackToLogin}>
              ← Повернутися до входу
            </a>
          </div>

          {/* Floating footer */}
          <div className={styles.footer}>
            <button type="button" className={styles.btnCancel} onClick={onClose}>
              Скасувати
            </button>
            <button type="submit" className={styles.btnSubmit} disabled={!email}>
              Скинути пароль
            </button>
          </div>

        </form>
      </div>
    </div>
  );
};

export { Forgot };
