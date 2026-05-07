import { useState, useRef, useCallback, useEffect } from "react";
import styles from "./styles/CreateTournamentModal.module.css";
import cross from "./static/icons/cross.svg";
import api from "../../api";
import TournamentCard, { STOCK_IMAGES } from "./TournamentCard";
import User from "./static/icons/Profile.svg?react";
import Users from "./static/icons/Users.svg?react";

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
   Toolbar icon components (inline SVG — no extra deps)
───────────────────────────────────────────────────────── */
const IconBold = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M6 4h8a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z"/><path d="M6 12h9a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z"/>
  </svg>
);
const IconItalic = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="19" y1="4" x2="10" y2="4"/><line x1="14" y1="20" x2="5" y2="20"/><line x1="15" y1="4" x2="9" y2="20"/>
  </svg>
);
const IconUnderline = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M6 3v7a6 6 0 0 0 6 6 6 6 0 0 0 6-6V3"/><line x1="4" y1="21" x2="20" y2="21"/>
  </svg>
);
const IconStrike = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M16 4H9a3 3 0 0 0-2.83 4"/><path d="M14 12a4 4 0 0 1 0 8H6"/><line x1="4" y1="12" x2="20" y2="12"/>
  </svg>
);
const IconUL = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="9" y1="6" x2="20" y2="6"/><line x1="9" y1="12" x2="20" y2="12"/><line x1="9" y1="18" x2="20" y2="18"/>
    <circle cx="4" cy="6" r="1.5" fill="currentColor" stroke="none"/><circle cx="4" cy="12" r="1.5" fill="currentColor" stroke="none"/><circle cx="4" cy="18" r="1.5" fill="currentColor" stroke="none"/>
  </svg>
);
const IconOL = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="10" y1="6" x2="21" y2="6"/><line x1="10" y1="12" x2="21" y2="12"/><line x1="10" y1="18" x2="21" y2="18"/>
    <path d="M4 6h1v4" stroke="currentColor" strokeWidth="1.8"/><path d="M4 10h2" stroke="currentColor" strokeWidth="1.8"/>
    <path d="M6 14H4c0-1 2-2 2-3s-1-1.5-2-1" stroke="currentColor" strokeWidth="1.8"/>
    <path d="M4 19v-1a1 1 0 0 1 1-1h0a1 1 0 0 1 1 1v1a1 1 0 0 1-1 1H4" stroke="currentColor" strokeWidth="1.8"/>
  </svg>
);
const IconQuote = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 21c3 0 7-1 7-8V5c0-1.25-.756-2.017-2-2H4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V20c0 1 0 1 1 1z"/>
    <path d="M15 21c3 0 7-1 7-8V5c0-1.25-.757-2.017-2-2h-4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2h.75c0 2.25.25 4-2.75 4v3c0 1 0 1 1 1z"/>
  </svg>
);
const IconLink = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
  </svg>
);
const IconH2 = () => (
  <svg width="17" height="15" viewBox="0 0 28 18" fill="none">
    <text x="0" y="14" fontFamily="'Google Sans', sans-serif" fontSize="15" fontWeight="700" fill="currentColor">H2</text>
  </svg>
);
const IconH3 = () => (
  <svg width="17" height="15" viewBox="0 0 28 18" fill="none">
    <text x="0" y="14" fontFamily="'Google Sans', sans-serif" fontSize="15" fontWeight="700" fill="currentColor">H3</text>
  </svg>
);
const IconCode = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/>
  </svg>
);
const IconClear = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
    <line x1="3" y1="21" x2="21" y2="3"/>
  </svg>
);

/* ─────────────────────────────────────────────────────────
   Link popup
───────────────────────────────────────────────────────── */
function LinkPopup({ onInsert, onClose }) {
  const [url, setUrl] = useState("https://");
  const [text, setText] = useState("");
  const inputRef = useRef(null);
  useEffect(() => { inputRef.current?.focus(); }, []);
  return (
    <div className={styles.linkPopup}>
      <div className={styles.linkPopupRow}>
        <input
          ref={inputRef}
          className={styles.linkInput}
          placeholder="https://..."
          value={url}
          onChange={e => setUrl(e.target.value)}
        />
      </div>
      <div className={styles.linkPopupRow}>
        <input
          className={styles.linkInput}
          placeholder="Текст посилання (необов'язково)"
          value={text}
          onChange={e => setText(e.target.value)}
        />
      </div>
      <div className={styles.linkPopupActions}>
        <button type="button" className={styles.linkBtn} onClick={onClose}>Скасувати</button>
        <button
          type="button" className={`${styles.linkBtn} ${styles.linkBtnPrimary}`}
          onClick={() => { onInsert(url, text); onClose(); }}
          disabled={!url || url === "https://"}
        >Вставити</button>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────
   RichTextArea — повноцінний WYSIWYG редактор
   Зберігає HTML у value, показує відформатований текст.
───────────────────────────────────────────────────────── */
export function RichTextArea({ id, rows = 4, placeholder, value, onChange }) {
  const editorRef = useRef(null);
  const isInternalChange = useRef(false);
  const savedRange = useRef(null);
  const [activeFormats, setActiveFormats] = useState({});
  const [showLinkPopup, setShowLinkPopup] = useState(false);
  const [charCount, setCharCount] = useState(0);

  /* Sync external value → DOM (only on mount or external reset) */
  useEffect(() => {
    if (!editorRef.current) return;
    if (!isInternalChange.current && editorRef.current.innerHTML !== value) {
      editorRef.current.innerHTML = value || "";
      setCharCount(editorRef.current.innerText.replace(/\n/g, "").length);
    }
    isInternalChange.current = false;
  }, [value]);

  /* Detect active formats at cursor */
  const updateActiveFormats = useCallback(() => {
    const fmt = {
      bold:          document.queryCommandState("bold"),
      italic:        document.queryCommandState("italic"),
      underline:     document.queryCommandState("underline"),
      strikeThrough: document.queryCommandState("strikeThrough"),
      insertUnorderedList: document.queryCommandState("insertUnorderedList"),
      insertOrderedList:   document.queryCommandState("insertOrderedList"),
    };
    // detect blockquote / pre / heading
    let node = window.getSelection()?.anchorNode;
    while (node && node !== editorRef.current) {
      const tag = node.nodeName;
      if (tag === "BLOCKQUOTE") fmt.blockquote = true;
      if (tag === "PRE")        fmt.pre = true;
      if (tag === "H2")         fmt.h2 = true;
      if (tag === "H3")         fmt.h3 = true;
      node = node.parentNode;
    }
    setActiveFormats(fmt);
  }, []);

  /* Save selection before popup opens */
  const saveSelection = () => {
    const sel = window.getSelection();
    if (sel?.rangeCount) savedRange.current = sel.getRangeAt(0).cloneRange();
  };

  /* Restore selection after popup */
  const restoreSelection = () => {
    if (!savedRange.current) return;
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(savedRange.current);
  };

  /* Core exec command helper */
  const exec = useCallback((cmd, val = null) => {
    editorRef.current?.focus();
    document.execCommand(cmd, false, val);
    emitChange();
    updateActiveFormats();
  }, []);

  /* Toggle block-level elements */
  const toggleBlock = useCallback((tag) => {
    editorRef.current?.focus();
    const sel = window.getSelection();
    if (!sel?.rangeCount) return;
    let node = sel.anchorNode;
    while (node && node !== editorRef.current) {
      if (node.nodeName === tag) {
        // Unwrap — replace with <p>
        const p = document.createElement("p");
        p.innerHTML = node.innerHTML;
        node.parentNode.replaceChild(p, node);
        emitChange();
        updateActiveFormats();
        return;
      }
      node = node.parentNode;
    }
    // Wrap selection in tag
    document.execCommand("formatBlock", false, tag);
    emitChange();
    updateActiveFormats();
  }, []);

  /* Emit change to parent */
  const emitChange = useCallback(() => {
    if (!editorRef.current) return;
    isInternalChange.current = true;
    const html = editorRef.current.innerHTML;
    const text = editorRef.current.innerText.replace(/\n/g, "");
    setCharCount(text.length);
    onChange({ target: { value: html } });
  }, [onChange]);

  /* Insert link */
  const insertLink = useCallback((url, text) => {
    restoreSelection();
    editorRef.current?.focus();
    const sel = window.getSelection();
    const linkText = text || (sel?.toString()) || url;
    document.execCommand("insertHTML", false,
      `<a href="${url}" target="_blank" rel="noopener noreferrer">${linkText}</a>`
    );
    emitChange();
  }, [emitChange]);

  /* Keyboard shortcuts */
  const handleKeyDown = useCallback((e) => {
    const mod = e.ctrlKey || e.metaKey;
    if (mod) {
      if (e.key === "b") { e.preventDefault(); exec("bold"); }
      else if (e.key === "i") { e.preventDefault(); exec("italic"); }
      else if (e.key === "u") { e.preventDefault(); exec("underline"); }
      else if (e.key === "k") { e.preventDefault(); saveSelection(); setShowLinkPopup(true); }
    }
    // Tab → indent inside lists
    if (e.key === "Tab") {
      e.preventDefault();
      exec(e.shiftKey ? "outdent" : "indent");
    }
  }, [exec]);

  /* Toolbar button config */
  const TOOLBAR = [
    {
      group: "format",
      items: [
        { cmd: "bold",          icon: <IconBold />,       title: "Жирний (Ctrl+B)",      fmtKey: "bold" },
        { cmd: "italic",        icon: <IconItalic />,     title: "Курсив (Ctrl+I)",       fmtKey: "italic" },
        { cmd: "underline",     icon: <IconUnderline />,  title: "Підкреслений (Ctrl+U)", fmtKey: "underline" },
        { cmd: "strikeThrough", icon: <IconStrike />,     title: "Закреслений",           fmtKey: "strikeThrough" },
      ],
    },
    ...(id === "desc" ? [{
      group: "headings",
      items: [
        { block: "H2", icon: <IconH2 />, title: "Заголовок 2", fmtKey: "h2" },
        { block: "H3", icon: <IconH3 />, title: "Заголовок 3", fmtKey: "h3" },
      ],
    }] : []),
    {
      group: "lists",
      items: [
        { cmd: "insertUnorderedList", icon: <IconUL />, title: "Маркований список", fmtKey: "insertUnorderedList" },
        { cmd: "insertOrderedList",   icon: <IconOL />, title: "Нумерований список", fmtKey: "insertOrderedList" },
      ],
    },
    {
      group: "blocks",
      items: [
        { block: "BLOCKQUOTE", icon: <IconQuote />, title: "Цитата",      fmtKey: "blockquote" },
        { block: "PRE",        icon: <IconCode />,  title: "Код / Pre",   fmtKey: "pre" },
      ],
    },
    {
      group: "insert",
      items: [
        {
          custom: "link",
          icon: <IconLink />,
          title: "Посилання (Ctrl+K)",
          onClick: () => { saveSelection(); setShowLinkPopup(v => !v); },
        },
      ],
    },
    {
      group: "clear",
      items: [
        { cmd: "removeFormat", icon: <IconClear />, title: "Очистити форматування" },
      ],
    },
  ];

  const isEmpty = !value || value === "<br>" || value === "<p><br></p>";

  return (
    <div className={styles.richEditor}>
      {/* ── Toolbar ── */}
      <div className={styles.toolbar} onMouseDown={e => e.preventDefault()}>
        {TOOLBAR.map((group, gi) => (
          <span key={gi} className={styles.tbGroup}>
            {group.items.map((item, ii) => {
              const isActive = item.fmtKey ? activeFormats[item.fmtKey] : false;
              const handleClick = item.custom === "link"
                ? item.onClick
                : item.block
                  ? () => toggleBlock(item.block)
                  : () => exec(item.cmd);
              return (
                <button
                  key={ii}
                  type="button"
                  className={`${styles.tbBtn} ${isActive ? styles.tbBtnActive : ""}`}
                  title={item.title}
                  onClick={handleClick}
                >
                  {item.icon}
                </button>
              );
            })}
            {gi < TOOLBAR.length - 1 && <span className={styles.tbDivider} />}
          </span>
        ))}
      </div>

      {/* ── Link popup ── */}
      {showLinkPopup && (
        <LinkPopup
          onInsert={insertLink}
          onClose={() => { setShowLinkPopup(false); editorRef.current?.focus(); }}
        />
      )}

      {/* ── Editable area ── */}
      <div className={styles.editorWrap}>
        {isEmpty && (
          <div className={styles.editorPlaceholder} aria-hidden="true">
            {placeholder}
          </div>
        )}
        <div
          ref={editorRef}
          id={id}
          className={styles.editorContent}
          contentEditable
          suppressContentEditableWarning
          style={{ minHeight: `${rows * 1.6}em` }}
          onInput={emitChange}
          onKeyDown={handleKeyDown}
          onKeyUp={updateActiveFormats}
          onMouseUp={updateActiveFormats}
          onFocus={updateActiveFormats}
          onPaste={(e) => {
            // Paste as plain text to avoid style pollution
            e.preventDefault();
            const text = e.clipboardData.getData("text/plain");
            document.execCommand("insertText", false, text);
          }}
        />
      </div>

      {/* ── Footer: char count ── */}
      <div className={styles.editorFooter}>
        <span className={styles.editorCharCount}>{charCount} символів</span>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────
   ImagePicker (unchanged logic)
───────────────────────────────────────────────────────── */
export function ImagePicker({ imageMode, setImageMode, stockImage, setStockImage, customImage, onCustomUpload }) {
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
export default function CreateTournamentModal({ onClose, onCreate }) {
  const [step, setStep]         = useState(1);
  const [closing, setClosing]   = useState(false);
  const [prevStep, setPrevStep] = useState(null);
  const TOTAL_STEPS = 2;

  const [name,           setName]           = useState("");
  const [description,    setDescription]    = useState("");
  const [rules,          setRules]          = useState("");
  const [startDate,      setStartDate]      = useState("");
  const [maxTeams,       setMaxTeams]       = useState("");
  const [regStart,       setRegStart]       = useState("");
  const [regEnd,         setRegEnd]         = useState("");

  const [imageMode,      setImageMode]      = useState("stock");
  const [stockImage,     setStockImage]     = useState(STOCK_IMAGES[0].id);
  const [customFile,     setCustomFile]     = useState(null);
  const [customPreview,  setCustomPreview]  = useState(null);
  const [accentColor,    setAccentColor]    = useState(ACCENT_COLORS[0]);
  const [tournamentType, setTournamentType] = useState("");
  const [typeError,      setTypeError]      = useState(false);

  const handleClose = () => {
    setClosing(true);
    setTimeout(() => onClose?.(), 340);
  };

  const handleCustomUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setCustomFile(file);
    setCustomPreview(URL.createObjectURL(file));
  };

  const handleNext = () => {
    if (step === 1 && !tournamentType) { setTypeError(true); return; }
    setTypeError(false);
    setPrevStep(step);
    setStep(s => Math.min(s + 1, TOTAL_STEPS));
  };

  const handleBack = () => {
    setPrevStep(step);
    setStep(s => Math.max(s - 1, 1));
  };

  /* Strip HTML to plain text for description preview in card */
  const descPlainText = description.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!tournamentType) { setTypeError(true); return; }
    const body = new FormData();
    body.append("name",               name);
    body.append("description",        description);       // HTML
    body.append("rules",              rules);             // HTML
    body.append("accent_color",       accentColor);
    body.append("image_mode",         imageMode);
    body.append("start_date",         startDate);
    body.append("max_teams",          maxTeams);
    body.append("tournament_type",    tournamentType);
    body.append("format",             tournamentType);
    body.append("registration_start", regStart);
    body.append("registration_end",   regEnd);
    if (imageMode === "stock")                body.append("stock_image",  stockImage);
    if (imageMode === "custom" && customFile) body.append("custom_image", customFile);
    try {
      const { status, data } = await api.post("/tournaments/", body);
      if (status === 201) { onCreate(data); handleClose(); }
    } catch (err) {
      console.error(err.response?.data);
    }
  };

  const STEP_META = [
    { num: "КРОК 1 З 2", title: "Основне", sub: "Заповніть назву, дату та тип турніру" },
    { num: "КРОК 2 З 2", title: "Деталі",  sub: "Додайте правила, опис та дати реєстрації" },
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
                  name={name} info={descPlainText} date={startDate}
                  accentColor={accentColor} imageMode={imageMode}
                  stockImage={stockImage} customImage={customPreview}
                />
              </div>

              <div className={styles.panelItem2}>
                <ImagePicker
                  imageMode={imageMode}       setImageMode={setImageMode}
                  stockImage={stockImage}     setStockImage={setStockImage}
                  customImage={customPreview} onCustomUpload={handleCustomUpload}
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
                    <label htmlFor="name" className={styles.label}>Назва турніру</label>
                    <input
                      id="name" type="text" className={styles.input}
                      placeholder="Наприклад: Літній кубок 2025"
                      value={name} onChange={(e) => setName(e.target.value)} required
                    />
                  </div>

                  <div className={`${styles.twoCol} ${styles.stagger2}`}>
                    <div className={styles.field}>
                      <label htmlFor="startDate" className={styles.label}>
                        Дата старту <span className={styles.optional}>необов'язково</span>
                      </label>
                      <input
                        id="startDate" type="date" className={styles.input}
                        value={startDate} onChange={(e) => setStartDate(e.target.value)}
                      />
                    </div>
                    <div className={styles.field}>
                      <label htmlFor="maxTeams" className={styles.label}>
                        Макс. учасників <span className={styles.optional}>необов'язково</span>
                      </label>
                      <input
                        id="maxTeams" type="number" placeholder="Без обмежень"
                        min={2} className={styles.input}
                        value={maxTeams} onChange={(e) => setMaxTeams(e.target.value)}
                      />
                    </div>
                  </div>

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
                    <label htmlFor="desc" className={styles.label}>Опис</label>
                    <RichTextArea
                      id="desc" rows={4}
                      placeholder="Призи, партнери, формат проведення..."
                      value={description} onChange={(e) => setDescription(e.target.value)}
                    />
                  </div>
                  <div className={`${styles.sectionDivider} ${styles.stagger3}`}>
                    <span className={styles.sectionTitle}>Реєстрація команд, учасників</span>
                    <span className={styles.sectionLine} />
                  </div>
                  <div className={`${styles.regBlock} ${styles.stagger4}`}>
                    <div className={styles.twoCol}>
                      <div className={styles.field}>
                        <label htmlFor="registrationStart" className={styles.label}>Початок</label>
                        <input
                          id="registrationStart" type="datetime-local"
                          className={styles.input} required
                          value={regStart} onChange={(e) => setRegStart(e.target.value)}
                        />
                      </div>
                      <div className={styles.field}>
                        <label htmlFor="registrationEnd" className={styles.label}>Кінець</label>
                        <input
                          id="registrationEnd" type="datetime-local"
                          className={styles.input} required
                          value={regEnd} onChange={(e) => setRegEnd(e.target.value)}
                        />
                      </div>
                    </div>
                  </div>
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
                : <button type="submit" className={styles.btnCreate}>+ Створити турнір</button>
              }
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
