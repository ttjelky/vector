import { useState, useEffect } from "react";
import styles from "../styles/TournamentPage.module.css";
import { NavBar } from "@shared/components/NavBar";
import { useParams, useNavigate } from "react-router-dom";
import { API, mediaUrl } from '@api';
import { STOCK_IMAGES } from "../components/TournamentCard";
import { StatusBadge, ConfirmDeleteModal } from "../components/TournamentShared";
import { computeStatus } from "../components/tournamentHelpers";
import { OverviewTab } from "../components/OverviewTab";
import { ParticipantsTab } from "../components/ParticipantsTab";
import { RoundsTab } from "../components/RoundsTab";
import { JuryTab } from "@features/jury";
import { useTabs } from "@shared/contexts/TabsContext";
import { useTournamentTabGuard } from "@shared/hooks/useTournamentTabGuard";
import { LeaderboardTab } from "../components/LeaderboardTab";
import { MyTeamTab } from "@features/teams";
import { TeamsTab } from "../components/TeamsTab";
import { CertificatesPage } from "@features/certificates";
import { AnnouncementsTab } from "@features/dashboard";

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

export function TournamentPage() {
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
  const [badgeDismissed, setBadgeDismissed] = useState(false);

  const [myRole,      setMyRole]      = useState(null);
  const [roleLoading, setRoleLoading] = useState(true);
  const [error,       setError]       = useState(null);
  const [myTeam,      setMyTeam]      = useState(null);

  const isOwner        = myRole === "owner";
  const isAdmin        = myRole === "admin";
  const canManage      = isOwner || isAdmin;
  const isJury         = myRole === "jury";
  const isJuryPanel    = myRole === "jury" || myRole === "admin" || myRole === "owner";
  const isAdminOrOwner = myRole === "admin" || myRole === "owner";

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

    API.get(`/tournaments/${id}/my-team/`)
      .then(r => setMyTeam(r.data))
      .catch(() => setMyTeam(null));
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
      navigate("/tournaments", { state: { refetch: true } });
    } catch (err) {
      console.error(err);
      setDeleting(false);
      setShowDelete(false);
    }
  };

  const handleRoundCreated = (newRound) => setRounds((prev) => [...prev, newRound]);
  const isTeamTournament = tournament?.tournament_type === "team";

  // Плашка показується тільки якщо команди взагалі немає.
  // Якщо команда є (навіть у статусі draft) — учасник вже почав процес
  // і плашка більше не потрібна.
  const isTeamParticipantUnregistered =
    isTeamTournament &&
    !isJuryPanel &&
    !myTeam;

  const isRegistered = isTeamTournament
    ? myTeam?.status === "registered"
    : myRole === "participant" || myRole === "jury";

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
    { id: "overview",      label: "Основна сторінка" },
    { id: "announcements", label: "Оголошення" },
    ...(!isTeamParticipantUnregistered ? [{ id: "rounds", label: "Раунди" }] : []),
    ...(isTeamTournament
      ? [
          ...(!isJuryPanel ? [{ id: "my_team", label: "Моя команда" }] : []),
          ...(isJuryPanel  ? [{ id: "teams",   label: "Команди" }]    : []),
          { id: "participants", label: isTeamTournament ? "Адміністрація" : "Учасники" },
        ]
      : [
          { id: "participants", label: isTeamTournament ? "Адміністрація" : "Учасники" },
        ]
    ),
    ...(!isTeamParticipantUnregistered ? [{ id: "leaderboard", label: "Таблиця лідерів" }] : []),
    ...(isJuryPanel ? [{ id: "jury", label: "Панель журі" }] : []),
    ...(myRole ? [{ id: "certificates", label: "Сертифікати" }] : []),
  ];

  return (
    <NavBar>
      <div className={styles.page}>
        <div className={styles.coverWrap}>
          {tournament.image_mode === "custom" && tournament.custom_image && (
            <div className={styles.coverReflectLeft} aria-hidden="true">
              <img src={mediaUrl(tournament.custom_image)} alt="" className={styles.coverReflectLeftImg} />
            </div>
          )}
          <div className={styles.cover} style={coverStyle}>
            {tournament.image_mode === "custom" && tournament.custom_image && (
              <img src={mediaUrl(tournament.custom_image)} alt={tournament.name} className={styles.coverImg} />
            )}
          </div>
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

            {/* Бейджики — на мобілці колонка, на десктопі рядок */}
            <div className={styles.headerBadges}>
              <StatusBadge status={status} />
              {isJuryPanel && (
                <span style={{
                  fontSize: 11.5,
                  fontWeight: 600,
                  color: myRole === "admin" ? "#7c3aed" : "#5566aa",
                  background: myRole === "admin" ? "#f5f3ff" : "#f0f2ff",
                  border: `1px solid ${myRole === "admin" ? "#ddd6fe" : "#dde4f5"}`,
                  borderRadius: 100,
                  padding: "3px 10px",
                  whiteSpace: "nowrap",
                }}>
                  {myRole === "admin" ? "Адміністратор" : "Права журі"}
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
                readOnly={!canManage}
                myRole={myRole}
                tournamentId={id}
                isRegistered={isRegistered}
                onLeft={() => { removeTabById(id); navigate("/tournaments", { state: { refetch: true } }); }}
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

          {activeTab === "announcements" && (
            <AnnouncementsTab tournamentId={id} myRole={myRole} />
          )}

          {activeTab === "rounds" && (
            <RoundsTab
              rounds={rounds}
              loading={roundsLoading}
              tournamentId={id}
              onRoundCreated={handleRoundCreated}
              readOnly={!canManage}
              myRole={myRole}
              tournamentStatus={status}
              isTeamTournament={isTeamTournament}
              isTeamCaptain={myTeam?.is_captain ?? true}
              teamName={isTeamTournament ? (myTeam?.name ?? null) : null}
            />
          )}

          {activeTab === "my_team" && isTeamTournament && !isJuryPanel && (
            <MyTeamTab
              tournamentId={id}
              tournament={tournament}
              myRole={myRole}
              tournamentStatus={status}
              onTeamUpdated={setMyTeam}
            />
          )}

          {activeTab === "teams" && isTeamTournament && isJuryPanel && (
            <TeamsTab
              tournamentId={id}
              myRole={myRole}
              tournament={tournament}
              tournamentStatus={status}
            />
          )}

          {activeTab === "participants" && (
            <ParticipantsTab
              tournamentId={id}
              myRole={myRole}
              loading={false}
              tournamentType={tournament?.tournament_type}
              maxParticipants={tournament.max_teams}
              tournamentStatus={status}
              openRegistration={
                tournament?.open_registration ||
                (!tournament?.registration_start && !tournament?.registration_end)
              }
            />
          )}

          {activeTab === "jury" && isJuryPanel && (
            <JuryTab
              tournamentId={id}
              rounds={rounds}
              loading={roundsLoading}
              myRole={myRole}
            />
          )}

          {activeTab === "leaderboard" && (
            <LeaderboardTab
              tournamentId={id}
              tournamentType={tournament?.tournament_type}
              rounds={rounds}
              roundsLoading={roundsLoading}
              isOwner={isOwner}
              myRole={myRole}
            />
          )}

          {activeTab === "certificates" && (
            <CertificatesPage
              tournamentId={id}
              isAdmin={isAdminOrOwner}
              isTeamTournament={isTeamTournament}
              myRole={myRole}
            />
          )}
        </div>

        {isTeamParticipantUnregistered && !badgeDismissed && (
          <div className={styles.unregisteredBadge}>
            <span className={styles.unregisteredBadgeIcon}>⚠️</span>
            <span className={styles.unregisteredBadgeText}>
              Зверніть увагу: ви ще не є учасником турніру.{" "}
              <button
                className={styles.unregisteredBadgeLink}
                onClick={() => setActiveTab("my_team")}
              >
                Зареєструйте команду
              </button>
              {", щоб продовжити."}
            </span>
            <button
              className={styles.unregisteredBadgeClose}
              onClick={() => setBadgeDismissed(true)}
              title="Закрити"
            >
              ✕
            </button>
          </div>
        )}

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