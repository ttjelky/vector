import { useState, useRef } from "react";
import styles from "./styles/CreateTournamentModal.module.css";
import cross from "./static/icons/cross.svg";
import api from "../../api";
import TournamentCard from "./TournamentCard";

const STOCK_IMAGES = [
  { id: "arena", label: "", color: "#B5D4F4" },
  { id: "field", label: "", color: "#C0DD97" },
  { id: "league", label: "", color: "#F5C4B3" },
  { id: "cup", label: "", color: "#eae48c" },
];

const ACCENT_COLORS = [
  "#5da3ea", "#4ad4a9", "#d83030",
  "#da83a0", "#928be1", "#e4ba80",
];

const FORMATS = [
  { value: "single_elim", label: "Single Elimination" },
  { value: "double_elim", label: "Double Elimination" },
  { value: "round_robin", label: "Round Robin (кожен з кожним)" },
  { value: "swiss", label: "Swiss System" },
];

function RichTextArea({ id, rows = 4, placeholder, value, onChange }) {
  const ref = useRef(null);

  const applyFormat = (cmd) => {
    ref.current?.focus();
    document.execCommand(cmd);
  };

  const insertText = (text) => {
    const ta = ref.current;
    if (!ta) return;
    const s = ta.selectionStart;
    const e = ta.selectionEnd;
    const val = ta.value;
    
    const newValue = val.slice(0, s) + text + val.slice(e);
    
    if (onChange) {
      onChange({ target: { value: newValue } });
    }
  };

  return (
    <div>
      <div className={styles.toolbar}>
        <button type="button" className={styles.tbBtn} onClick={() => applyFormat("bold")}><b>B</b></button>
        <button type="button" className={styles.tbBtn} onClick={() => applyFormat("italic")}><i>I</i></button>
        <button type="button" className={styles.tbBtn} onClick={() => applyFormat("underline")}><u>U</u></button>
        <button type="button" className={styles.tbBtn} onClick={() => insertText("• ")}>• список</button>
        <button type="button" className={styles.tbBtn} onClick={() => insertText("1. ")}>1. список</button>
        {id === "desc" && (
          <>
            <button type="button" className={styles.tbBtn} onClick={() => insertText("## ")}>H2</button>
            <button type="button" className={styles.tbBtn} onClick={() => insertText("### ")}>H3</button>
          </>
        )}
        <button type="button" className={styles.tbBtn} onClick={() => insertText("---")}>——</button>
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

export default function CreateTournamentModal({ onClose, onSubmit, onCreate }) {
  const [imageMode, setImageMode] = useState("stock");
  const [selectedStock, setSelectedStock] = useState(null);
  const [accentColor, setAccentColor] = useState("#378ADD");
  const [customColor, setCustomColor] = useState("#378ADD");

  const handleSubmit = async (e) => {
    e.preventDefault();
    const form = e.target;
    const data = {
      name: tournamentName,
      image_mode: imageMode,
      stock_image: selectedStock,
      accent_color: accentColor,
      rules: tournamentRules,
      description: tournamentInfo,
      start_date: form.startDate.value || null,
      registration_start: form.registrationStart.value,
      registration_end: form.registrationEnd.value,
      max_teams: form.maxTeams.value ? Number(form.maxTeams.value) : null,
      format: form.format.value,
    };

    try {
    
    const response = await api.post('/tournaments/', data);
    if (response.status === 201) {
    onCreate(response.data);
    onClose();
    }
    
    onSubmit?.(response.data); 
    
    onClose();
  } catch (error) {
    console.error("Помилка при створенні:", error);
  }
  };

  const [tournamentName, setTournamentName] = useState("");
  const [tournamentInfo, setTournamentInfo] = useState("");
  const [tournamentRules, setTournamentRules] = useState("");
  const [startDate, setStartDate] = useState("");
  
  const formatDate = (dateValue) => {
  const d = (dateValue && typeof dateValue === 'string' && dateValue.trim() !== "") 
    ? new Date(dateValue) 
    : new Date();

  if (isNaN(d.getTime())) {
    return new Date().toLocaleDateString('uk-UA', { day: 'numeric', month: 'long' });
  }

  return d.toLocaleDateString('uk-UA', { day: 'numeric', month: 'long' });
};

  return (
    <div className={styles.overlay} onClick={(e) => e.target === e.currentTarget && onClose?.()}>
      <div className={styles.modal} role="dialog" aria-modal="true" aria-labelledby="modal-title">
        <div className={styles.header}>
          <h2 id="modal-title" className={styles.title}>Створити турнір</h2>
          <img src={cross} alt="Закрити" onClick={onClose} className={styles.closeBtn}/>
        </div>

        
        <form onSubmit={handleSubmit}>
          <div className={styles.body}>

            <div className={styles.previewContainer}>
              <span className={styles.previewLabel}>Передогляд картки</span>
              <TournamentCard
                name={tournamentName}
                info={tournamentInfo}
                date={startDate}
                accentColor={accentColor}
                imageMode={selectedStock ? "stock" : "none"}
              />
              
            </div>

            {/* Назва */}
            <div className={styles.field}>
              <label htmlFor="name" className={styles.label}>Назва турніру</label>
              <input 
                type="text" 
                className={styles.input} 
                placeholder="Введіть назву..." 
                value={tournamentName}
                onChange={(e) => setTournamentName(e.target.value)} // Оновлюємо стан при кожному символі
              />
            </div>

            {/* Картинка */}
            <div className={styles.field}>
              <label className={styles.label}>Картинка турніру</label>
              <div className={styles.imgOptions}>
                {["none", "stock", "custom"].map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    className={`${styles.imgOpt} ${imageMode === mode ? styles.imgOptActive : ""}`}
                    onClick={() => setImageMode(mode)}
                  >
                    {{ none: "Без картинки", stock: "Стокові", custom: "Своя" }[mode]}
                  </button>
                ))}
              </div>

              {imageMode === "stock" && (
                <div className={styles.stockGrid}>
                  {STOCK_IMAGES.map((img) => (
                    <div
                      key={img.id}
                      className={`${styles.stockItem} ${selectedStock === img.id ? styles.stockItemActive : ""}`}
                      style={{ background: img.color }}
                      onClick={() => setSelectedStock(img.id)}
                    >
                      {img.label}
                    </div>
                  ))}
                </div>
              )}

              {imageMode === "custom" && (
                <input type="file" accept="image/*" name="customImage" className={styles.fileInput} />
              )}
            </div>

            {/* Колір */}
            <div className={styles.field}>
              <label className={styles.label}>Колір акценту</label>
              <div className={styles.colorRow}>
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

            {/* Правила */}
            <div className={styles.field}>
              <label htmlFor="rules" className={styles.label}>Правила</label>
              <RichTextArea id="rules" rows={3} placeholder="Правила проведення турніру..." />
              <textarea name="rules" id="rules-hidden" hidden readOnly />
            </div>

            {/* Опис */}
            <div className={styles.field}>
              <label htmlFor="desc" className={styles.label}>Опис</label>
              <RichTextArea
                id="desc"
                rows={5} 
                placeholder="Детальний опис турніру..."
                value={tournamentInfo}
                onChange={(e) => setTournamentInfo(e.target.value)}
               />
              <textarea name="description" id="desc-hidden" hidden readOnly />
            </div>

            {/* Дата старту + Формат */}
            <div className={styles.twoCol}>
              <div className={styles.field}>
                <label htmlFor="startDate" className={styles.label}>
                  Дата старту <span className={styles.optional}>необов'язково</span>
                </label>
                <input
                 id="startDate" 
                 name="startDate" 
                 type="date" 
                 className={styles.input} 
                 value={startDate} 
                 onChange={(e) => setStartDate(e.target.value)} />
              </div>
              <div className={styles.field}>
                <label htmlFor="format" className={styles.label}>Формат</label>
                <select id="format" name="format" className={styles.select} required>
                  <option value="">Оберіть формат...</option>
                  {FORMATS.map((f) => (
                    <option key={f.value} value={f.value}>{f.label}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Секція реєстрації */}
            <div className={styles.sectionDivider}>
              <span className={styles.sectionTitle}>Реєстрація команд</span>
            </div>

            <div className={styles.threeCol}>
              <div className={styles.field}>
                <label htmlFor="registrationStart" className={styles.label}>Початок реєстрації</label>
                <input id="registrationStart" name="registrationStart" type="datetime-local" className={styles.input} required />
              </div>
              <div className={styles.field}>
                <label htmlFor="registrationEnd" className={styles.label}>Кінець реєстрації</label>
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
            <button type="submit" className={styles.btnCreate}>+ Cтворити</button>
          </div>
        </form>
      </div>
    </div>
  );
}
