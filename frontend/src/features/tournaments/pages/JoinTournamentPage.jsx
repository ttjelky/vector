import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { API, getAccessToken } from '@api';
import { Login, Register, Forgot } from "@features/auth";
import styles from "../styles/JoinTournamentPage.module.css";
import Logo from "@static/VectorFavicon.png";
import { getDescriptionPreview } from "../components/TournamentCard";

export function JoinTournamentPage() {
  const { token } = useParams();
  const navigate = useNavigate();

  const [preview, setPreview] = useState(null);
  const [pageLoading, setPageLoading] = useState(true);
  const [pageError, setPageError] = useState(null);
  const [done, setDone] = useState(false);
  const [joining, setJoining] = useState(false);

  // PIN modal
  const [showPin, setShowPin] = useState(false);
  const [pin, setPin] = useState("");
  const [pinError, setPinError] = useState("");
  const [pinLoading, setPinLoading] = useState(false);

  // Login modal
  const [showLogin,    setShowLogin]    = useState(false);
  const [showRegister, setShowRegister] = useState(false);
  const [showForgot,   setShowForgot]   = useState(false);

  const isLoggedIn = () => Boolean(getAccessToken());

  useEffect(() => {
    API.get(`/tournaments/join/${token}/preview/`)
      .then((r) => setPreview(r.data))
      .catch(() => setPageError("Посилання недійсне або турнір не існує."))
      .finally(() => setPageLoading(false));
  }, [token]);

  const handleJoinClick = () => {
    setPin("");
    setPinError("");
    setShowPin(true);
  };

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

  const handleLoginSuccess = async () => {
    setShowLogin(false);
    await joinTournament();
  };

  const handleRegisterSuccess = async () => {
    setShowRegister(false);
    await joinTournament();
  };

  const handlePinKeyDown = (e) => {
    if (e.key === "Enter") handlePinSubmit();
  };

  if (pageLoading) return (
    <div className={styles.page}>
      <div className={styles.card}>
        <p className={styles.hint}>Завантаження…</p>
      </div>
    </div>
  );

  if (pageError) return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={styles.icon}>❌</div>
        <h2 className={styles.title}>Помилка</h2>
        <p className={styles.hint}>{pageError}</p>
        <button className={styles.btn} onClick={() => navigate("/tournaments")}>
          До турнірів
        </button>
      </div>
    </div>
  );

  if (joining && !done) return (
    <div className={styles.page}>
      <div className={styles.card}>
        <p className={styles.hint}>Приєднання до турніру…</p>
      </div>
    </div>
  );

  if (done) return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={styles.icon}>✅</div>
        <h2 className={styles.title}>Ви приєдналися!</h2>
        <p className={styles.hint}>Переходимо до турніру «{preview?.name}»…</p>
      </div>
    </div>
  );

  return (
    <>
      <div className={styles.page}>
        <div className={styles.card}>
          <div className={styles.icon}><img src={Logo} alt="Logo" /></div>
          <h2 className={styles.title}>{preview?.name}</h2>
          {preview?.description && (
            <p className={styles.description}>
              {getDescriptionPreview(preview.description, 120)}
            </p>
          )}
          <p className={styles.hint}>Вас запрошено як учасника цього турніру.</p>
          <button className={styles.btn} onClick={handleJoinClick}>
            Приєднатися до турніру
          </button>
        </div>
      </div>

      {showPin && (
        <div className={styles.overlay} onClick={() => setShowPin(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <button className={styles.closeBtn} onClick={() => setShowPin(false)}>✕</button>

            <div className={styles.icon}><img src={Logo} alt="Logo" /></div>
            <h2 className={styles.title}>Введіть PIN-код</h2>
            <p className={styles.hint}>
              Власник турніру надав вам окремий PIN-код разом із посиланням.
              Введіть його нижче для підтвердження.
            </p>

            <input
              className={`${styles.input} ${pinError ? styles.inputError : ""}`}
              type="text"
              inputMode="numeric"
              maxLength={6}
              placeholder="000000"
              value={pin}
              onChange={(e) => {
                setPin(e.target.value.replace(/\D/g, ""));
                setPinError("");
              }}
              onKeyDown={handlePinKeyDown}
              autoFocus
            />

            {pinError && <p className={styles.error}>{pinError}</p>}

            <button
              className={styles.btn}
              onClick={handlePinSubmit}
              disabled={pinLoading}
            >
              {pinLoading ? "Перевірка…" : "Підтвердити"}
            </button>
          </div>
        </div>
      )}

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