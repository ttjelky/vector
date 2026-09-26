import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { API, getAccessToken } from '@api';
import { Login } from "@features/auth";
import { Register } from "@features/auth";
import { Forgot } from "@features/auth";
import { RegistrationFormRenderer } from "@features/tournaments/components/RegistrationFormBuilder";
import styles from "../styles/JoinByCodeModal.module.css";

function extractToken(input) {
  const trimmed = input.trim();
  try {
    const url = new URL(trimmed);
    const match = url.pathname.match(/\/join\/([^/]+)\/?$/);
    if (match) return match[1];
  } catch {

  }
  return trimmed;
}

export function JoinByCodeModal({ onClose }) {
  const navigate = useNavigate();

  const [step, setStep] = useState("token");
  const [tokenInput, setTokenInput] = useState("");
  const [preview, setPreview] = useState(null);
  const [answers, setAnswers] = useState({});
  const [formErrors, setFormErrors] = useState({});
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Auth modals
  const [showLogin,    setShowLogin]    = useState(false);
  const [showRegister, setShowRegister] = useState(false);
  const [showForgot,   setShowForgot]   = useState(false);

  const isLoggedIn = () => Boolean(getAccessToken());

  const handleTokenSubmit = async () => {
    const token = extractToken(tokenInput);
    if (!token) {
      setError("Введіть дійсне посилання");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const r = await API.get(`/tournaments/join/${token}/preview/`);
      setPreview({ ...r.data, token });
      setAnswers({});
      setFormErrors({});
      setStep("confirm");
    } catch {
      setError("Посилання недійсне або турнір не існує.");
    } finally {
      setLoading(false);
    }
  };

  const joinTournament = async () => {
    setStep("joining");
    setFormErrors({});
    try {
      const payload = { token: preview.token };
      if (preview.registration_fields?.length) payload.answers = answers;
      const res = await API.post("/tournaments/join/", payload);
      setStep("done");
      setTimeout(() => {
        onClose();
        navigate(`/tournament/${res.data.tournament_id}`);
      }, 1200);
    } catch (err) {
      const data = err.response?.data;
      if (data?.errors && typeof data.errors === "object") {
        setFormErrors(data.errors);
        setStep("confirm");
      } else {
        // role_mismatch / reason (not_started/ended/finished) / invalid token
        setError(data?.detail || "Помилка при приєднанні.");
        setStep("confirm");
      }
    }
  };

  const handleConfirm = async () => {
    if (isLoggedIn()) {
      await joinTournament();
    } else {
      setShowLogin(true);
    }
  };

  const handleLoginSuccess = async () => {
    setShowLogin(false);
    await joinTournament();
  };

  const handleRegisterSuccess = async () => {
    setShowRegister(false);
    await joinTournament();
  };

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) onClose();
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      if (step === "token") handleTokenSubmit();
      else if (step === "confirm") handleConfirm();
    }
    if (e.key === "Escape") onClose();
  };

  return (
    <>
      <div className={styles.overlay} onClick={handleOverlayClick}>
        <div className={styles.modal} onKeyDown={handleKeyDown}>
          <button className={styles.closeBtn} onClick={onClose}>✕</button>

          {step === "token" && (
            <>
              <div className={styles.icon}>🔗</div>
              <h2 className={styles.title}>Приєднатися до турніру</h2>
              <p className={styles.hint}>
                Вставте унікальне посилання-запрошення, яке вам надав організатор. PIN-код не потрібен.
              </p>
              <input
                className={`${styles.input} ${error ? styles.inputError : ""}`}
                type="text"
                placeholder="https://…/join/… "
                value={tokenInput}
                onChange={(e) => { setTokenInput(e.target.value); setError(""); }}
                autoFocus
              />
              {error && <p className={styles.error}>{error}</p>}
              <button
                className={styles.btn}
                onClick={handleTokenSubmit}
                disabled={loading}
              >
                {loading ? "Перевірка…" : "Далі →"}
              </button>
            </>
          )}

          {step === "confirm" && preview && (
            <>
              <div className={styles.icon}>🏆</div>
              <h2 className={styles.title}>{preview.name}</h2>
              {preview.description && (
                <p className={styles.description}>
                  {preview.description.length > 100
                    ? preview.description.slice(0, 100) + "…"
                    : preview.description}
                </p>
              )}
              {preview.registration_open === false && (
                <p className={styles.error} style={{ fontWeight: 600 }}>
                  🔒 {preview.registration_message || "Реєстрація в цей турнір зараз закрита."}
                </p>
              )}
              {preview.registration_open !== false && (preview.registration_fields?.length > 0) && (
                <div style={{ textAlign: "left", width: "100%" }}>
                  <p className={styles.hint} style={{ fontWeight: 700 }}>Заповніть форму реєстрації:</p>
                  <RegistrationFormRenderer
                    fields={preview.registration_fields}
                    values={answers}
                    onChange={setAnswers}
                    errors={formErrors}
                  />
                </div>
              )}
              {error && <p className={styles.error}>{error}</p>}
              <div className={styles.btnRow}>
                <button
                  className={styles.btnSecondary}
                  onClick={() => { setStep("token"); setError(""); setFormErrors({}); }}
                >
                  ← Назад
                </button>
                <button
                  className={styles.btn}
                  onClick={handleConfirm}
                  disabled={loading || preview.registration_open === false}
                >
                  {preview.registration_open === false ? "Реєстрація закрита" : "Приєднатися"}
                </button>
              </div>
            </>
          )}

          {step === "joining" && (
            <>
              <div className={styles.icon}>⏳</div>
              <p className={styles.hint}>Приєднання до турніру…</p>
            </>
          )}

          {step === "done" && (
            <>
              <div className={styles.icon}>✅</div>
              <h2 className={styles.title}>Ви приєдналися!</h2>
              <p className={styles.hint}>Переходимо до турніру «{preview?.name}»…</p>
            </>
          )}
        </div>
      </div>

      {showLogin && (
        <Login
          isOpen={showLogin}
          onClose={() => setShowLogin(false)}
          onLoginSuccess={handleLoginSuccess}
          onSwitchToRegister={() => { setShowLogin(false); setShowRegister(true); }}
          onSwitchToForgot={()   => { setShowLogin(false); setShowForgot(true);   }}
        />
      )}

      {showRegister && (
        <Register
          isOpen={showRegister}
          onClose={() => setShowRegister(false)}
          onRegisterSuccess={handleRegisterSuccess}
          onSwitchToLogin={() => { setShowRegister(false); setShowLogin(true); }}
        />
      )}

      {showForgot && (
        <Forgot
          isOpen={showForgot}
          onClose={() => setShowForgot(false)}
          onBackToLogin={() => { setShowForgot(false); setShowLogin(true); }}
        />
      )}
    </>
  );
}
