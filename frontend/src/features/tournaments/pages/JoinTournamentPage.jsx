import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { API, getAccessToken } from '@api';
import { Login, Register, Forgot } from "@features/auth";
import { RegistrationFormRenderer } from "../components/RegistrationFormBuilder";
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

  // Форма реєстрації
  const [answers, setAnswers] = useState({});
  const [formErrors, setFormErrors] = useState({});

  // Login modal
  const [showLogin,    setShowLogin]    = useState(false);
  const [showRegister, setShowRegister] = useState(false);
  const [showForgot,   setShowForgot]   = useState(false);

  const isLoggedIn = () => Boolean(getAccessToken());

  useEffect(() => {
    API.get(`/tournaments/join/${token}/preview/`)
      .then((r) => {
        setPreview(r.data);
        setAnswers({});
      })
      .catch(() => setPageError("Посилання недійсне або турнір не існує."))
      .finally(() => setPageLoading(false));
  }, [token]);

  const joinTournament = async () => {
    setJoining(true);
    setFormErrors({});
    try {
      // Відповіді: ключі як строки
      const payload = { token };
      if (preview?.registration_fields?.length) {
        payload.answers = answers;
      }
      const res = await API.post("/tournaments/join/", payload);
      setDone(true);
      setTimeout(() => navigate(`/tournament/${res.data.tournament_id}`), 1500);
    } catch (err) {
      const data = err.response?.data;
      if (data?.errors && typeof data.errors === "object") {
        setFormErrors(data.errors);
        setPageError(null);
      } else if (data?.role_mismatch) {
        setPageError(data?.detail || "Це посилання не для вашої ролі.");
      } else if (data?.reason) {
        // Закрита реєстрація з конкретною причиною (not_started/ended/finished)
        setPageError(data?.detail || "Реєстрація зараз закрита.");
      } else {
        setPageError(data?.detail || "Помилка при приєднанні.");
      }
    } finally {
      setJoining(false);
    }
  };

  const handleJoinClick = async () => {
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

  if (pageLoading) return (
    <div className={styles.page}>
      <div className={styles.card}>
        <p className={styles.hint}>Завантаження…</p>
      </div>
    </div>
  );

  if (pageError && !preview) return (
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

  const fields = preview?.registration_fields || [];
  const regClosed = preview && preview.registration_open === false;

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
          {regClosed ? (
            <p className={styles.error} style={{ fontWeight: 600 }}>
              🔒 {preview.registration_message || "Реєстрація в цей турнір зараз закрита."}
            </p>
          ) : (
            <p className={styles.hint}>Вас запрошено як учасника цього турніру. PIN-код не потрібен.</p>
          )}

          {fields.length > 0 && (
            <div style={{ textAlign: "left", width: "100%", marginTop: 8 }}>
              <p className={styles.hint} style={{ fontWeight: 700 }}>
                Заповніть форму реєстрації:
              </p>
              <RegistrationFormRenderer
                fields={fields}
                values={answers}
                onChange={setAnswers}
                errors={formErrors}
              />
            </div>
          )}

          {pageError && <p className={styles.error}>{pageError}</p>}

          <button className={styles.btn} onClick={handleJoinClick} disabled={regClosed}>
            {regClosed ? "Реєстрація закрита" : "Приєднатися до турніру"}
          </button>
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
