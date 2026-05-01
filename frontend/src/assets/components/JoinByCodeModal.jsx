import { useState } from "react";
import { useNavigate } from "react-router-dom";
import API from "../../api";
import styles from "./styles/JoinByCodeModal.module.css";

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

export default function JoinByCodeModal({ onClose }) {
  const navigate = useNavigate();

  const [step, setStep] = useState("token");
  const [tokenInput, setTokenInput] = useState("");
  const [pin, setPin] = useState("");
  const [preview, setPreview] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

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
      setStep("pin");
    } catch {
      setError("Посилання недійсне або турнір не існує.");
    } finally {
      setLoading(false);
    }
  };

  const handlePinSubmit = async () => {
    if (!pin.trim()) {
      setError("Введіть PIN-код");
      return;
    }
    setLoading(true);
    setError("");
    try {
      await API.post(`/tournaments/join/${preview.token}/verify-pin/`, { pin: pin.trim() });
      setStep("joining");
      const res = await API.post("/tournaments/join/", { token: preview.token });
      setStep("done");
      setTimeout(() => {
        onClose();
        navigate(`/tournament/${res.data.tournament_id}`);
      }, 1200);
    } catch (err) {
      setError(err.response?.data?.detail || "Невірний PIN-код. Спробуйте ще раз.");
      setStep("pin");
    } finally {
      setLoading(false);
    }
  };

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) onClose();
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      if (step === "token") handleTokenSubmit();
      if (step === "pin") handlePinSubmit();
    }
    if (e.key === "Escape") onClose();
  };

  return (
    <div className={styles.overlay} onClick={handleOverlayClick}>
      <div className={styles.modal} onKeyDown={handleKeyDown}>
        <button className={styles.closeBtn} onClick={onClose}>✕</button>

        {step === "token" && (
          <>
            <div className={styles.icon}>🔗</div>
            <h2 className={styles.title}>Приєднатися до турніру</h2>
            <p className={styles.hint}>
              Вставте посилання-запрошення, яке вам надав організатор.
            </p>
            <input
              className={`${styles.input} ${error ? styles.inputError : ""}`}
              type="text"
              placeholder="https://… "
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

        {step === "pin" && preview && (
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
            <p className={styles.hint}>Введіть PIN-код для підтвердження.</p>
            <input
              className={`${styles.input} ${error ? styles.inputError : ""}`}
              type="text"
              inputMode="numeric"
              maxLength={6}
              placeholder="000000"
              value={pin}
              onChange={(e) => { setPin(e.target.value.replace(/\D/g, "")); setError(""); }}
              autoFocus
            />
            {error && <p className={styles.error}>{error}</p>}
            <div className={styles.btnRow}>
              <button
                className={styles.btnSecondary}
                onClick={() => { setStep("token"); setError(""); setPin(""); }}
              >
                ← Назад
              </button>
              <button
                className={styles.btn}
                onClick={handlePinSubmit}
                disabled={loading}
              >
                {loading ? "Перевірка…" : "Приєднатися"}
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
  );
}
