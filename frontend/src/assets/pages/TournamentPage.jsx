import { useState, useEffect } from "react";
import styles from "../components/styles/TournamentPage.module.css";
import NavBar from "../components/NavBar";
import { useParams, useNavigate } from "react-router-dom";
import API from "../../api";
import { STOCK_IMAGES } from "../components/TournamentCard";
import { StatusBadge, ConfirmDeleteModal } from "../components/TournamentShared";
import { computeStatus } from "../components/tournamentHelpers";
import OverviewTab from "../components/OverviewTab";
import ParticipantsTab from "../components/ParticipantsTab";
import RoundsTab from "../components/RoundsTab";
import JuryTab from "../components/JuryTab";
import { useTabs } from "../../TabsContext";
import useTournamentTabGuard from "../../useTournamentTabGuard";
import LeaderboardTab from "../components/LeaderboardTab";

// ─── Rich-text preview helper ─────────────────────────────────────────────────
function getDescriptionPreview(html, maxLen = 80) {
  if (!html) return "";
  let result = html.replace(/<table[\s\S]*?<\/table>/gi, " Таблиця ");
  result = result.replace(/<ul[\s\S]*?<\/ul>/gi, (match) => {
    const firstLi = match.match(/<li[^>]*>([\s\S]*?)<\/li>/i);
    if (!firstLi) return "";
    const text = firstLi[1].replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
    return " " + text + "… ";
  });
  result = result.replace(/<ol[\s\S]*?<\/ol>/gi, (match) => {
    const firstLi = match.match(/<li[^>]*>([\s\S]*?)<\/li>/i);
    if (!firstLi) return "";
    const text = firstLi[1].replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
    return " " + text + "… ";
  });
  const plain = result.replace(/<[^>]*>/g, " ").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim();
  return plain.length > maxLen ? plain.slice(0, maxLen) + "…" : plain;
}

export default function TournamentPage() {
  const { id }   = useParams();
  const navigate = useNavigate();
  const { addTab, removeTabById } = useTabs();

  const [tournament,    setTournament]    = useState(null);
  const [rounds,        setRounds]        = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [roundsLoading, setRoundsLoading] = useState(true);
  const [activeTab,     setActiveTab]     = useState("overview");
  const [showDelete,    setShowDelete]    = useState(false);
  const [deleting,      setDeleting]      = useState(false);

  const [myRole,      setMyRole]      = useState(null);
  const [roleLoading, setRoleLoading] = useState(true);
  const [error,       setError]       = useState(null);

  const isOwner = myRole === "owner";
  const isJury  = myRole === "jury";

  useEffect(() => {
    API.get(`/tournaments/${id}/`)
      .then(r => {
        setTournament(r.data);
        addTab({ id: r.data.id, name: r.data.name });
      })
      .catch(err => setError({ status: err?.response?.status ?? 0 }))
      .finally(() => setLoading(false));

    API.get(`/tournaments/${id}/rounds/`)
      .then(r => setRounds(r.data))
      .catch(err => console.error(err))
      .finally(() => setRoundsLoading(false));

    API.get(`/tournaments/${id}/my-role/`)
      .then(r => setMyRole(r.data.role))
      .catch(err => {
        if (err?.response?.status === 403) setError({ status: 403 });
        else console.error(err);
      })
      .finally(() => setRoleLoading(false));
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  useTournamentTabGuard(id, {
    isDeleted: error?.status === 404,
    isKicked:  error?.status === 403,
  });

  const handleSave = async (formData) => {
    const r = await API.patch(`/tournaments/${id}/`, formData);
    setTournament(r.data);
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await API.delete(`/tournaments/${id}/`);
      removeTabById(id);
      navigate("/tournaments");
    } catch (err) {
      console.error(err);
      setDeleting(false);
      setShowDelete(false);
    }
  };

  const handleRoundCreated = (newRound) => setRounds((prev) => [...prev, newRound]);

  if (loading || roleLoading) return (
    <NavBar>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#888', fontSize: 14 }}>
        Завантаження...
      </div>
    </NavBar>
  );
  if (!tournament) return (
    <NavBar>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#888', fontSize: 14 }}>
        Турнір не знайдено
      </div>
    </NavBar>
  );

  const status = computeStatus(tournament);

  const coverStyle = (() => {
    if (tournament.image_mode === "stock")
      return { background: STOCK_IMAGES.find(i => i.id === tournament.stock_image)?.gradient ?? "#e0e0e0" };
    if (tournament.image_mode === "custom" && tournament.custom_image)
      return { background: "#111" };
    return { background: "#e8e8e8" };
  })();

  const tabs = [
    { id: "overview",     label: "Основна сторінка" },
    { id: "rounds",       label: "Раунди" },
    { id: "participants", label: "Учасники" },
    { id: "leaderboard",  label: "Таблиця лідерів" },
    ...(isJury ? [{ id: "jury", label: "Панель журі" }] : []),
  ];

  return (
    <NavBar>
      <div className={styles.page}>
        <div className={styles.cover} style={coverStyle}>
          {tournament.image_mode === "custom" && tournament.custom_image && (
            <img src={tournament.custom_image} alt={tournament.name} className={styles.coverImg} />
          )}
        </div>

        <div className={styles.header}>
          <div className={styles.headerContent}>
            <div>
              <h1 className={styles.title}>{tournament.name}</h1>
              {tournament.description && (
                <p className={styles.subtitle}>
                  {getDescriptionPreview(tournament.description, 80)}
                </p>
              )}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <StatusBadge status={status} />
              {isJury && (
                <span style={{
                  fontSize: 11.5,
                  fontWeight: 600,
                  color: "#5566aa",
                  background: "#f0f2ff",
                  border: "1px solid #dde4f5",
                  borderRadius: 100,
                  padding: "3px 10px",
                }}>
                  ⚖️ Журі
                </span>
              )}
            </div>
          </div>
        </div>

        <div className={styles.tabBar}>
          {tabs.map((tab) => (
            <button
              key={tab.id}
              className={`${styles.tabBtn} ${activeTab === tab.id ? styles.tabBtnActive : ""}`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className={styles.content}>
          {activeTab === "overview" && (
            <>
              <OverviewTab
                tournament={tournament}
                status={status}
                onSave={handleSave}
                readOnly={!isOwner}
              />

              {isOwner && (
                <div className={styles.dangerZone}>
                  <div className={styles.dangerInfo}>
                    <span className={styles.dangerTitle}>Небезпечна зона</span>
                    <span className={styles.dangerHint}>Видалення турніру незворотне</span>
                  </div>
                  <button className={styles.deleteBtn} onClick={() => setShowDelete(true)}>
                    Видалити турнір
                  </button>
                </div>
              )}
            </>
          )}

          {activeTab === "rounds" && (
            <RoundsTab
              rounds={rounds}
              loading={roundsLoading}
              tournamentId={id}
              onRoundCreated={handleRoundCreated}
              readOnly={!isOwner}
              myRole={myRole}
              tournamentStatus={status}
            />
          )}

          {activeTab === "participants" && (
            <ParticipantsTab
              tournamentId={id}
              myRole={myRole}
              loading={false}
              maxParticipants={tournament.max_teams}
              tournamentStatus={status}
            />
          )}

          {activeTab === "jury" && isJury && (
            <JuryTab
              tournamentId={id}
              rounds={rounds}
              loading={roundsLoading}
            />
          )}

          {activeTab === "leaderboard" && (
            <LeaderboardTab
              tournamentId={id}
              rounds={rounds}
              loading={roundsLoading}
              isOwner={isOwner}
              myRole={myRole}
            />
          )}
        </div>

        {showDelete && (
          <ConfirmDeleteModal
            icon="🗑️"
            title="Видалити турнір?"
            description={<>Ця дія незворотна. Турнір <strong>«{tournament.name}»</strong> та всі пов'язані дані будуть видалені назавжди.</>}
            confirmLabel="Так, видалити"
            onConfirm={handleDelete}
            onCancel={() => setShowDelete(false)}
            loading={deleting}
          />
        )}
      </div>
    </NavBar>
  );
}
