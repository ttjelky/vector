import { useState, useRef } from "react";
import styles from "./styles/CreateTournamentModal.module.css";
import cross from "./static/icons/cross.svg";
import api from "../../api";
import TournamentCard, { STOCK_IMAGES } from "./TournamentCard";

// ── Constants ────────────────────────────────────────────────────────────────

const ACCENT_COLORS = ["#5da3ea", "#4ad4a9", "#d83030", "#da83a0", "#928be1", "#e4ba80"];

const FORMATS = [
  { value: "single_elim", label: "Single Elimination" },
  { value: "double_elim", label: "Double Elimination" },
  { value: "round_robin", label: "Round Robin (кожен з кожним)" },
  { value: "swiss",       label: "Swiss System" },
];

// ── RichTextArea ─────────────────────────────────────────────────────────────

function RichTextArea({ id, rows = 4, placeholder, value, onChange }) {
  const ref = useRef(null);

  const insert = (text) => {
    if (!ref.current) return;
    const { selectionStart: s, selectionEnd: e, value: v } = ref.current;
    onChange({ target: { value: v.slice(0, s) + text + v.slice(e) } });
  };

  return (
    <div>
      <div className={styles.toolbar}>
        <button type="button" className={styles.tbBtn} onClick={() => document.execCommand("bold")}><b>B</b></button>
        <button type="button" className={styles.tbBtn} onClick={() => document.execCommand("italic")}><i>I</i></button>
        <button type="button" className={styles.tbBtn} onClick={() => document.execCommand("underline")}><u>U</u></button>
        <button type="button" className={styles.tbBtn} onClick={() => insert("• ")}>• список</button>
        <button type="button" className={styles.tbBtn} onClick={() => insert("1. ")}>1. список</button>
        {id === "desc" && <>
          <button type="button" className={styles.tbBtn} onClick={() => insert("## ")}>H2</button>
          <button type="button" className={styles.tbBtn} onClick={() => insert("### ")}>H3</button>
        </>}
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

function ImagePicker({ imageMode, setImageMode, stockImage, setStockImage, customImage, onCustomUpload }) {
  return (
    <div className={styles.field}>
      <label className={styles.label}>Картинка турніру</label>

      <div className={styles.imgOptions}>
        {[
          { value: "stock",  label: "Стокові" },
          { value: "custom", label: "Своя" },
        ].map(({ value, label }) => (
          <button
            key={value}
            type="button"
            className={`${styles.imgOpt} ${imageMode === value ? styles.imgOptActive : ""}`}
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
            : <span className={styles.uploadPrompt}>Натисніть або перетягніть зображення</span>
          }
          <input type="file" accept="image/*" onChange={onCustomUpload} className={styles.fileInputHidden} />
        </label>
      )}
    </div>
  );
}

// ── Main Modal ───────────────────────────────────────────────────────────────

export default function CreateTournamentModal({ onClose, onCreate }) {
  const [name,          setName]          = useState("");
  const [description,   setDescription]   = useState("");
  const [rules,         setRules]         = useState("");
  const [startDate,     setStartDate]     = useState("");

  const [imageMode,     setImageMode]     = useState("stock");
  const [stockImage,    setStockImage]    = useState(STOCK_IMAGES[0].id);
  const [customFile,    setCustomFile]    = useState(null);
  const [customPreview, setCustomPreview] = useState(null);
  const [accentColor,   setAccentColor]   = useState(ACCENT_COLORS[0]);

  const handleCustomUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setCustomFile(file);
    setCustomPreview(URL.createObjectURL(file));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const form = e.target;
    const body = new FormData();

    body.append("name",               name);
    body.append("description",        description);
    body.append("rules",              rules);
    body.append("accent_color",       accentColor);
    body.append("image_mode",         imageMode);
    body.append("start_date",         startDate);
    body.append("max_teams",          form.maxTeams?.value          ?? "");
    body.append("format",             form.format?.value            ?? "");
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

        <div className={styles.header}>
          <h2 id="modal-title" className={styles.title}>Створити турнір</h2>
          <img src={cross} alt="Закрити" onClick={onClose} className={styles.closeBtn} />
        </div>

        <form onSubmit={handleSubmit}>
          <div className={styles.body}>

            <div className={styles.previewContainer}>
              <span className={styles.previewLabel}>Передогляд картки</span>
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

            <div className={styles.field}>
              <label htmlFor="name" className={styles.label}>Назва турніру</label>
              <input
                id="name" type="text" className={styles.input}
                placeholder="Введіть назву..."
                value={name} onChange={(e) => setName(e.target.value)}
              />
            </div>

            <ImagePicker
              imageMode={imageMode}     setImageMode={setImageMode}
              stockImage={stockImage}   setStockImage={setStockImage}
              customImage={customPreview} onCustomUpload={handleCustomUpload}
            />

            <div className={styles.field}>
              <label className={styles.label}>Колір акценту</label>
              <div className={styles.colorRow}>
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

            <div className={styles.field}>
              <label htmlFor="rules" className={styles.label}>Правила</label>
              <RichTextArea id="rules" rows={3} placeholder="Правила проведення турніру..."
                value={rules} onChange={(e) => setRules(e.target.value)} />
            </div>

            <div className={styles.field}>
              <label htmlFor="desc" className={styles.label}>Опис</label>
              <RichTextArea id="desc" rows={5} placeholder="Детальний опис турніру..."
                value={description} onChange={(e) => setDescription(e.target.value)} />
            </div>

            <div className={styles.twoCol}>
              <div className={styles.field}>
                <label htmlFor="startDate" className={styles.label}>
                  Дата старту <span className={styles.optional}>необов'язково</span>
                </label>
                <input id="startDate" name="startDate" type="date" className={styles.input}
                  value={startDate} onChange={(e) => setStartDate(e.target.value)} />
              </div>
              <div className={styles.field}>
                <label htmlFor="format" className={styles.label}>Формат</label>
                <select id="format" name="format" className={styles.select} required>
                  <option value="">Оберіть формат...</option>
                  {FORMATS.map(({ value, label }) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className={styles.sectionDivider}>
              <span className={styles.sectionTitle}>Реєстрація команд</span>
            </div>
            <div className={styles.threeCol}>
              <div className={styles.field}>
                <label htmlFor="registrationStart" className={styles.label}>Початок</label>
                <input id="registrationStart" name="registrationStart" type="datetime-local" className={styles.input} required />
              </div>
              <div className={styles.field}>
                <label htmlFor="registrationEnd" className={styles.label}>Кінець</label>
                <input id="registrationEnd" name="registrationEnd" type="datetime-local" className={styles.input} required />
              </div>
              <div className={styles.field}>
                <label htmlFor="maxTeams" className={styles.label}>
                  Макс. команд <span className={styles.optional}>необов'язково</span>
                </label>
                <input id="maxTeams" name="maxTeams" type="number" placeholder="∞" min={2} className={styles.input} />
              </div>
            </div>

          </div>

          <div className={styles.footer}>
            <button type="button" className={styles.btnCancel} onClick={onClose}>Скасувати</button>
            <button type="submit" className={styles.btnCreate}>+ Створити</button>
          </div>
        </form>

      </div>
    </div>
  );
}
