import { useState, useEffect, useRef } from "react";
import styles from "../styles/TournamentPage.module.css";
import { NavBar } from "@shared/components/NavBar";
import { useParams, useNavigate } from "react-router-dom";
import { API, mediaUrl } from '@api';
import heic2any from "heic2any";
import { STOCK_IMAGES } from "../components/TournamentCard";
import { StatusBadge, ConfirmDeleteModal } from "../components/TournamentShared";
import JellyRadio from "@shared/components/JellyRadio";
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
  const { addTab, removeTabById, updateTab } = useTabs();

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

  // Стан inline-редагування основної сторінки (редактор — OverviewTab,
  // кнопки картинки — на обкладинці тут). Живий передперегляд — з coverImage.
  const [ovEditing,       setOvEditing]       = useState(false);
  const [stockStripOpen,  setStockStripOpen]  = useState(false);
  const [converting,      setConverting]      = useState(false);
  const [editName,        setEditName]        = useState("");
  const [coverImage,      setCoverImage]      = useState({
    imageMode: "stock",
    stockImage: STOCK_IMAGES[0].id,
    customFile: null,
    customPreview: null,
  });
  const fileRef = useRef(null);
  const titleMeasureRef = useRef(null);
  const [titleWidth, setTitleWidth] = useState(null);

  // Ширина інпуту назви — за текстом (приховане дзеркало)
  useEffect(() => {
    if (ovEditing && titleMeasureRef.current) {
      setTitleWidth(Math.ceil(titleMeasureRef.current.offsetWidth));
    } else {
      setTitleWidth(null);
    }
  }, [ovEditing, editName]);

  const patchCoverImage = (patch) => setCoverImage((c) => ({ ...c, ...patch }));

  const resetCoverImage = () => {
    setCoverImage((c) => {
      if (c.customFile && c.customPreview?.startsWith("blob:")) URL.revokeObjectURL(c.customPreview);
      return {
        imageMode: tournament?.image_mode || "stock",
        stockImage: tournament?.stock_image || STOCK_IMAGES[0].id,
        customFile: null,
        customPreview: tournament?.image_mode === "custom" ? mediaUrl(tournament.custom_image) : null,
      };
    });
  };

  const handleOvEditingChange = (v) => {
    setOvEditing(v);
    if (!v) setStockStripOpen(false);
  };

  // Вибір власного файлу прямо з обкладинки (з HEIC-конвертацією, як в ImagePicker)
  const handleCoverFile = async (e) => {
    const original = e.target.files?.[0];
    e.target.value = "";
    if (!original) return;

    const immediatePreview = URL.createObjectURL(original);
    patchCoverImage({ customFile: original, customPreview: immediatePreview, imageMode: "custom" });

    const fname = original.name.toLowerCase();
    const isHeic =
      fname.endsWith(".heic") ||
      fname.endsWith(".heif") ||
      original.type === "image/heic" ||
      original.type === "image/heif";

    if (!isHeic) return;

    setConverting(true);
    try {
      const converted = await heic2any({ blob: original, toType: "image/jpeg", quality: 0.85 });
      const blob = Array.isArray(converted) ? converted[0] : converted;
      const jpegFile = new File(
        [blob],
        original.name.replace(/\.[^/.]+$/, ".jpg"),
        { type: "image/jpeg", lastModified: Date.now() }
      );
      URL.revokeObjectURL(immediatePreview);
      patchCoverImage({ customFile: jpegFile, customPreview: URL.createObjectURL(jpegFile) });
    } catch (err) {
      console.error("HEIC → JPEG conversion failed:", err);
    } finally {
      setConverting(false);
    }
  };

  useEffect(() => {
    setOvEditing(false);
    setStockStripOpen(false);
  }, [id]);

  useEffect(() => {
    if (!tournament) return;
    resetCoverImage();
    setEditName(tournament.name || "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tournament]);

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
    if (r.data?.name) updateTab(id, { name: r.data.name });
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

  const savedCustomSrc =
    tournament.image_mode === "custom" && tournament.custom_image
      ? mediaUrl(tournament.custom_image)
      : null;

  const effCustomSrc = ovEditing
    ? (coverImage.imageMode === "custom" ? (coverImage.customPreview || savedCustomSrc) : null)
    : savedCustomSrc;

  const showCustom = effCustomSrc != null;

  const coverStyle = (() => {
    const effImageMode = ovEditing ? coverImage.imageMode : tournament.image_mode;
    const effStock = ovEditing ? coverImage.stockImage : tournament.stock_image;
    if (effImageMode === "stock")
      return { background: STOCK_IMAGES.find(i => i.id === effStock)?.gradient ?? "#e0e0e0" };
    if (effImageMode === "custom" && effCustomSrc)
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
          {showCustom && (
            <div className={styles.coverReflectLeft} aria-hidden="true">
              <img src={effCustomSrc} alt="" className={styles.coverReflectLeftImg} />
            </div>
          )}
          <div className={styles.cover} style={coverStyle}>
            {showCustom && (
              <img src={effCustomSrc} alt={tournament.name} className={styles.coverImg} />
            )}
            {ovEditing && (
              <>
                {stockStripOpen && (
                  <div className={styles.stockStrip} role="group" aria-label="Стокові зображення">
                    {STOCK_IMAGES.map(({ id, gradient }) => (
                      <button
                        key={id}
                        type="button"
                        className={`${styles.stockSwatch} ${coverImage.imageMode === "stock" && coverImage.stockImage === id ? styles.stockSwatchActive : ""}`}
                        style={{ background: gradient }}
                        onClick={() => patchCoverImage({ imageMode: "stock", stockImage: id })}
                        aria-label={`Стокове зображення ${id}`}
                        aria-pressed={coverImage.imageMode === "stock" && coverImage.stockImage === id}
                      />
                    ))}
                  </div>
                )}
                <div className={styles.coverEditBar}>
                  <button
                    type="button"
                    className={styles.coverEditBtn}
                    onClick={() => fileRef.current?.click()}
                    disabled={converting}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                      <polyline points="17 8 12 3 7 8" />
                      <line x1="12" y1="3" x2="12" y2="15" />
                    </svg>
                    {converting ? "Конвертація…" : "Встановити нове"}
                  </button>
                  <button
                    type="button"
                    className={`${styles.coverEditBtn} ${stockStripOpen ? styles.coverEditBtnActive : ""}`}
                    onClick={() => setStockStripOpen((o) => !o)}
                    aria-expanded={stockStripOpen}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <rect x="3" y="3" width="7" height="7" rx="1.5" />
                      <rect x="14" y="3" width="7" height="7" rx="1.5" />
                      <rect x="3" y="14" width="7" height="7" rx="1.5" />
                      <rect x="14" y="14" width="7" height="7" rx="1.5" />
                    </svg>
                    Обрати стокове
                  </button>
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/*,.heic,.heif"
                    hidden
                    onChange={handleCoverFile}
                    disabled={converting}
                    aria-label="Завантажити нове зображення"
                  />
                </div>
              </>
            )}
          </div>
        </div>

        <div className={styles.header}>
          <div className={styles.headerContent}>
            <div style={{ position: "relative" }}>
              {ovEditing ? (
                <>
                  <input
                    className={styles.titleInput}
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    placeholder="Назва турніру"
                    aria-label="Назва турніру"
                    maxLength={200}
                    style={titleWidth ? { width: titleWidth } : undefined}
                  />
                  <span ref={titleMeasureRef} className={styles.titleMeasure} aria-hidden="true">
                    {editName || "Назва турніру"}
                  </span>
                </>
              ) : (
                <h1 className={styles.title}>{tournament.name}</h1>
              )}
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
          <JellyRadio
            items={tabs.map((tab) => ({ value: tab.id, label: tab.label }))}
            value={activeTab}
            onChange={(value) => setActiveTab(value)}
            chipColor="#ececee"
            activeColor="#18181b"
            textColor="#18181b"
            activeTextColor="#f5f5f5"
            size="md"
            gap={8}
            radius={18}
            swell={0.1}
            barge={2}
            ariaLabel="Розділи турніру"
          />
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
                canDelete={isOwner}
                onDeleteRequest={() => setShowDelete(true)}
                editing={ovEditing}
                onEditingChange={handleOvEditingChange}
                coverImage={coverImage}
                onResetCoverImage={resetCoverImage}
                editName={editName}
                onEditNameChange={setEditName}
              />
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
              registrationOpen={tournament?.registration_open}
              registrationReason={tournament?.registration_reason}
              registrationMessage={tournament?.registration_message}
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