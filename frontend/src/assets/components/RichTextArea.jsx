import { useState, useRef, useCallback, useEffect } from "react";
import styles from "./styles/RichTextArea.module.css";

/* ─── Icons ───────────────────────────────────────────────────────────────── */
const IconBold = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M6 4h8a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z"/><path d="M6 12h9a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z"/>
  </svg>
);
const IconItalic = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="19" y1="4" x2="10" y2="4"/><line x1="14" y1="20" x2="5" y2="20"/><line x1="15" y1="4" x2="9" y2="20"/>
  </svg>
);
const IconUnderline = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M6 3v7a6 6 0 0 0 6 6 6 6 0 0 0 6-6V3"/><line x1="4" y1="21" x2="20" y2="21"/>
  </svg>
);
const IconStrike = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M16 4H9a3 3 0 0 0-2.83 4"/><path d="M14 12a4 4 0 0 1 0 8H6"/><line x1="4" y1="12" x2="20" y2="12"/>
  </svg>
);
const IconUL = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="9" y1="6" x2="20" y2="6"/><line x1="9" y1="12" x2="20" y2="12"/><line x1="9" y1="18" x2="20" y2="18"/>
    <circle cx="4" cy="6" r="1.5" fill="currentColor" stroke="none"/><circle cx="4" cy="12" r="1.5" fill="currentColor" stroke="none"/><circle cx="4" cy="18" r="1.5" fill="currentColor" stroke="none"/>
  </svg>
);
const IconOL = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="10" y1="6" x2="21" y2="6"/><line x1="10" y1="12" x2="21" y2="12"/><line x1="10" y1="18" x2="21" y2="18"/>
    <path d="M4 6h1v4" stroke="currentColor" strokeWidth="1.8"/><path d="M4 10h2" stroke="currentColor" strokeWidth="1.8"/>
    <path d="M6 14H4c0-1 2-2 2-3s-1-1.5-2-1" stroke="currentColor" strokeWidth="1.8"/>
    <path d="M4 19v-1a1 1 0 0 1 1-1h0a1 1 0 0 1 1 1v1a1 1 0 0 1-1 1H4" stroke="currentColor" strokeWidth="1.8"/>
  </svg>
);
const IconQuote = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 21c3 0 7-1 7-8V5c0-1.25-.756-2.017-2-2H4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V20c0 1 0 1 1 1z"/>
    <path d="M15 21c3 0 7-1 7-8V5c0-1.25-.757-2.017-2-2h-4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2h.75c0 2.25.25 4-2.75 4v3c0 1 0 1 1 1z"/>
  </svg>
);
const IconLink = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
  </svg>
);
const IconTable = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="18" height="18" rx="2"/>
    <line x1="3" y1="9" x2="21" y2="9"/>
    <line x1="3" y1="15" x2="21" y2="15"/>
    <line x1="9" y1="3" x2="9" y2="21"/>
    <line x1="15" y1="3" x2="15" y2="21"/>
  </svg>
);
const IconH2 = () => (
  <svg width="16" height="14" viewBox="0 0 28 18" fill="none">
    <text x="0" y="14" fontFamily="'SF Pro Display', -apple-system, sans-serif" fontSize="15" fontWeight="700" fill="currentColor">H2</text>
  </svg>
);
const IconH3 = () => (
  <svg width="16" height="14" viewBox="0 0 28 18" fill="none">
    <text x="0" y="14" fontFamily="'SF Pro Display', -apple-system, sans-serif" fontSize="15" fontWeight="700" fill="currentColor">H3</text>
  </svg>
);
const IconCode = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/>
  </svg>
);
const IconClear = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
    <line x1="3" y1="21" x2="21" y2="3"/>
  </svg>
);
const IconFormat = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 7V4h16v3"/><path d="M9 20h6"/><path d="M12 4v16"/>
  </svg>
);
const IconChevronDown = () => (
  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="6 9 12 15 18 9"/>
  </svg>
);

/* ─── Link popup ──────────────────────────────────────────────────────────── */
function LinkPopup({ onInsert, onClose }) {
  const [url, setUrl] = useState("https://");
  const [text, setText] = useState("");
  const inputRef = useRef(null);
  useEffect(() => { inputRef.current?.focus(); }, []);

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && url && url !== "https://") {
      onInsert(url, text);
      onClose();
    }
    if (e.key === "Escape") onClose();
  };

  return (
    <div className={styles.linkPopup}>
      <div className={styles.linkPopupRow}>
        <input
          ref={inputRef}
          className={styles.linkInput}
          placeholder="https://..."
          value={url}
          onChange={e => setUrl(e.target.value)}
          onKeyDown={handleKeyDown}
        />
      </div>
      <div className={styles.linkPopupRow}>
        <input
          className={styles.linkInput}
          placeholder="Текст посилання (необов'язково)"
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={handleKeyDown}
        />
      </div>
      <div className={styles.linkPopupActions}>
        <button type="button" className={styles.linkBtn} onClick={onClose}>Скасувати</button>
        <button
          type="button"
          className={`${styles.linkBtn} ${styles.linkBtnPrimary}`}
          onClick={() => { onInsert(url, text); onClose(); }}
          disabled={!url || url === "https://"}
        >Вставити</button>
      </div>
    </div>
  );
}

/* ─── Table Insert Popup ──────────────────────────────────────────────────── */
function TablePopup({ onInsert, onClose }) {
  const [rows, setRows] = useState(3);
  const [cols, setCols] = useState(3);

  const handleInsert = () => {
    onInsert(rows, cols);
    onClose();
  };

  return (
    <div className={styles.tablePopup}>
      <div className={styles.tablePopupTitle}>Вставити таблицю</div>
      <div className={styles.tablePopupGrid}>
        {Array.from({ length: 5 }).map((_, r) =>
          Array.from({ length: 5 }).map((_, c) => (
            <div
              key={`${r}-${c}`}
              className={`${styles.tableCell} ${r < rows && c < cols ? styles.tableCellActive : ""}`}
              onMouseEnter={() => { setRows(r + 1); setCols(c + 1); }}
              onClick={handleInsert}
            />
          ))
        )}
      </div>
      <div className={styles.tablePopupLabel}>{rows} × {cols}</div>
    </div>
  );
}

/* ─── Format Dropdown ─────────────────────────────────────────────────────── */
function FormatDropdown({ activeFormats, onAction, onClose }) {
  const items = [
    { label: "Заголовок 1", action: () => onAction("block", "H1"), fmtKey: "h1" },
    { label: "Заголовок 2", action: () => onAction("block", "H2"), fmtKey: "h2" },
    { label: "Заголовок 3", action: () => onAction("block", "H3"), fmtKey: "h3" },
    { label: "Звичайний текст", action: () => onAction("block", "P") },
    null,
    { label: "Цитата", action: () => onAction("block", "BLOCKQUOTE"), fmtKey: "blockquote" },
    { label: "Код / Pre", action: () => onAction("block", "PRE"), fmtKey: "pre" },
  ];

  return (
    <div className={styles.formatDropdown}>
      {items.map((item, i) =>
        item === null
          ? <div key={i} className={styles.dropdownDivider} />
          : (
            <button
              key={i}
              type="button"
              className={`${styles.dropdownItem} ${item.fmtKey && activeFormats[item.fmtKey] ? styles.dropdownItemActive : ""}`}
              onMouseDown={e => { e.preventDefault(); item.action(); onClose(); }}
            >
              {item.label}
            </button>
          )
      )}
    </div>
  );
}

/* ─── RichTextArea ────────────────────────────────────────────────────────── */
export function RichTextArea({ id, rows = 4, placeholder, value, onChange }) {
  const editorRef = useRef(null);
  const isInternalChange = useRef(false);
  const savedRange = useRef(null);
  const [activeFormats, setActiveFormats] = useState({});
  const [showLinkPopup, setShowLinkPopup] = useState(false);
  const [showTablePopup, setShowTablePopup] = useState(false);
  const [showFormatDropdown, setShowFormatDropdown] = useState(false);
  const [showListDropdown, setShowListDropdown] = useState(false);
  const [charCount, setCharCount] = useState(0);
  const [isFocused, setIsFocused] = useState(false);

  useEffect(() => {
    if (!editorRef.current) return;
    if (!isInternalChange.current && editorRef.current.innerHTML !== value) {
      editorRef.current.innerHTML = value || "";
      setCharCount(editorRef.current.innerText.replace(/\n/g, "").length);
    }
    isInternalChange.current = false;
  }, [value]);

  // Close dropdowns on outside click
  useEffect(() => {
    const handler = (e) => {
      if (!e.target.closest(`.${styles.richEditor}`)) {
        setShowFormatDropdown(false);
        setShowListDropdown(false);
        setShowTablePopup(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const updateActiveFormats = useCallback(() => {
    // Only update if editor is focused to avoid triggering bold on focus
    if (!document.activeElement || !editorRef.current?.contains(document.activeElement)) return;

    const fmt = {
      bold:                document.queryCommandState("bold"),
      italic:              document.queryCommandState("italic"),
      underline:           document.queryCommandState("underline"),
      strikeThrough:       document.queryCommandState("strikeThrough"),
      insertUnorderedList: document.queryCommandState("insertUnorderedList"),
      insertOrderedList:   document.queryCommandState("insertOrderedList"),
    };
    let node = window.getSelection()?.anchorNode;
    while (node && node !== editorRef.current) {
      const tag = node.nodeName;
      if (tag === "BLOCKQUOTE") fmt.blockquote = true;
      if (tag === "PRE")        fmt.pre = true;
      if (tag === "H1")         fmt.h1 = true;
      if (tag === "H2")         fmt.h2 = true;
      if (tag === "H3")         fmt.h3 = true;
      node = node.parentNode;
    }
    setActiveFormats(fmt);
  }, []);

  const saveSelection = useCallback(() => {
    const sel = window.getSelection();
    if (sel?.rangeCount) savedRange.current = sel.getRangeAt(0).cloneRange();
  }, []);

  const restoreSelection = useCallback(() => {
    if (!savedRange.current) return;
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(savedRange.current);
  }, []);

  const emitChange = useCallback(() => {
    if (!editorRef.current) return;
    isInternalChange.current = true;
    const html = editorRef.current.innerHTML;
    const text = editorRef.current.innerText.replace(/\n/g, "");
    setCharCount(text.length);
    onChange?.({ target: { value: html } });
  }, [onChange]);

  // FIX: Use requestAnimationFrame to ensure execCommand runs after browser
  // processes focus, preventing auto-bold on click
  const exec = useCallback((cmd, val = null) => {
    const editor = editorRef.current;
    if (!editor) return;
    // If editor doesn't have focus, focus it first then defer the command
    if (document.activeElement !== editor) {
      editor.focus();
      requestAnimationFrame(() => {
        document.execCommand(cmd, false, val);
        emitChange();
        updateActiveFormats();
      });
    } else {
      document.execCommand(cmd, false, val);
      emitChange();
      updateActiveFormats();
    }
  }, [emitChange, updateActiveFormats]);

  const toggleBlock = useCallback((tag) => {
    const editor = editorRef.current;
    if (!editor) return;

    const doToggle = () => {
      const sel = window.getSelection();
      if (!sel?.rangeCount) return;
      let node = sel.anchorNode;
      while (node && node !== editor) {
        if (node.nodeName === tag) {
          const p = document.createElement("p");
          p.innerHTML = node.innerHTML;
          node.parentNode.replaceChild(p, node);
          emitChange();
          updateActiveFormats();
          return;
        }
        node = node.parentNode;
      }
      document.execCommand("formatBlock", false, tag);
      emitChange();
      updateActiveFormats();
    };

    if (document.activeElement !== editor) {
      editor.focus();
      requestAnimationFrame(doToggle);
    } else {
      doToggle();
    }
  }, [emitChange, updateActiveFormats]);

  const insertLink = useCallback((url, linkText) => {
    restoreSelection();
    editorRef.current?.focus();
    const sel = window.getSelection();
    const text = linkText || (sel?.toString()) || url;
    document.execCommand("insertHTML", false,
      `<a href="${url}" target="_blank" rel="noopener noreferrer">${text}</a>`
    );
    emitChange();
  }, [emitChange, restoreSelection]);

  const insertTable = useCallback((rows, cols) => {
    restoreSelection();
    editorRef.current?.focus();

    let html = '<table><thead><tr>';
    for (let c = 0; c < cols; c++) html += `<th>Заголовок ${c + 1}</th>`;
    html += '</tr></thead><tbody>';
    for (let r = 0; r < rows - 1; r++) {
      html += '<tr>';
      for (let c = 0; c < cols; c++) html += '<td>&nbsp;</td>';
      html += '</tr>';
    }
    html += '</tbody></table><p><br></p>';
    document.execCommand("insertHTML", false, html);
    emitChange();
  }, [emitChange, restoreSelection]);

  const handleKeyDown = useCallback((e) => {
    const mod = e.ctrlKey || e.metaKey;
    if (mod) {
      if (e.key === "b") { e.preventDefault(); exec("bold"); }
      else if (e.key === "i") { e.preventDefault(); exec("italic"); }
      else if (e.key === "u") { e.preventDefault(); exec("underline"); }
      else if (e.key === "k") { e.preventDefault(); saveSelection(); setShowLinkPopup(true); }
    }
    if (e.key === "Tab") {
      e.preventDefault();
      exec(e.shiftKey ? "outdent" : "indent");
    }
    if (e.key === "Escape") {
      setShowLinkPopup(false);
      setShowTablePopup(false);
      setShowFormatDropdown(false);
      setShowListDropdown(false);
    }
  }, [exec, saveSelection]);

  const handleToolbarAction = useCallback((type, value) => {
    if (type === "cmd") exec(value);
    else if (type === "block") toggleBlock(value);
  }, [exec, toggleBlock]);

  const isEmpty = !value || value === "<br>" || value === "<p><br></p>" || value === "";

  return (
    <div className={`${styles.richEditor} ${isFocused ? styles.richEditorFocused : ""}`}>
      {/* Toolbar */}
      <div className={styles.toolbar} onMouseDown={e => e.preventDefault()}>

        {/* Format dropdown */}
        <div className={styles.dropdownWrap}>
          <button
            type="button"
            className={`${styles.tbBtn} ${styles.tbBtnWide} ${showFormatDropdown ? styles.tbBtnActive : ""}`}
            title="Стиль тексту"
            onClick={() => { setShowFormatDropdown(v => !v); setShowListDropdown(false); setShowTablePopup(false); }}
          >
            <IconFormat />
            <span className={styles.tbBtnLabel}>Формат</span>
            <IconChevronDown />
          </button>
          {showFormatDropdown && (
            <FormatDropdown
              activeFormats={activeFormats}
              onAction={handleToolbarAction}
              onClose={() => setShowFormatDropdown(false)}
            />
          )}
        </div>

        <span className={styles.tbDivider} />

        {/* Inline format buttons */}
        {[
          { cmd: "bold",          icon: <IconBold />,      title: "Жирний (Ctrl+B)",      fmtKey: "bold" },
          { cmd: "italic",        icon: <IconItalic />,    title: "Курсив (Ctrl+I)",       fmtKey: "italic" },
          { cmd: "underline",     icon: <IconUnderline />, title: "Підкреслений (Ctrl+U)", fmtKey: "underline" },
          { cmd: "strikeThrough", icon: <IconStrike />,    title: "Закреслений",           fmtKey: "strikeThrough" },
        ].map((item, i) => (
          <button
            key={i}
            type="button"
            className={`${styles.tbBtn} ${activeFormats[item.fmtKey] ? styles.tbBtnActive : ""}`}
            title={item.title}
            onClick={() => exec(item.cmd)}
          >
            {item.icon}
          </button>
        ))}

        <span className={styles.tbDivider} />

        {/* List dropdown */}
        <div className={styles.dropdownWrap}>
          <button
            type="button"
            className={`${styles.tbBtn} ${styles.tbBtnWide} ${showListDropdown ? styles.tbBtnActive : ""}`}
            title="Список"
            onClick={() => { setShowListDropdown(v => !v); setShowFormatDropdown(false); setShowTablePopup(false); }}
          >
            <IconUL />
            <span className={styles.tbBtnLabel}>Список</span>
            <IconChevronDown />
          </button>
          {showListDropdown && (
            <div className={styles.formatDropdown}>
              <button
                type="button"
                className={`${styles.dropdownItem} ${activeFormats.insertUnorderedList ? styles.dropdownItemActive : ""}`}
                onMouseDown={e => { e.preventDefault(); exec("insertUnorderedList"); setShowListDropdown(false); }}
              >
                <IconUL /> Маркований список
              </button>
              <button
                type="button"
                className={`${styles.dropdownItem} ${activeFormats.insertOrderedList ? styles.dropdownItemActive : ""}`}
                onMouseDown={e => { e.preventDefault(); exec("insertOrderedList"); setShowListDropdown(false); }}
              >
                <IconOL /> Нумерований список
              </button>
            </div>
          )}
        </div>

        <span className={styles.tbDivider} />

        {/* Table button */}
        <div className={styles.dropdownWrap}>
          <button
            type="button"
            className={`${styles.tbBtn} ${styles.tbBtnWide} ${showTablePopup ? styles.tbBtnActive : ""}`}
            title="Вставити таблицю"
            onClick={() => {
              saveSelection();
              setShowTablePopup(v => !v);
              setShowFormatDropdown(false);
              setShowListDropdown(false);
            }}
          >
            <IconTable />
            <span className={styles.tbBtnLabel}>Таблиця</span>
            <IconChevronDown />
          </button>
          {showTablePopup && (
            <TablePopup
              onInsert={insertTable}
              onClose={() => setShowTablePopup(false)}
            />
          )}
        </div>

        <span className={styles.tbDivider} />

        {/* Link */}
        <button
          type="button"
          className={`${styles.tbBtn} ${showLinkPopup ? styles.tbBtnActive : ""}`}
          title="Посилання (Ctrl+K)"
          onClick={() => { saveSelection(); setShowLinkPopup(v => !v); }}
        >
          <IconLink />
        </button>

        {/* Clear */}
        <button
          type="button"
          className={styles.tbBtn}
          title="Очистити форматування"
          onClick={() => exec("removeFormat")}
        >
          <IconClear />
        </button>
      </div>

      {/* Link popup */}
      {showLinkPopup && (
        <LinkPopup
          onInsert={insertLink}
          onClose={() => { setShowLinkPopup(false); editorRef.current?.focus(); }}
        />
      )}

      {/* Editable area */}
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
          onFocus={() => {
            setIsFocused(true);
            // Defer format update to avoid triggering commands on focus
            requestAnimationFrame(updateActiveFormats);
          }}
          onBlur={() => {
            setIsFocused(false);
          }}
          onPaste={(e) => {
            e.preventDefault();
            const text = e.clipboardData.getData("text/plain");
            document.execCommand("insertText", false, text);
          }}
        />
      </div>

      {/* Footer */}
      <div className={styles.editorFooter}>
        <span className={styles.editorCharCount}>{charCount} символів</span>
      </div>
    </div>
  );
}
