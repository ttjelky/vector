import { useState, useRef } from "react";
import styles from "./styles/CreateTournamentModal.module.css";
import cross from "./static/icons/cross.svg";
import api from "../../api";
import TournamentCard, { STOCK_IMAGES } from "./TournamentCard";
import User from "./static/icons/Profile.svg?react"
import Users from "./static/icons/Users.svg?react"

const ACCENT_COLORS = ["#82b3e4", "#4ad44c", "#ca7979", "#c76db0", "#8e5edf", "#eccb5c"];

const TOURNAMENT_TYPES = [
  {
    value: "solo",
    label: "Одиночний",
    desc: "Гравці змагаються самостійно",
    illustration: (
      <User className={styles.typeIllustrationSvg}/>
    ),
  },
  {
    value: "team",
    label: "Командний",
    desc: "Учасники об'єднані в команди",
    illustration: (
      <Users className={styles.typeIllustrationSvg}/>
    ),
  },
];

export function RichTextArea({ id, rows = 4, placeholder, value, onChange }) {
  const ref = useRef(null);

  const insert = (text) => {
    if (!ref.current) return;
    const { selectionStart: s, selectionEnd: e, value: v } = ref.current;
    onChange({ target: { value: v.slice(0, s) + text + v.slice(e) } });
  };

  return (
    <div className={styles.richEditor}>
      <div className={styles.toolbar}>
        <button type="button" className={styles.tbBtn} onClick={() => document.execCommand("bold")}><b>B</b></button>
        <button type="button" className={styles.tbBtn} onClick={() => document.execCommand("italic")}><i>I</i></button>
        <button type="button" className={styles.tbBtn} onClick={() => document.execCommand("underline")}><u>U</u></button>
        <span className={styles.tbDivider} />
        <button type="button" className={styles.tbBtn} onClick={() => insert("• ")}>• список</button>
        <button type="button" className={styles.tbBtn} onClick={() => insert("1. ")}>1. список</button>
        {id === "desc" && <>
          <span className={styles.tbDivider} />
          <button type="button" className={styles.tbBtn} onClick={() => insert("## ")}>H2</button>
          <button type="button" className={styles.tbBtn} onClick={() => insert("### ")}>H3</button>
        </>}
        <span className={styles.tbDivider} />
        <button type="button" className={styles.tbBtn} onClick={() => insert("---")}>——</button>
      </div>
      <textarea
        ref={ref}
        id={id}
        rows={rows}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        className={styles.textarea}
      />
    </div>
  );
}

// ── ImagePicker ──────────────────────────────────────────────────────────────

export function ImagePicker({
  imageMode, setImageMode,
  stockImage, setStockImage,
  customImage, onCustomUpload,
}) {
  return (
    <div className={styles.sideSection}>
      <span className={styles.sideLabel}>Зображення</span>

      <div className={styles.imgTabs}>
        {[{ value: "stock", label: "Стокові" }, { value: "custom", label: "Власне" }].map(({ value, label }) => (
          <button
            key={value}
            type="button"
            className={`${styles.imgTab} ${imageMode === value ? styles.imgTabActive : ""}`}
            onClick={() => setImageMode(value)}
          >
            {label}
          </button>
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
        <label className={styles.uploadZone}>
          {customImage
            ? <img src={customImage} alt="preview" className={styles.uploadPreview} />
            : <>
                <span className={styles.uploadIcon}>↑</span>
                <span className={styles.uploadPrompt}>Натисніть або перетягніть файл</span>
              </>
          }
          <input type="file" accept="image/*" onChange={onCustomUpload} className={styles.fileInputHidden} />
        </label>
      )}
    </div>
  );
}

// ── Main Modal ───────────────────────────────────────────────────────────────

export default function CreateTournamentModal({ onClose, onCreate }) {
  const [name,           setName]           = useState("");
  const [description,    setDescription]    = useState("");
  const [rules,          setRules]          = useState("");
  const [startDate,      setStartDate]      = useState("");

  const [imageMode,      setImageMode]      = useState("stock");
  const [stockImage,     setStockImage]     = useState(STOCK_IMAGES[0].id);
  const [customFile,     setCustomFile]     = useState(null);
  const [customPreview,  setCustomPreview]  = useState(null);
  const [accentColor,    setAccentColor]    = useState(ACCENT_COLORS[0]);
  const [tournamentType, setTournamentType] = useState("");

  const handleCustomUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setCustomFile(file);
    setCustomPreview(URL.createObjectURL(file));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!tournamentType) {
      document.getElementById("tournamentTypeError")?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    const form = e.target;
    const body = new FormData();

    body.append("name",               name);
    body.append("description",        description);
    body.append("rules",              rules);
    body.append("accent_color",       accentColor);
    body.append("image_mode",         imageMode);
    body.append("start_date",         startDate);
    body.append("max_teams",          form.maxTeams?.value          ?? "");
    body.append("tournament_type",    tournamentType);
    body.append("format",             tournamentType);
    body.append("registration_start", form.registrationStart?.value ?? "");
    body.append("registration_end",   form.registrationEnd?.value   ?? "");

    if (imageMode === "stock")                body.append("stock_image",  stockImage);
    if (imageMode === "custom" && customFile) body.append("custom_image", customFile);

    try {
      const { status, data } = await api.post("/tournaments/", body);
      if (status === 201) { onCreate(data); onClose(); }
    } catch (err) {
      console.error(err.response?.data);
    }
  };

  return (
    <div className={styles.overlay} onClick={(e) => e.target === e.currentTarget && onClose?.()}>
      <div className={styles.modal} role="dialog" aria-modal="true" aria-labelledby="modal-title">

        {/* ── Header ── */}
        <div className={styles.header}>
          <h2 id="modal-title" className={styles.title}>Створити турнір</h2>
          <img src={cross} alt="Закрити" onClick={onClose} className={styles.closeBtn} />
        </div>

        <form onSubmit={handleSubmit}>
          <div className={styles.body}>

            {/* ══════════════════════════════════════
                LEFT PANEL — visual settings
            ══════════════════════════════════════ */}
            <div className={styles.panelLeft}>

              {/* Preview card — untouched */}
              <div className={styles.previewContainer}>
                <span className={styles.previewLabel}>Передогляд</span>
                <TournamentCard
                  name={name}
                  info={description}
                  date={startDate}
                  accentColor={accentColor}
                  imageMode={imageMode}
                  stockImage={stockImage}
                  customImage={customPreview}
                />
              </div>

              {/* Image picker */}
              <ImagePicker
                imageMode={imageMode}       setImageMode={setImageMode}
                stockImage={stockImage}     setStockImage={setStockImage}
                customImage={customPreview} onCustomUpload={handleCustomUpload}
              />

              {/* Accent color */}
              <div className={styles.sideSection}>
                <span className={styles.sideLabel}>Колір акценту</span>
                <div className={styles.colorGrid}>
                  {ACCENT_COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      className={`${styles.swatch} ${accentColor === c ? styles.swatchActive : ""}`}
                      style={{ background: c }}
                      onClick={() => setAccentColor(c)}
                      aria-label={c}
                    />
                  ))}
                </div>
              </div>

            </div>

            {/* ══════════════════════════════════════
                RIGHT PANEL — form fields
            ══════════════════════════════════════ */}
            <div className={styles.panelRight}>

              {/* Назва */}
              <div className={styles.field}>
                <label htmlFor="name" className={styles.label}>Назва турніру</label>
                <input
                  id="name" type="text" className={styles.input}
                  placeholder="Наприклад: Літній кубок 2025"
                  value={name} onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>

              {/* Дата + макс. учасників */}
              <div className={styles.twoCol}>
                <div className={styles.field}>
                  <label htmlFor="startDate" className={styles.label}>
                    Дата старту <span className={styles.optional}>необов'язково</span>
                  </label>
                  <input
                    id="startDate" name="startDate" type="date"
                    className={styles.input}
                    value={startDate} onChange={(e) => setStartDate(e.target.value)}
                  />
                </div>
                <div className={styles.field}>
                  <label htmlFor="maxTeams" className={styles.label}>
                    Макс. учасників <span className={styles.optional}>необов'язково</span>
                  </label>
                  <input
                    id="maxTeams" name="maxTeams" type="number"
                    placeholder="Без обмежень"
                    min={2} className={styles.input}
                  />
                </div>
              </div>

              <div className={styles.sideSection}>
                <span className={styles.label}>
                  Тип турніру
                </span>
                <div className={styles.typeCards}>
                  {TOURNAMENT_TYPES.map((type) => {
                    const isActive = tournamentType === type.value;
                    return (
                      <button
                        key={type.value}
                        type="button"
                        className={`${styles.typeCard} ${isActive ? styles.typeCardActive : ""}`}
                        onClick={() => setTournamentType(type.value)}
                      >
                        <div className={styles.typeIllustration}>
                          {type.illustration}
                        </div>
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
                {!tournamentType && (
                  <p id="tournamentTypeError" className={styles.fieldError}>
                    Оберіть тип турніру
                  </p>
                )}
              </div>

              {/* Правила */}
              <div className={styles.field}>
                <label htmlFor="rules" className={styles.label}>Правила</label>
                <RichTextArea
                  id="rules" rows={3}
                  placeholder="Заборонені прийоми, регламент, апеляції..."
                  value={rules} onChange={(e) => setRules(e.target.value)}
                />
              </div>

              {/* Опис */}
              <div className={styles.field}>
                <label htmlFor="desc" className={styles.label}>Опис</label>
                <RichTextArea
                  id="desc" rows={4}
                  placeholder="Призи, партнери, формат проведення..."
                  value={description} onChange={(e) => setDescription(e.target.value)}
                />
              </div>

              {/* Реєстрація */}
              <div className={styles.sectionDivider}>
                <span className={styles.sectionTitle}>Реєстрація команд, учасників</span>
                <span className={styles.sectionLine} />
              </div>

              <div className={styles.regBlock}>
                <div className={styles.twoCol}>
                  <div className={styles.field}>
                    <label htmlFor="registrationStart" className={styles.label}>Початок</label>
                    <input
                      id="registrationStart" name="registrationStart"
                      type="datetime-local" className={styles.input} required
                    />
                  </div>
                  <div className={styles.field}>
                    <label htmlFor="registrationEnd" className={styles.label}>Кінець</label>
                    <input
                      id="registrationEnd" name="registrationEnd"
                      type="datetime-local" className={styles.input} required
                    />
                  </div>
                </div>
              </div>

          <div className={styles.footer}>
              <div className={styles.footerActions}>
                <button type="button" className={styles.btnCancel} onClick={onClose}>
                  Скасувати
                </button>
                <button type="submit" className={styles.btnCreate}>
                  + Створити турнір
                </button>
              </div>
          </div>

            </div>
          </div>

        </form>

      </div>
    </div>
  );
}
