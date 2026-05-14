import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import API from "@api";
import Login from "./Login";
import styles from "@shared/styles/JoinByCodeModal.module.css";

export default function TeamInvitePage() {
  const { token } = useParams();
  const navigate  = useNavigate();

  const [info,      setInfo]      = useState(null);
  const [error,     setError]     = useState(null);
  const [loading,   setLoading]   = useState(false);
  const [acting,    setActing]    = useState(false);
  const [showLogin, setShowLogin] = useState(false);

  const isLoggedIn = () => !!localStorage.getItem("accessToken");

  const loadInvite = () => {
    setLoading(true);
    setError(null);
    API.get(`/tournaments/team-invite/${token}/`)
      .then(r => setInfo(r.data))
      .catch(e => {
        if (e.response?.status === 401 || e.response?.status === 403) {
          setShowLogin(true);
        } else {
          setError(e.response?.data?.detail || "Посилання недійсне.");
        }
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (isLoggedIn()) {
      loadInvite();
    } else {
      setShowLogin(true);
    }
  }, [token]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleLoginSuccess = () => {
    setShowLogin(false);
    loadInvite();
  };

  const handleClose = () => setShowLogin(false);

  const handle = async (action) => {
    setActing(true);
    try {
      await API.post(`/tournaments/team-invite/${token}/${action}/`);
      if (action === "accept") {
        navigate(`/tournament/${info.tournament_id}`);
      } else {
        navigate("/");
      }
    } catch (e) {
      setError(e?.response?.data?.detail || "Помилка.");
    } finally {
      setActing(false);
    }
  };

  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh" }}>
      <p style={{ color: "#999", fontSize: 14 }}>Завантаження…</p>
    </div>
  );

  return (
    <>
      <Login
        isOpen={showLogin}
        onClose={handleClose}
        onSwitchToRegister={handleClose}
        onSwitchToForgot={() => navigate("/reset-password")}
        onLoginSuccess={handleLoginSuccess}
      />

      {info && !showLogin && (
        <div className={styles.overlay}>
          <div className={styles.modal}>
            <div className={styles.icon}>🏆</div>

            <h2 className={styles.title}>Запрошення в команду</h2>

            <p className={styles.description}>
              <strong>{info.captain_name}</strong> запрошує вас у команду{" "}
              <strong>«{info.team_name}»</strong>
            </p>

            <p className={styles.hint}>
              Турнір «{info.tournament_name}»
            </p>

            {error && <p className={styles.error}>{error}</p>}

            <button
              className={styles.btn}
              onClick={() => handle("accept")}
              disabled={acting}
            >
              {acting ? "…" : "Прийняти"}
            </button>
          </div>
        </div>
      )}

      {error && !info && !showLogin && (
        <div className={styles.overlay}>
          <div className={styles.modal}>
            <div className={styles.icon}>⚠️</div>
            <h2 className={styles.title}>Посилання недійсне</h2>
            <p className={styles.description}>{error}</p>
            <button className={styles.btn} onClick={() => navigate("/")}>
              На головну
            </button>
          </div>
        </div>
      )}
    </>
  );
}
