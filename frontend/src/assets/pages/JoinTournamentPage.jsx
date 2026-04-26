import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import API from "../../api";
import Login from "./Login";

/**
 * Сторінка /join/:token
 *
 * Flow:
 *  1. Завантажує прев'ю турніру (публічно)
 *  2. Показує картку з кнопкою "Приєднатися"
 *  3. Клік → модалка введення PIN-коду
 *  4. Вірний PIN:
 *     - якщо авторизований → одразу приєднує і редиректить
 *     - якщо ні          → відкриває модалку логіну
 *  5. Після логіну → приєднує і редиректить
 */
export default function JoinTournamentPage() {
  const { token }  = useParams();
  const navigate   = useNavigate();

  const [preview,     setPreview]     = useState(null);
  const [pageLoading, setPageLoading] = useState(true);
  const [pageError,   setPageError]   = useState(null);
  const [done,        setDone]        = useState(false);
  const [joining,     setJoining]     = useState(false);

  // PIN modal
  const [showPin,    setShowPin]    = useState(false);
  const [pin,        setPin]        = useState("");
  const [pinError,   setPinError]   = useState("");
  const [pinLoading, setPinLoading] = useState(false);

  // Login modal
  const [showLogin, setShowLogin] = useState(false);

  const isLoggedIn = () => !!localStorage.getItem("accessToken");

  // Крок 1: отримати прев'ю турніру (без авторизації)
  useEffect(() => {
    API.get(`/tournaments/join/${token}/preview/`)
      .then(r => setPreview(r.data))
      .catch(() => setPageError("Посилання недійсне або турнір не існує."))
      .finally(() => setPageLoading(false));
  }, [token]);

  // Крок 3: відкрити PIN-модалку
  const handleJoinClick = () => {
    setPin("");
    setPinError("");
    setShowPin(true);
  };

  // Крок 4: перевірити PIN
  const handlePinSubmit = async () => {
    const trimmed = pin.trim();
    if (!trimmed) {
      setPinError("Введіть PIN-код");
      return;
    }
    setPinLoading(true);
    setPinError("");
    try {
      await API.post(`/tournaments/join/${token}/verify-pin/`, { pin: trimmed });
      setShowPin(false);

      if (isLoggedIn()) {
        await joinTournament();
      } else {
        setShowLogin(true);
      }
    } catch (err) {
      setPinError(err.response?.data?.detail || "Невірний PIN-код. Спробуйте ще раз.");
    } finally {
      setPinLoading(false);
    }
  };

  // Крок 5: приєднатися до турніру
  const joinTournament = async () => {
    setJoining(true);
    try {
      const res = await API.post("/tournaments/join/", { token });
      setDone(true);
      setTimeout(() => navigate(`/tournament/${res.data.tournament_id}`), 1500);
    } catch (err) {
      setPageError(err.response?.data?.detail || "Помилка при приєднанні.");
    } finally {
      setJoining(false);
    }
  };

  // Викликається після успішного логіну
  const handleLoginSuccess = async () => {
    setShowLogin(false);
    await joinTournament();
  };

  // Enter у полі PIN
  const handlePinKeyDown = (e) => {
    if (e.key === "Enter") handlePinSubmit();
  };

  // ── Стани сторінки ──────────────────────────────────────────────────────────

  if (pageLoading) return (
    <div style={s.page}>
      <div style={s.card}>
        <p style={s.hint}>Завантаження…</p>
      </div>
    </div>
  );

  if (pageError) return (
    <div style={s.page}>
      <div style={s.card}>
        <div style={s.icon}>❌</div>
        <h2 style={s.title}>Помилка</h2>
        <p style={s.hint}>{pageError}</p>
        <button style={s.btn} onClick={() => navigate("/tournaments")}>
          До турнірів
        </button>
      </div>
    </div>
  );

  if (joining && !done) return (
    <div style={s.page}>
      <div style={s.card}>
        <p style={s.hint}>Приєднання до турніру…</p>
      </div>
    </div>
  );

  if (done) return (
    <div style={s.page}>
      <div style={s.card}>
        <div style={s.icon}>✅</div>
        <h2 style={s.title}>Ви приєдналися!</h2>
        <p style={s.hint}>Переходимо до турніру «{preview?.name}»…</p>
      </div>
    </div>
  );

  return (
    <>
      {/* ── Картка турніру ──────────────────────────────────────────────────── */}
      <div style={s.page}>
        <div style={s.card}>
          <div style={s.icon}>🏆</div>
          <h2 style={s.title}>{preview?.name}</h2>
          {preview?.description && (
            <p style={s.description}>
              {preview.description.length > 120
                ? preview.description.slice(0, 120) + "…"
                : preview.description}
            </p>
          )}
          <p style={s.hint}>Вас запрошено як учасника цього турніру.</p>
          <button style={s.btn} onClick={handleJoinClick}>
            Приєднатися до турніру
          </button>
        </div>
      </div>

      {/* ── Модалка PIN ─────────────────────────────────────────────────────── */}
      {showPin && (
        <div style={s.overlay} onClick={() => setShowPin(false)}>
          <div style={s.modal} onClick={e => e.stopPropagation()}>
            <button style={s.closeBtn} onClick={() => setShowPin(false)}>✕</button>

            <div style={s.icon}>🔐</div>
            <h2 style={s.title}>Введіть PIN-код</h2>
            <p style={s.hint}>
              Власник турніру надав вам окремий PIN-код разом із посиланням.
              Введіть його нижче для підтвердження.
            </p>

            <input
              style={{
                ...s.input,
                borderColor: pinError ? "#e53e3e" : "#ddd",
              }}
              type="text"
              inputMode="numeric"
              maxLength={6}
              placeholder="000000"
              value={pin}
              onChange={e => {
                setPin(e.target.value.replace(/\D/g, ""));
                setPinError("");
              }}
              onKeyDown={handlePinKeyDown}
              autoFocus
            />

            {pinError && <p style={s.error}>{pinError}</p>}

            <button
              style={{
                ...s.btn,
                opacity: pinLoading ? 0.7 : 1,
                cursor: pinLoading ? "not-allowed" : "pointer",
              }}
              onClick={handlePinSubmit}
              disabled={pinLoading}
            >
              {pinLoading ? "Перевірка…" : "Підтвердити"}
            </button>
          </div>
        </div>
      )}

      {/* ── Модалка логіну ──────────────────────────────────────────────────── */}
      {showLogin && (
        <Login
          isOpen={showLogin}
          onClose={() => setShowLogin(false)}
          onLoginSuccess={handleLoginSuccess}
          onSwitchToRegister={() => {}}
          onSwitchToForgot={() => {}}
        />
      )}
    </>
  );
}

// ── Стилі ────────────────────────────────────────────────────────────────────
const s = {
  page: {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "#f4f6fa",
  },
  card: {
    background: "#fff",
    borderRadius: 16,
    padding: "40px 48px",
    maxWidth: 440,
    width: "100%",
    textAlign: "center",
    boxShadow: "0 4px 24px rgba(0,0,0,0.08)",
  },
  overlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,0.45)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1000,
  },
  modal: {
    position: "relative",
    background: "#fff",
    borderRadius: 16,
    padding: "40px 48px",
    maxWidth: 420,
    width: "100%",
    textAlign: "center",
    boxShadow: "0 8px 40px rgba(0,0,0,0.18)",
  },
  closeBtn: {
    position: "absolute",
    top: 16,
    right: 16,
    background: "none",
    border: "none",
    fontSize: 18,
    cursor: "pointer",
    color: "#888",
    lineHeight: 1,
  },
  icon: {
    fontSize: 48,
    marginBottom: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: 700,
    margin: "0 0 12px",
    color: "#1a1a2e",
  },
  description: {
    fontSize: 14,
    color: "#555",
    marginBottom: 16,
    lineHeight: 1.5,
  },
  hint: {
    fontSize: 14,
    color: "#888",
    marginBottom: 24,
    lineHeight: 1.5,
  },
  input: {
    width: "100%",
    padding: "12px 16px",
    fontSize: 24,
    fontWeight: 700,
    letterSpacing: "0.3em",
    textAlign: "center",
    border: "2px solid #ddd",
    borderRadius: 10,
    outline: "none",
    marginBottom: 12,
    boxSizing: "border-box",
    transition: "border-color 0.2s",
  },
  error: {
    color: "#e53e3e",
    fontSize: 13,
    marginBottom: 16,
    marginTop: 0,
  },
  btn: {
    background: "#378ADD",
    color: "#fff",
    border: "none",
    borderRadius: 8,
    padding: "12px 28px",
    fontSize: 15,
    fontWeight: 600,
    cursor: "pointer",
    width: "100%",
    marginTop: 8,
  },
};
