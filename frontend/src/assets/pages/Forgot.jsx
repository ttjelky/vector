import React, { useState } from "react";
import styles from "../components/styles/forgotPage.module.css";
import cross from "../components/static/icons/cross.svg";

const Forgot = ({ isOpen, onClose, onBackToLogin }) => {
  const [isClosing, setIsClosing] = useState(false);
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      setIsClosing(false);
      onClose();
    }, 300);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("");
    setError("");

    try {
      const response = await fetch("http://127.0.0.1:8000/api/password_reset/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email }),
      });

      if (response.ok) {
        setMessage("Посилання для скидання пароля відправлено!");
      } else {
        setError("Користувача з таким email не знайдено.");
      }
    } catch (err) {
      setError("Помилка з'єднання з сервером.");
    }
  };

  if (!isOpen && !isClosing) return null;

  return (
    <div className={`${styles.overlay} ${isClosing ? styles.fadeOut : ""}`} onClick={handleClose}>
      <div className={`${styles.forgot} ${isClosing ? styles.modalOut : ""}`} onClick={(e) => e.stopPropagation()}>
        <img src={cross} alt="close" className={styles.cross} onClick={handleClose} />

        <form onSubmit={handleSubmit} noValidate className={styles.form}>
          <h1 className={styles.title}>Забули пароль?</h1>
          <p className={styles.description}>
            Вкажіть електронну пошту вашого акаунта, щоб скинути пароль.
          </p>

          <div className={styles.inputGroups}>
            <div className={styles.fieldWrapper}>
              <p className={styles.label}>Email</p>
              <input
                type="email"
                className={styles.input}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
          </div>

          {message && <p className={styles.successText}>{message}</p>}
          {error && <p className={styles.errorTextDetail}>{error}</p>}

          <button type="submit" disabled={!email} className={styles.thebutton}>
            Скинути пароль
          </button>

          <div className={styles.bottom}>
            <span className={styles.backToLogin} onClick={onBackToLogin}>
              Повернутися до входу
            </span>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Forgot;