import { useState, useRef, useCallback, useEffect } from "react";
import styles from "../styles/CreateTournamentModal.module.css";
import cross from "@static/icons/cross.svg";
import { API } from '@api';
import { TournamentCard, STOCK_IMAGES } from "./TournamentCard";
import User from "@static/icons/Profile.svg?react";
import Users from "@static/icons/Users.svg?react";
import { RichTextArea } from "@shared/components/RichTextArea";
import heic2any from "heic2any";
import { computeStatus } from "../components/tournamentHelpers";
import { CriteriaEditor, DEFAULT_CRITERIA } from "@features/submissions";

const ACCENT_COLORS = ["#82b3e4", "#4ad44c", "#ca7979", "#c76db0", "#8e5edf", "#eccb5c"];

const TOURNAMENT_TYPES = [
  {
    value: "solo",
    label: "Одиночний",
    desc: "Гравці змагаються самостійно",
    illustration: <User className={styles.typeIllustrationSvg} />,
  },
  {
    value: "team",
    label: "Командний",
    desc: "Учасники об'єднані в команди",
    illustration: <Users className={styles.typeIllustrationSvg} />,
  },
];


/* ─────────────────────────────────────────────────────────
   ImagePicker
   onCustomUpload(file, previewUrl) — колбек з уже готовим файлом
───────────────────────────────────────────────────────── */
export function ImagePicker({ imageMode, setImageMode, stockImage, setStockImage, customImage, onCustomUpload, onConvertingChange }) {
  const [converting, setConverting] = useState(false);

  const setConv = (v) => { setConverting(v); onConvertingChange?.(v); };

  const handleFileChange = async (e) => {
    const original = e.target.files[0];
    if (!original) return;

    e.target.value = "";

    const immediatePreview = URL.createObjectURL(original);
    onCustomUpload(original, immediatePreview);

    const fname = original.name.toLowerCase();
    const isHeic =
      fname.endsWith(".heic") ||
      fname.endsWith(".heif") ||
      original.type === "image/heic" ||
      original.type === "image/heif" ||
      (original.type === "" && (fname.endsWith(".heic") || fname.endsWith(".heif")));

    if (!isHeic) return;

    setConv(true);
    try {
      const converted = await heic2any({ blob: original, toType: "image/jpeg", quality: 0.85 });
      const blob = Array.isArray(converted) ? converted[0] : converted;
      const jpegFile = new File(
        [blob],
        original.name.replace(/\.[^/.]+$/, ".jpg"),
        { type: "image/jpeg", lastModified: Date.now() }
      );
      URL.revokeObjectURL(immediatePreview);
      const jpegPreview = URL.createObjectURL(jpegFile);
      onCustomUpload(jpegFile, jpegPreview);
    } catch (err) {
      console.error("HEIC → JPEG conversion failed:", err);
      onConvertingChange?.("error");
    } finally {
      setConv(false);
    }
  };

  return (
    <div className={styles.sideSection}>
      <span className={styles.sideLabel}>Зображення</span>
      <div className={styles.imgTabs}>
        {[{ value: "stock", label: "Стокові" }, { value: "custom", label: "Власне" }].map(({ value, label }) => (
          <button
            key={value} type="button"
            className={`${styles.imgTab} ${imageMode === value ? styles.imgTabActive : ""}`}
            onClick={() => setImageMode(value)}
          >{label}</button>
        ))}
      </div>
      {imageMode === "stock" && (
        <div className={styles.stockGrid}>
          {STOCK_IMAGES.map(({ id, gradient }) => (
            <div
              key={id}
              className={`${styles.stockItem} ${stockImage === id ? styles.stockItemActive : ""}`}
              style={{ background: gradient }}
              onClick={() => setStockImage(id)}
            />
          ))}
        </div>
      )}
      {imageMode === "custom" && (
        <label className={styles.uploadZone} data-converting={converting || undefined}>
          {converting ? (
            <>
              <span className={styles.uploadIcon}>⏳</span>
              <span className={styles.uploadPrompt}>Конвертація HEIC…</span>
            </>
          ) : customImage ? (
            <img src={customImage} alt="preview" className={styles.uploadPreview} />
          ) : (
            <>
              <span className={styles.uploadIcon}>↑</span>
              <span className={styles.uploadPrompt}>Натисніть або перетягніть файл</span>
            </>
          )}
          <input
            type="file"
            accept="image/*,.heic,.heif"
            onChange={handleFileChange}
            className={styles.fileInputHidden}
            disabled={converting}
          />
        </label>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────
   StepIndicator
───────────────────────────────────────────────────────── */
function StepIndicator({ step, total }) {
  return (
    <div className={styles.stepIndicator}>
      {Array.from({ length: total }).map((_, i) => (
        <span key={i} style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span className={`${styles.stepDot} ${i <= step - 1 ? styles.stepDotActive : ""}`} />
          {i < total - 1 && (
            <span className={`${styles.stepLine} ${i < step - 1 ? styles.stepLineActive : ""}`} />
          )}
        </span>
      ))}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────
   Main modal
───────────────────────────────────────────────────────── */
export function CreateTournamentModal({ onClose, onCreate }) {
  const [step, setStep]         = useState(1);
  const [closing, setClosing]   = useState(false);
  const [prevStep, setPrevStep] = useState(null);
  const TOTAL_STEPS = 2;

  const [name,           setName]           = useState("");
  const [description,    setDescription]    = useState("");
  const [rules,          setRules]          = useState("");
  const [startDate,      setStartDate]      = useState("");
  const [endDate,        setEndDate]        = useState("");
  const [maxTeams,       setMaxTeams]       = useState("");
  const [regStart,       setRegStart]       = useState("");
  const [regEnd,         setRegEnd]         = useState("");
  const [criteria,       setCriteria]       = useState(DEFAULT_CRITERIA);

  const [openRegistration, setOpenRegistration] = useState(false);

  const [minTeamSize,    setMinTeamSize]    = useState("");
  const [maxTeamSize,    setMaxTeamSize]    = useState("");

  const [imageMode,      setImageMode]      = useState("stock");
  const [stockImage,     setStockImage]     = useState(STOCK_IMAGES[0].id);
  const [customFile,     setCustomFile]     = useState(null);
  const [customPreview,  setCustomPreview]  = useState(null);
  const [accentColor,    setAccentColor]    = useState(ACCENT_COLORS[0]);
  const [tournamentType, setTournamentType] = useState("");
  const [typeError,      setTypeError]      = useState(false);
  const [nameError,      setNameError]      = useState(false);
  const [endDateError,   setEndDateError]   = useState(false);
  const [maxTeamSizeError, setMaxTeamSizeError] = useState(false);
  const [regDateError,    setRegDateError]    = useState(false);
  const [pastDateError,   setPastDateError]   = useState("");
  const [imageConverting, setImageConverting] = useState(false);
  const [convertError,    setConvertError]    = useState(false);

  const [serverDriftMs,  setServerDriftMs]  = useState(0);
  const [serverTimeReady, setServerTimeReady] = useState(false);
  const [serverTimeError, setServerTimeError] = useState(false);

  useEffect(() => {
    const fetchServerTime = async () => {
      const sources = [
        // 1. Власний бекенд — найнадійніший, без CORS
        async () => {
          const res = await API.get("/server-time/");
          const ms = new Date(res.data.utc).getTime();
          if (!isFinite(ms)) throw new Error("Invalid date from backend");
          return ms;
        },
        // 2. timeapi.io — CORS-friendly публічний API
        async () => {
          const res = await fetch(
            "https://timeapi.io/api/time/current/zone?timeZone=UTC",
            { cache: "no-store", signal: AbortSignal.timeout(4000) }
          );
          const d = await res.json();
          const ms = new Date(`${d.date}T${d.time}Z`).getTime();
          if (!isFinite(ms)) throw new Error("Invalid date from timeapi.io");
          return ms;
        },
      ];
      const localBefore = Date.now();
      for (const source of sources) {
        try {
          const serverMs = await source();
          const localAfter = Date.now();
          const rtt = localAfter - localBefore;
          const drift = serverMs + rtt / 2 - localAfter;
          setServerDriftMs(drift);
          setServerTimeReady(true);
          return;
        } catch { /* спробуємо наступне джерело */ }
      }
      console.warn("[ServerTime] Не вдалося синхронізувати час з жодного джерела. Валідація дат відключена.");
      setServerTimeError(true);
      setServerTimeReady(true);
    };
    fetchServerTime();
  }, []);

  const getServerNow = () => {
    const ms = Date.now() + (isFinite(serverDriftMs) ? serverDriftMs : 0);
    return isFinite(ms) ? ms : Date.now();
  };

  const serverMinDate  = serverTimeReady && !serverTimeError
    ? (() => { try { return new Date(getServerNow()).toISOString().slice(0, 10); } catch { return undefined; } })()
    : undefined;
  const serverMinDt    = serverTimeReady && !serverTimeError
    ? (() => { try { return new Date(getServerNow()).toISOString().slice(0, 16); } catch { return undefined; } })()
    : undefined;

  const handleClose = () => {
    setClosing(true);
    setTimeout(() => onClose?.(), 340);
  };

  const handleCustomUpload = (file, previewUrl) => {
    if (customPreview) URL.revokeObjectURL(customPreview);
    setCustomFile(file);
    setCustomPreview(previewUrl);
    setConvertError(false);
  };

  const handleConvertingChange = (v) => {
    if (v === "error") { setConvertError(true); setImageConverting(false); }
    else setImageConverting(Boolean(v));
  };

  const handleNext = () => {
    if (step === 1 && !name.trim()) { setNameError(true); return; }
    if (step === 1 && !tournamentType) { setTypeError(true); return; }
    if (step === 1 && !endDate) { setEndDateError(true); return; }

    if (step === 1 && serverTimeReady && !serverTimeError) {
      const now = getServerNow();
      if (startDate && new Date(startDate + "T00:00:00").getTime() < now) {
        setPastDateError("Дата старту не може бути в минулому (за серверним часом).");
        return;
      }
      if (endDate && new Date(endDate + "T00:00:00").getTime() < now) {
        setPastDateError("Дата кінця не може бути в минулому (за серверним часом).");
        return;
      }
    }

    setNameError(false);
    setTypeError(false);
    setEndDateError(false);
    setPastDateError("");
    setPrevStep(step);
    setStep(s => Math.min(s + 1, TOTAL_STEPS));
  };

  const handleBack = () => {
    setPrevStep(step);
    setStep(s => Math.max(s - 1, 1));
  };

  const descPlainText = description
    .replace(/<\/?(p|div|h[1-6]|li|blockquote|br)(\s[^>]*)?>\s*/gi, "\n")
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/[ \t]+/g, " ")
    .trim();
  const descFirstLine = description.includes("<table")
    ? "Таблиця"
    : descPlainText.split("\n").map(l => l.trim()).find(l => l.length > 0) || "";

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!tournamentType) { setTypeError(true); return; }
    if (!openRegistration && (!regStart || !regEnd)) { setRegDateError(true); return; }
    if (tournamentType === "team" && !maxTeamSize) { setMaxTeamSizeError(true); return; }
    if (imageConverting) return;

    if (serverTimeReady && !serverTimeError && !openRegistration) {
      const now = getServerNow();
      if (regStart && new Date(regStart).getTime() < now) {
        setRegDateError(true);
        setPastDateError("Початок реєстрації не може бути в минулому (за серверним часом).");
        return;
      }
      if (regEnd && new Date(regEnd).getTime() < now) {
        setRegDateError(true);
        setPastDateError("Кінець реєстрації не може бути в минулому (за серверним часом).");
        return;
      }
    }

    const body = new FormData();
    body.append("name",               name);
    body.append("description",        description);
    body.append("rules",              rules);
    body.append("accent_color",       accentColor);
    body.append("image_mode",         imageMode);
    body.append("start_date",         startDate ? startDate + "T00:00:00" : "");
    body.append("end_date",           endDate   ? endDate   + "T00:00:00" : "");
    body.append("max_teams",          maxTeams);
    body.append("tournament_type",    tournamentType);
    body.append("format",             tournamentType);
    body.append("open_registration",  openRegistration);
    body.append("client_utc_ms",    String(getServerNow()));
    body.append("server_drift_ms",  String(Math.round(serverDriftMs)));
    if (!openRegistration) {
      body.append("registration_start", regStart);
      body.append("registration_end",   regEnd);
    }
    if (tournamentType === "team") {
      body.append("min_team_size", minTeamSize || "3");
      body.append("max_team_size", maxTeamSize);
    }
    if (imageMode === "stock")                body.append("stock_image",  stockImage);
    if (imageMode === "custom" && customFile) body.append("custom_image", customFile);
    try {
      const { status, data } = await API.post("/tournaments/", body);
      if (status === 201) {
        if (criteria.length > 0) {
          await API.put(`/tournaments/${data.id}/criteria/`, criteria);
        }
        onCreate(data);
        handleClose();
      }
    } catch (err) {
      console.error(err.response?.data);
    }
  };

  const STEP_META = [
    { num: "КРОК 1 З 2", title: "Основне", sub: "Заповніть назву, дату та тип турніру" },
    { num: "КРОК 2 З 2", title: "Деталі",  sub: "Додайте правила, опис та умови реєстрації" },
  ];

  const goingForward = prevStep === null || step > prevStep;
  const stepAnimClass = goingForward ? styles.stepAnimForward : styles.stepAnimBack;

  return (
    <div
      className={`${styles.overlay} ${closing ? styles.overlayOut : ""}`}
      onClick={(e) => e.target === e.currentTarget && handleClose()}
    >
      <div className={`${styles.modal} ${closing ? styles.modalOut : ""} ${step === 2 ? styles.modalWide : ""}`}>

        <div className={styles.header}>
          <StepIndicator step={step} total={TOTAL_STEPS} />
          <img src={cross} alt="Закрити" onClick={handleClose} className={styles.closeBtn} />
        </div>

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.body}>

            {/* ── Left panel ── */}
            <div className={styles.panelLeft}>
              <div className={`${styles.previewContainer} ${styles.panelItem1}`}>
                <span className={styles.previewLabel}>Передогляд</span>
                <TournamentCard
                  name={name} info={descFirstLine} date={startDate}
                  accentColor={accentColor} imageMode={imageMode}
                  stockImage={stockImage} customImage={customPreview}
                  status={computeStatus({
                    start_date: startDate ? startDate + "T00:00:00" : null,
                    end_date: endDate ? endDate + "T00:00:00" : null,
                    open_registration: openRegistration,
                  })}
                />
              </div>

              <div className={styles.panelItem2}>
                <ImagePicker
                  imageMode={imageMode}       setImageMode={setImageMode}
                  stockImage={stockImage}     setStockImage={setStockImage}
                  customImage={customPreview} onCustomUpload={handleCustomUpload}
                  onConvertingChange={handleConvertingChange}
                />
              </div>

              <div className={`${styles.sideSection} ${styles.panelItem3}`}>
                <span className={styles.sideLabel}>Колір акценту</span>
                <div className={styles.colorGrid}>
                  {ACCENT_COLORS.map((c) => (
                    <button
                      key={c} type="button"
                      className={`${styles.swatch} ${accentColor === c ? styles.swatchActive : ""}`}
                      style={{ background: c }}
                      onClick={() => setAccentColor(c)}
                      aria-label={c}
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* ── Right panel ── */}
            <div className={styles.panelRight}>
              <div key={`meta-${step}`} className={styles.stepMeta}>
                <p className={styles.stepNum}>{STEP_META[step - 1].num}</p>
                <h2 className={styles.stepTitle}>{STEP_META[step - 1].title}</h2>
                <p className={styles.stepSub}>{STEP_META[step - 1].sub}</p>
              </div>

              {/* STEP 1 */}
              {step === 1 && (
                <div key="step1" className={`${styles.stepContent} ${stepAnimClass}`}>
                  <div className={`${styles.field} ${styles.stagger1}`}>
                    <label htmlFor="name" className={styles.label}>Назва турніру <span className={styles.editRequired}>*</span></label>
                    <input
                      id="name" type="text" className={`${styles.input} ${nameError ? styles.inputError : ""}`}
                      placeholder="Наприклад: Літній кубок 2025"
                      value={name} onChange={(e) => { setName(e.target.value); setNameError(false); }} required
                    />
                    {nameError && <p className={styles.fieldError}>Назва турніру обов'язкова</p>}
                  </div>

                  <div className={`${styles.twoCol} ${styles.stagger2}`}>
                    <div className={styles.field}>
                      <label htmlFor="startDate" className={styles.label}>
                        Дата старту <span className={styles.optional}>необов'язково</span>
                      </label>
                      <input
                        id="startDate" type="date" className={styles.input}
                        value={startDate} onChange={(e) => { setStartDate(e.target.value); setPastDateError(""); }}
                        min={serverMinDate}
                      />
                    </div>
                    <div className={styles.field}>
                      <label htmlFor="endDate" className={styles.label}>
                        Дата кінця <span className={styles.editRequired}>*</span>
                      </label>
                      <input
                        id="endDate" type="date" className={`${styles.input} ${endDateError ? styles.inputError : ""}`}
                        value={endDate} onChange={(e) => { setEndDate(e.target.value); setEndDateError(false); setPastDateError(""); }}
                        min={startDate || serverMinDate}
                        required
                      />
                      {endDateError && <p className={styles.fieldError}>Дата кінця турніру обов'язкова</p>}
                    </div>
                  </div>

                  {serverTimeReady && !serverTimeError && (
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: -6 }}>
                      <span style={{ fontSize: 11.5, color: "#059669" }}>
                        🔒 Час синхронізовано з сервером
                        {Math.abs(serverDriftMs) > 30000 && (
                          <span style={{ color: "#d97706", marginLeft: 4 }}>
                            (відхилення {Math.round(serverDriftMs / 1000)}с)
                          </span>
                        )}
                      </span>
                    </div>
                  )}

                  {pastDateError && (
                    <p className={styles.fieldError}>{pastDateError}</p>
                  )}

                  <div className={`${styles.sideSection} ${styles.stagger3}`}>
                    <span className={styles.label}>Тип турніру</span>
                    <div className={styles.typeCards}>
                      {TOURNAMENT_TYPES.map((type) => {
                        const isActive = tournamentType === type.value;
                        return (
                          <button
                            key={type.value} type="button"
                            className={`${styles.typeCard} ${isActive ? styles.typeCardActive : ""}`}
                            onClick={() => { setTournamentType(type.value); setTypeError(false); }}
                          >
                            <div className={styles.typeIllustration}>{type.illustration}</div>
                            <span className={styles.typeInfo}>
                              <span className={styles.typeName}>{type.label}</span>
                              <span className={styles.typeDesc}>{type.desc}</span>
                            </span>
                            <span className={styles.typeCheck}>
                              <svg className={styles.typeCheckIcon} viewBox="0 0 10 10">
                                <polyline points="1.5,5 4,7.5 8.5,2.5" />
                              </svg>
                            </span>
                          </button>
                        );
                      })}
                    </div>
                    {typeError && <p className={styles.fieldError}>Оберіть тип турніру</p>}
                  </div>

                  <div className={`${styles.field} ${styles.stagger3}`}>
                    <label htmlFor="maxTeams" className={styles.label}>
                      {tournamentType === "team" ? "Макс. команд" : "Макс. учасників"}{" "}
                      <span className={styles.optional}>необов'язково</span>
                    </label>
                    <input
                      id="maxTeams" type="number" placeholder="Без обмежень"
                      min={2} className={styles.input}
                      value={maxTeams} onChange={(e) => setMaxTeams(e.target.value)}
                    />
                  </div>
                </div>
              )}

              {/* STEP 2 */}
              {step === 2 && (
                <div key="step2" className={`${styles.stepContent} ${stepAnimClass}`}>
                  <div className={`${styles.field} ${styles.stagger1}`}>
                    <label htmlFor="rules" className={styles.label}>Правила</label>
                    <RichTextArea
                      id="rules" rows={3}
                      placeholder="Заборонені прийоми, регламент, апеляції..."
                      value={rules} onChange={(e) => setRules(e.target.value)}
                    />
                  </div>
                  <div className={`${styles.field} ${styles.stagger2}`}>
                    <label htmlFor="desc" className={styles.label}>Опис *</label>
                    <RichTextArea
                      id="desc" rows={4}
                      placeholder="Призи, партнери, формат проведення..."
                      value={description} onChange={(e) => setDescription(e.target.value)}
                    />
                  </div>

                  <div className={`${styles.sectionDivider} ${styles.stagger4}`}>
                    <span className={styles.sectionTitle}>Критерії оцінювання журі</span>
                    <span className={styles.sectionLine} />
                  </div>
                  <CriteriaEditor criteria={criteria} onChange={setCriteria} styles={styles} />

                  <div className={`${styles.sectionDivider} ${styles.stagger3}`}>
                    <span className={styles.sectionTitle}>
                      {tournamentType === "team" ? "Реєстрація команд" : "Реєстрація учасників"}
                    </span>
                    <span className={styles.sectionLine} />
                  </div>

                  <div className={`${styles.stagger3}`}>
                    <label className={styles.toggleRow}>
                      <div
                        className={`${styles.toggleTrack} ${openRegistration ? styles.toggleTrackOn : ""}`}
                        onClick={() => { setOpenRegistration(v => !v); setRegDateError(false); }}
                        role="switch"
                        aria-checked={openRegistration}
                      >
                        <span className={styles.toggleThumb} />
                      </div>
                      <div className={styles.toggleText}>
                        <span className={styles.toggleLabel}>Відкрита реєстрація</span>
                        <span className={styles.toggleHint}>
                          {openRegistration
                            ? "Учасники можуть приєднатись будь-коли до завершення турніру"
                            : "Реєстрація обмежена часовими рамками нижче"}
                        </span>
                      </div>
                    </label>
                  </div>

                  {!openRegistration && (
                    <div className={`${styles.regBlock} ${styles.stagger4}`}>
                      <div className={styles.twoCol}>
                        <div className={styles.field}>
                          <label htmlFor="registrationStart" className={styles.label}>Початок</label>
                          <input
                            id="registrationStart" type="datetime-local"
                            className={`${styles.input} ${regDateError && !regStart ? styles.inputError : ""}`}
                            value={regStart} onChange={(e) => { setRegStart(e.target.value); setRegDateError(false); setPastDateError(""); }}
                            min={serverMinDt}
                          />
                        </div>
                        <div className={styles.field}>
                          <label htmlFor="registrationEnd" className={styles.label}>Кінець</label>
                          <input
                            id="registrationEnd" type="datetime-local"
                            className={`${styles.input} ${regDateError && !regEnd ? styles.inputError : ""}`}
                            value={regEnd} onChange={(e) => { setRegEnd(e.target.value); setRegDateError(false); setPastDateError(""); }}
                            min={regStart || serverMinDt}
                          />
                        </div>
                      </div>
                      {regDateError && <p className={styles.fieldError}>Вкажіть дати початку і кінця реєстрації</p>}
                      {pastDateError && <p className={styles.fieldError}>{pastDateError}</p>}
                    </div>
                  )}

                  {tournamentType === "team" && (
                    <>
                      <div className={`${styles.sectionDivider} ${styles.stagger4}`}>
                        <span className={styles.sectionTitle}>Розмір команди</span>
                        <span className={styles.sectionLine} />
                      </div>
                      <div className={`${styles.regBlock} ${styles.stagger4}`}>
                        <div className={styles.twoCol}>
                          <div className={styles.field}>
                            <label htmlFor="minTeamSize" className={styles.label}>
                              Мін. гравців <span className={styles.optional}>необов'язково</span>
                            </label>
                            <input
                              id="minTeamSize" type="number" min={3}
                              placeholder="За замовч.: 3"
                              className={styles.input}
                              value={minTeamSize} onChange={(e) => setMinTeamSize(e.target.value)}
                            />
                          </div>
                          <div className={styles.field}>
                            <label htmlFor="maxTeamSize" className={styles.label}>
                              Макс. гравців <span className={styles.editRequired}>*</span>
                            </label>
                            <input
                              id="maxTeamSize" type="number" min={minTeamSize || 3}
                              placeholder="Вкажіть ліміт"
                              className={`${styles.input} ${maxTeamSizeError ? styles.inputError : ""}`}
                              value={maxTeamSize}
                              onChange={(e) => { setMaxTeamSize(e.target.value); setMaxTeamSizeError(false); }}
                              required
                            />
                            {maxTeamSizeError && <p className={styles.fieldError}>Вкажіть макс. кількість гравців</p>}
                          </div>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* ── Sticky footer ── */}
          <div className={styles.footer}>
            <div className={styles.footerActions}>
              <button
                type="button" className={styles.btnCancel}
                onClick={step === 1 ? handleClose : handleBack}
              >
                {step === 1 ? "Скасувати" : "← Назад"}
              </button>
              {step < TOTAL_STEPS
                ? <button type="button" className={styles.btnCreate} onClick={handleNext}>Далі →</button>
                : (
                  <button
                    type="submit"
                    className={styles.btnCreate}
                    disabled={imageConverting || convertError}
                    title={
                      imageConverting ? "Зачекайте, конвертація зображення…" :
                      convertError    ? "Не вдалось конвертувати HEIC. Оберіть інше зображення." :
                      undefined
                    }
                  >
                    {imageConverting ? "Конвертація…" : "+ Створити турнір"}
                  </button>
                )
              }
              {convertError && (
                <p style={{ color: "#d04d3e", fontSize: 12, marginTop: 6 }}>
                  Не вдалось конвертувати HEIC. Будь ласка, оберіть інше зображення.
                </p>
              )}
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}