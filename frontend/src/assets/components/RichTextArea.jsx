import { useState, useRef, useCallback, useEffect, useLayoutEffect } from "react";
import { createPortal } from "react-dom";
import styles from "./styles/RichTextArea.module.css";

/* ─── DropdownPortal ────────────────────────────────────────────────────────── */
function DropdownPortal({ triggerRef, children, onClose, portalRef }) {
  const [pos, setPos] = useState({ top: 0, left: 0 });

  useEffect(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    setPos({ top: rect.bottom + 4, left: rect.left });
  }, []);

  useEffect(() => {
    const close = () => onClose();
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    return () => {
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
    };
  }, [onClose]);

  return createPortal(
    <div
      ref={portalRef}
      style={{ position: "fixed", top: pos.top, left: pos.left, zIndex: 99999 }}
      onMouseDown={e => e.stopPropagation()}
    >
      {children}
    </div>,
    document.body
  );
}

/* ─── Icons ────────────────────────────────────────────────────────────────── */
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
const IconMore = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="5" cy="12" r="1.5" fill="currentColor" stroke="none"/>
    <circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none"/>
    <circle cx="19" cy="12" r="1.5" fill="currentColor" stroke="none"/>
  </svg>
);

/* ─── Link popup ─────────────────────────────────────────────────────────────*/
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

/* ─── Overflow "More" Dropdown ────────────────────────────────────────────── */
function OverflowDropdown({ items, activeFormats, onAction, onClose, execFn, saveSelectionFn, setShowLinkPopup, setShowTablePopup, insertTableFn }) {
  return (
    <div className={styles.formatDropdown} style={{ minWidth: 180 }}>
      {items.map((item, i) => {
        if (item === null) return <div key={i} className={styles.dropdownDivider} />;
        if (item.type === "cmd") {
          return (
            <button
              key={i}
              type="button"
              className={`${styles.dropdownItem} ${activeFormats[item.fmtKey] ? styles.dropdownItemActive : ""}`}
              onMouseDown={e => { e.preventDefault(); execFn(item.cmd); onClose(); }}
            >
              <span style={{ opacity: 0.7 }}>{item.icon}</span>
              {item.label}
            </button>
          );
        }
        if (item.type === "link") {
          return (
            <button
              key={i}
              type="button"
              className={styles.dropdownItem}
              onMouseDown={e => { e.preventDefault(); saveSelectionFn(); setShowLinkPopup(true); onClose(); }}
            >
              <span style={{ opacity: 0.7 }}><IconLink /></span>
              Посилання
            </button>
          );
        }
        if (item.type === "clear") {
          return (
            <button
              key={i}
              type="button"
              className={styles.dropdownItem}
              onMouseDown={e => { e.preventDefault(); execFn("removeFormat"); onClose(); }}
            >
              <span style={{ opacity: 0.7 }}><IconClear /></span>
              Очистити формат
            </button>
          );
        }
        return null;
      })}
    </div>
  );
}

/* ─── Table drag & resize helpers ────────────────────────────────────────── */
// Pure inline-style approach — no CSS module class names used
const HANDLE_ATTR = "data-rte-handle";

function initTableDrag(editorEl, emitChange) {
  /* ── shared state ─────────────────────────────────────────────────────── */
  let dragType  = null; // "col" | "row"
  let dragIdx   = null;
  let targetIdx = null;
  let dragTable = null;

  // resize state
  let resizing     = false;
  let resizeType   = null; // "col" | "row"
  let resizeCell   = null;
  let resizeTable  = null;
  let resizeStart  = 0;
  let resizeSize0  = 0; // initial width / height in px

  /* ── helpers ──────────────────────────────────────────────────────────── */
  function siblingIdx(el) {
    let i = 0, cur = el;
    while ((cur = cur.previousElementSibling)) i++;
    return i;
  }

  function allRows(t) { return Array.from(t.querySelectorAll("tr")); }

  /* ── highlight (move) ─────────────────────────────────────────────────── */
  const HL = "background:rgba(0,122,255,0.13)!important;outline:1.5px solid rgba(0,122,255,0.45);outline-offset:-1px;";

  function setHl(cells) {
    cells.forEach(c => { c.setAttribute("data-rte-hl", "1"); c.style.cssText += HL; });
  }

  function clearHl(t) {
    if (!t) return;
    t.querySelectorAll("[data-rte-hl]").forEach(c => {
      c.removeAttribute("data-rte-hl");
      c.style.outline = "";
      c.style.outlineOffset = "";
      c.style.background = "";
    });
  }

  function highlightCol(t, idx) {
    clearHl(t);
    const cells = [];
    allRows(t).forEach(tr => { if (tr.children[idx]) cells.push(tr.children[idx]); });
    setHl(cells);
  }

  function highlightRow(t, idx) {
    clearHl(t);
    const row = allRows(t)[idx];
    if (row) setHl(Array.from(row.children));
  }

  /* ── move col / row ───────────────────────────────────────────────────── */
  function moveCol(t, from, to) {
    allRows(t).forEach(tr => {
      const cells = Array.from(tr.children);
      if (!cells[from] || !cells[to]) return;
      from < to
        ? tr.insertBefore(cells[from], cells[to].nextSibling)
        : tr.insertBefore(cells[from], cells[to]);
    });
  }

  function moveRow(t, from, to) {
    const rows = allRows(t);
    const src = rows[from], ref = rows[to];
    if (!src || !ref) return;
    from < to
      ? ref.parentNode.insertBefore(src, ref.nextSibling)
      : ref.parentNode.insertBefore(src, ref);
  }

  /* ── reorder drag handle factory ─────────────────────────────────────── */
  function makeHandle(isCol) {
    const h = document.createElement("span");
    h.setAttribute(HANDLE_ATTR, isCol ? "col" : "row");
    h.title = isCol ? "Перетягнути колонку" : "Перетягнути рядок";
    h.textContent = "⠿";
    Object.assign(h.style, {
      position: "absolute", cursor: "grab", fontSize: "11px",
      lineHeight: "1", userSelect: "none", color: "#555",
      opacity: "0", zIndex: "20", transition: "opacity 0.15s",
      pointerEvents: "auto",
      ...(isCol ? { top: "2px", right: "3px" }
                : { left: "2px", top: "50%", transform: "translateY(-50%)" }),
    });
    return h;
  }

  function ensureColHandle(th, t) {
    if (th.querySelector(`[${HANDLE_ATTR}="col"]`)) return;
    th.style.position = "relative";
    const h = makeHandle(true);
    h.addEventListener("mousedown", e => {
      e.preventDefault(); e.stopPropagation();
      dragType = "col"; dragIdx = siblingIdx(th); dragTable = t;
      beginDrag();
    });
    th.appendChild(h);
    th.addEventListener("mouseenter", () => { h.style.opacity = "0.55"; });
    th.addEventListener("mouseleave", () => { h.style.opacity = "0"; });
    h.addEventListener("mouseenter", () => { h.style.opacity = "1"; });
  }

  function ensureRowHandle(tr, t) {
    const first = tr.querySelector("td, th");
    if (!first || first.querySelector(`[${HANDLE_ATTR}="row"]`)) return;
    first.style.position = "relative";
    first.style.paddingLeft = "18px";
    const h = makeHandle(false);
    h.addEventListener("mousedown", e => {
      e.preventDefault(); e.stopPropagation();
      dragType = "row"; dragIdx = siblingIdx(tr); dragTable = t;
      beginDrag();
    });
    first.appendChild(h);
    tr.addEventListener("mouseenter", () => { h.style.opacity = "0.45"; });
    tr.addEventListener("mouseleave", () => { h.style.opacity = "0"; });
    h.addEventListener("mouseenter", () => { h.style.opacity = "1"; });
  }

  /* ── reorder drag lifecycle ───────────────────────────────────────────── */
  function beginDrag() {
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup",   onUp);
    document.body.style.userSelect = "none";
    document.body.style.cursor     = "grabbing";
  }

  function onMove(e) {
    if (!dragTable) return;
    const el = document.elementFromPoint(e.clientX, e.clientY);
    if (!el) return;
    const cell = el.closest("td, th");
    if (!cell || !dragTable.contains(cell)) return;
    if (dragType === "col") {
      const idx = siblingIdx(cell);
      if (idx !== targetIdx) { targetIdx = idx; highlightCol(dragTable, idx); }
    } else {
      const tr = cell.closest("tr");
      if (!tr) return;
      const idx = siblingIdx(tr);
      if (idx !== targetIdx) { targetIdx = idx; highlightRow(dragTable, idx); }
    }
  }

  function onUp() {
    document.removeEventListener("mousemove", onMove);
    document.removeEventListener("mouseup",   onUp);
    document.body.style.userSelect = "";
    document.body.style.cursor     = "";
    if (dragTable && dragIdx !== null && targetIdx !== null && dragIdx !== targetIdx) {
      clearHl(dragTable);
      dragType === "col" ? moveCol(dragTable, dragIdx, targetIdx)
                         : moveRow(dragTable, dragIdx, targetIdx);
      emitChange();
    } else if (dragTable) {
      clearHl(dragTable);
    }
    dragType = null; dragIdx = null; targetIdx = null; dragTable = null;
  }

  /* ── resize gripper ──────────────────────────────────────────────────── */
  // Gripper: a thin invisible strip on the right/bottom edge of each cell.
  // We inject one per cell on first mouseover (idempotent via data attr).

  const GRIPPER_ATTR = "data-rte-gripper";

  function makeGripper(isCol) {
    const g = document.createElement("span");
    g.setAttribute(GRIPPER_ATTR, isCol ? "col" : "row");
    Object.assign(g.style, {
      position:      "absolute",
      zIndex:        "30",
      userSelect:    "none",
      pointerEvents: "auto",
      // visual: a faint line that brightens on hover
      background:    "transparent",
      transition:    "background 0.15s",
      ...(isCol ? {
        top: "0", right: "-3px", width: "6px", height: "100%",
        cursor: "col-resize",
      } : {
        bottom: "-3px", left: "0", height: "6px", width: "100%",
        cursor: "row-resize",
      }),
    });

    // highlight the grip line on hover
    g.addEventListener("mouseenter", () => {
      g.style.background = isCol
        ? "linear-gradient(to right, transparent 40%, rgba(0,122,255,0.35) 40%, rgba(0,122,255,0.35) 60%, transparent 60%)"
        : "linear-gradient(to bottom, transparent 40%, rgba(0,122,255,0.35) 40%, rgba(0,122,255,0.35) 60%, transparent 60%)";
    });
    g.addEventListener("mouseleave", () => { g.style.background = "transparent"; });

    return g;
  }

  function ensureColGripper(cell, t) {
    // No gripper on the last column — no right neighbour to balance against
    const row = cell.closest("tr");
    if (row && cell === row.lastElementChild) return;

    if (cell.querySelector(`[${GRIPPER_ATTR}="col"]`)) return;
    cell.style.position = "relative";
    const g = makeGripper(true);
    g.addEventListener("mousedown", e => {
      e.preventDefault(); e.stopPropagation();
      resizing    = true;
      resizeType  = "col";
      resizeCell  = cell;
      resizeTable = t;
      resizeStart = e.clientX;
      resizeSize0 = cell.getBoundingClientRect().width;
      // Capture the right neighbour so we can shrink it as we grow
      resizeNeighbourCell  = cell.nextElementSibling;
      resizeNeighbourSize0 = resizeNeighbourCell
        ? resizeNeighbourCell.getBoundingClientRect().width
        : 0;
      freezeColWidths(t);
      // Re-read sizes after freeze (freeze may rescale widths)
      resizeSize0          = cell.getBoundingClientRect().width;
      resizeNeighbourSize0 = resizeNeighbourCell
        ? resizeNeighbourCell.getBoundingClientRect().width
        : 0;
      document.addEventListener("mousemove", onResizeMove);
      document.addEventListener("mouseup",   onResizeUp);
      document.body.style.userSelect = "none";
      document.body.style.cursor     = "col-resize";
    });
    cell.appendChild(g);
  }

  function ensureRowGripper(tr, t) {
    // Add row height gripper to the bottom edge of each cell in the row
    Array.from(tr.children).forEach(cell => {
      if (cell.querySelector(`[${GRIPPER_ATTR}="row"]`)) return;
      cell.style.position = "relative";
      const g = makeGripper(false);
      g.addEventListener("mousedown", e => {
        e.preventDefault(); e.stopPropagation();
        resizing    = true;
        resizeType  = "row";
        resizeCell  = tr;          // store <tr>
        resizeTable = t;
        resizeStart = e.clientY;
        resizeSize0 = tr.getBoundingClientRect().height;
        document.addEventListener("mousemove", onResizeMove);
        document.addEventListener("mouseup",   onResizeUp);
        document.body.style.userSelect = "none";
        document.body.style.cursor     = "row-resize";
      });
      cell.appendChild(g);
    });
  }

  // Convert all column widths to percentages so table stays exactly 100% always
  function freezeColWidths(t) {
    const firstRow = t.querySelector("tr");
    if (!firstRow) return;
    // Lock table to 100% — browser enforces this, no px drift possible
    t.style.tableLayout = "fixed";
    t.style.width    = "100%";
    t.style.maxWidth = "100%";
    const cells  = Array.from(firstRow.children);
    const rawW   = cells.map(c => c.getBoundingClientRect().width);
    const rawSum = rawW.reduce((a, b) => a + b, 0) || 1;
    // Store percentages on the table element so onResizeMove can read them
    t._colPct = rawW.map(w => (w / rawSum) * 100);
    cells.forEach((_, colIdx) => {
      const pct = t._colPct[colIdx];
      allRows(t).forEach(tr => {
        const c = tr.children[colIdx];
        if (c) c.style.width = pct.toFixed(4) + "%";
      });
    });
  }

  // Store neighbour initial width for paired resize
  let resizeNeighbourCell = null;
  let resizeNeighbourSize0 = 0;

  function onResizeMove(e) {
    if (!resizing) return;
    if (resizeType === "col") {
      const colIdx  = siblingIdx(resizeCell);
      const nextIdx = colIdx + 1;
      const pcts    = resizeTable._colPct;
      if (!pcts) return;

      // How many % does 1px correspond to in this table?
      const tableW    = resizeTable.getBoundingClientRect().width || 1;
      const deltaPx   = e.clientX - resizeStart;
      const deltaPct  = (deltaPx / tableW) * 100;

      const minPct    = (40 / tableW) * 100;
      const maxDelta  = pcts[nextIdx] - minPct;
      const minDelta  = -(pcts[colIdx] - minPct);
      const clamped   = Math.max(minDelta, Math.min(maxDelta, deltaPct));

      const newLeft   = pcts[colIdx]  + clamped;
      const newRight  = pcts[nextIdx] - clamped;

      allRows(resizeTable).forEach(tr => {
        const cL = tr.children[colIdx];
        const cR = tr.children[nextIdx];
        if (cL) cL.style.width = newLeft.toFixed(4)  + "%";
        if (cR) cR.style.width = newRight.toFixed(4) + "%";
      });
    } else {
      const delta = e.clientY - resizeStart;
      const newH  = Math.max(20, resizeSize0 + delta);
      resizeCell.style.height = newH + "px";
      Array.from(resizeCell.children).forEach(c => {
        c.style.height    = newH + "px";
        c.style.minHeight = newH + "px";
      });
    }
  }

  function onResizeUp() {
    if (resizeTable?._colPct && resizeType === "col") {
      // Commit final % back to _colPct so next drag starts from correct values
      const firstRow = resizeTable.querySelector("tr");
      if (firstRow) {
        resizeTable._colPct = Array.from(firstRow.children).map(c => {
          const w = c.style.width;
          return w.endsWith("%") ? parseFloat(w) : 0;
        });
      }
    }
    document.removeEventListener("mousemove", onResizeMove);
    document.removeEventListener("mouseup",   onResizeUp);
    document.body.style.userSelect = "";
    document.body.style.cursor     = "";
    resizing = false; resizeType = null; resizeCell = null; resizeTable = null;
    resizeNeighbourCell = null; resizeNeighbourSize0 = 0;
    emitChange();
  }

  /* ── delegation: inject handles + grippers on hover ─────────────────── */
  function onMouseOver(e) {
    const cell = e.target.closest("td, th");
    if (!cell) return;
    const t = cell.closest("table");
    if (!t || !editorEl.contains(t)) return;

    // reorder handles
    if (cell.tagName === "TH") ensureColHandle(cell, t);
    const tr = cell.closest("tr");
    if (tr) ensureRowHandle(tr, t);

    // resize grippers (inject into every cell we hover)
    ensureColGripper(cell, t);
    if (tr) ensureRowGripper(tr, t);
  }

  editorEl.addEventListener("mouseover", onMouseOver);
  return () => {
    editorEl.removeEventListener("mouseover", onMouseOver);
    document.removeEventListener("mousemove", onMove);
    document.removeEventListener("mouseup",   onUp);
    document.removeEventListener("mousemove", onResizeMove);
    document.removeEventListener("mouseup",   onResizeUp);
  };
}

/* ─── useToolbarOverflow hook ─────────────────────────────────────────────── */
function useToolbarOverflow(toolbarRef, itemRefs, moreRef) {
  const [hiddenCount, setHiddenCount] = useState(0);

  useLayoutEffect(() => {
    const toolbar = toolbarRef.current;
    if (!toolbar) return;

    function measure() {
      const moreW = (moreRef.current?.offsetWidth || 36) + 4;
      const available = toolbar.offsetWidth - moreW - 4;

      let used = 0;
      let hidden = 0;
      for (let i = 0; i < itemRefs.current.length; i++) {
        const el = itemRefs.current[i];
        if (!el) continue;
        // Temporarily show to measure
        el.style.display = "";
        used += el.offsetWidth + 4;
        if (used > available) {
          hidden = itemRefs.current.length - i;
          break;
        }
      }
      setHiddenCount(hidden);
    }

    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(toolbar);
    return () => ro.disconnect();
  }, []);

  return hiddenCount;
}

/* ─── RichTextArea ────────────────────────────────────────────────────────── */
export function RichTextArea({ id, rows = 4, placeholder, value, onChange }) {
  const editorRef = useRef(null);
  const containerRef = useRef(null);
  const toolbarRef = useRef(null);
  const moreBtnRef = useRef(null);
  const morePortalRef = useRef(null);
  const formatBtnRef = useRef(null);
  const listBtnRef   = useRef(null);
  const tableBtnRef  = useRef(null);
  const formatPortalRef = useRef(null);
  const listPortalRef   = useRef(null);
  const tablePortalRef  = useRef(null);
  const isInternalChange = useRef(false);
  const savedRange = useRef(null);

  const [activeFormats, setActiveFormats] = useState({});
  const [showLinkPopup, setShowLinkPopup] = useState(false);
  const [showTablePopup, setShowTablePopup] = useState(false);
  const [showFormatDropdown, setShowFormatDropdown] = useState(false);
  const [showListDropdown, setShowListDropdown] = useState(false);
  const [showMoreDropdown, setShowMoreDropdown] = useState(false);
  const [isFocused, setIsFocused] = useState(false);

  // Toolbar responsive state
  const [toolbarWidth, setToolbarWidth] = useState(9999);

  useEffect(() => {
    if (!toolbarRef.current) return;
    const ro = new ResizeObserver(entries => {
      setToolbarWidth(entries[0].contentRect.width);
    });
    ro.observe(toolbarRef.current);
    return () => ro.disconnect();
  }, []);

  // Decide which buttons to hide based on width breakpoints
  // Priority: format dropdown always shown, then inline (B/I/U/S), then list, then table, then link+clear
  const hideStrike   = toolbarWidth < 420;
  const hideListFull = toolbarWidth < 360;  // collapse list dropdown label
  const hideTable    = toolbarWidth < 310;
  const hideLinkClear = toolbarWidth < 270;

  // Overflow items (items hidden → go into "more" dropdown)
  const overflowItems = [];
  if (hideStrike)   overflowItems.push({ type: "cmd", cmd: "strikeThrough", label: "Закреслений", icon: <IconStrike />, fmtKey: "strikeThrough" });
  if (hideLinkClear) {
    overflowItems.push({ type: "link" });
    overflowItems.push({ type: "clear" });
  }

  useEffect(() => {
    if (!editorRef.current) return;
    if (!isInternalChange.current && editorRef.current.innerHTML !== value) {
      editorRef.current.innerHTML = value || "";
      editorRef.current.querySelectorAll("table").forEach(t => {
        t.style.width       = "100%";
        t.style.maxWidth    = "100%";
        t.style.tableLayout = "fixed";
      });
    }
    isInternalChange.current = false;
  }, [value]);

  // Init table drag
  useEffect(() => {
    if (!editorRef.current) return;
    const cleanup = initTableDrag(editorRef.current, () => {
      if (!editorRef.current) return;
      isInternalChange.current = true;
      onChange?.({ target: { value: (() => {
        const clone = editorRef.current.cloneNode(true);
        clone.querySelectorAll("[data-rte-handle],[data-rte-gripper]").forEach(el => el.remove());
        return clone.innerHTML;
      })() } });
    });
    return cleanup;
  }, [onChange]);

  // Close dropdowns on outside click
  useEffect(() => {
    const handler = (e) => {
      const inContainer = containerRef.current?.contains(e.target);
      const inPortal =
        formatPortalRef.current?.contains(e.target) ||
        listPortalRef.current?.contains(e.target) ||
        tablePortalRef.current?.contains(e.target) ||
        morePortalRef.current?.contains(e.target);
      if (!inContainer && !inPortal) {
        setShowFormatDropdown(false);
        setShowListDropdown(false);
        setShowTablePopup(false);
        setShowMoreDropdown(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const updateActiveFormats = useCallback(() => {
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

  // Serialize editor HTML without injected drag/resize UI elements
  const getCleanHTML = useCallback(() => {
    if (!editorRef.current) return "";
    const clone = editorRef.current.cloneNode(true);
    clone.querySelectorAll("[data-rte-handle],[data-rte-gripper]").forEach(el => el.remove());
    clone.querySelectorAll("td,th,tr").forEach(el => {
      el.removeAttribute("data-rte-hl");
      el.style.outline = "";
      el.style.outlineOffset = "";
    });
    return clone.innerHTML;
  }, []);

  const emitChange = useCallback(() => {
    if (!editorRef.current) return;
    isInternalChange.current = true;
    onChange?.({ target: { value: getCleanHTML() } });
  }, [onChange, getCleanHTML]);

  const exec = useCallback((cmd, val = null) => {
    const editor = editorRef.current;
    if (!editor) return;
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
    const colPct = (100 / cols).toFixed(4) + "%";
    let html = `<table style="width:100%;max-width:100%;table-layout:fixed;"><thead><tr>`;
    for (let c = 0; c < cols; c++) html += `<th style="width:${colPct}">Заголовок ${c + 1}</th>`;
    html += '</tr></thead><tbody>';
    for (let r = 0; r < rows - 1; r++) {
      html += '<tr>';
      for (let c = 0; c < cols; c++) html += `<td style="width:${colPct}">&nbsp;</td>`;
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
      setShowMoreDropdown(false);
    }
  }, [exec, saveSelection]);

  const handleToolbarAction = useCallback((type, value) => {
    if (type === "cmd") exec(value);
    else if (type === "block") toggleBlock(value);
  }, [exec, toggleBlock]);

  const closeAll = () => {
    setShowFormatDropdown(false);
    setShowListDropdown(false);
    setShowTablePopup(false);
    setShowMoreDropdown(false);
  };

  const isEmpty = !value || value === "<br>" || value === "<p><br></p>" || value === "";

  return (
    <div ref={containerRef} className={`${styles.richEditor} ${isFocused ? styles.richEditorFocused : ""}`}>
      {/* Toolbar */}
      <div ref={toolbarRef} className={styles.toolbar} onMouseDown={e => e.preventDefault()}>

        {/* Format dropdown */}
        <div className={styles.dropdownWrap}>
          <button
            ref={formatBtnRef}
            type="button"
            className={`${styles.tbBtn} ${styles.tbBtnWide} ${showFormatDropdown ? styles.tbBtnActive : ""}`}
            title="Стиль тексту"
            onClick={() => { setShowFormatDropdown(v => !v); setShowListDropdown(false); setShowTablePopup(false); setShowMoreDropdown(false); }}
          >
            <IconFormat />
            <span className={styles.tbBtnLabel}>Формат</span>
            <IconChevronDown />
          </button>
          {showFormatDropdown && (
            <DropdownPortal triggerRef={formatBtnRef} onClose={() => setShowFormatDropdown(false)} portalRef={formatPortalRef}>
              <FormatDropdown
                activeFormats={activeFormats}
                onAction={handleToolbarAction}
                onClose={() => setShowFormatDropdown(false)}
              />
            </DropdownPortal>
          )}
        </div>

        <span className={styles.tbDivider} />

        {/* Inline format buttons */}
        {[
          { cmd: "bold",          icon: <IconBold />,      title: "Жирний (Ctrl+B)",      fmtKey: "bold",          alwaysShow: true },
          { cmd: "italic",        icon: <IconItalic />,    title: "Курсив (Ctrl+I)",       fmtKey: "italic",        alwaysShow: true },
          { cmd: "underline",     icon: <IconUnderline />, title: "Підкреслений (Ctrl+U)", fmtKey: "underline",     alwaysShow: true },
          { cmd: "strikeThrough", icon: <IconStrike />,    title: "Закреслений",           fmtKey: "strikeThrough", alwaysShow: false },
        ].filter(item => item.alwaysShow || !hideStrike).map((item, i) => (
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
            ref={listBtnRef}
            type="button"
            className={`${styles.tbBtn} ${hideListFull ? "" : styles.tbBtnWide} ${showListDropdown ? styles.tbBtnActive : ""}`}
            title="Список"
            onClick={() => { setShowListDropdown(v => !v); setShowFormatDropdown(false); setShowTablePopup(false); setShowMoreDropdown(false); }}
          >
            <IconUL />
            {!hideListFull && <span className={styles.tbBtnLabel}>Список</span>}
            <IconChevronDown />
          </button>
          {showListDropdown && (
            <DropdownPortal triggerRef={listBtnRef} onClose={() => setShowListDropdown(false)} portalRef={listPortalRef}>
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
            </DropdownPortal>
          )}
        </div>

        {/* Table button */}
        {!hideTable && (
          <>
            <span className={styles.tbDivider} />
            <div className={styles.dropdownWrap}>
              <button
                ref={tableBtnRef}
                type="button"
                className={`${styles.tbBtn} ${showTablePopup ? styles.tbBtnActive : ""}`}
                title="Вставити таблицю"
                onClick={() => {
                  saveSelection();
                  setShowTablePopup(v => !v);
                  setShowFormatDropdown(false);
                  setShowListDropdown(false);
                  setShowMoreDropdown(false);
                }}
              >
                <IconTable />
              </button>
              {showTablePopup && (
                <DropdownPortal triggerRef={tableBtnRef} onClose={() => setShowTablePopup(false)} portalRef={tablePortalRef}>
                  <TablePopup
                    onInsert={insertTable}
                    onClose={() => setShowTablePopup(false)}
                  />
                </DropdownPortal>
              )}
            </div>
          </>
        )}

        {/* Link & Clear */}
        {!hideLinkClear && (
          <>
            <span className={styles.tbDivider} />
            <button
              type="button"
              className={`${styles.tbBtn} ${showLinkPopup ? styles.tbBtnActive : ""}`}
              title="Посилання (Ctrl+K)"
              onClick={() => { saveSelection(); setShowLinkPopup(v => !v); }}
            >
              <IconLink />
            </button>
            <button
              type="button"
              className={styles.tbBtn}
              title="Очистити форматування"
              onClick={() => exec("removeFormat")}
            >
              <IconClear />
            </button>
          </>
        )}

        {/* "More" overflow button — shown when anything is hidden */}
        {overflowItems.length > 0 && (
          <>
            <span className={styles.tbDivider} />
            <div className={styles.dropdownWrap}>
              <button
                ref={moreBtnRef}
                type="button"
                className={`${styles.tbBtn} ${showMoreDropdown ? styles.tbBtnActive : ""}`}
                title="Більше"
                onClick={() => { setShowMoreDropdown(v => !v); setShowFormatDropdown(false); setShowListDropdown(false); setShowTablePopup(false); }}
              >
                <IconMore />
              </button>
              {showMoreDropdown && (
                <DropdownPortal triggerRef={moreBtnRef} onClose={() => setShowMoreDropdown(false)} portalRef={morePortalRef}>
                  <OverflowDropdown
                    items={overflowItems}
                    activeFormats={activeFormats}
                    execFn={exec}
                    saveSelectionFn={saveSelection}
                    setShowLinkPopup={setShowLinkPopup}
                    setShowTablePopup={setShowTablePopup}
                    onClose={() => setShowMoreDropdown(false)}
                  />
                </DropdownPortal>
              )}
            </div>
          </>
        )}
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
          onMouseDown={() => closeAll()}
          onInput={(e) => {
            if (editorRef.current) {
              editorRef.current.querySelectorAll("table").forEach(t => {
                t.style.width       = "100%";
                t.style.maxWidth    = "100%";
                t.style.tableLayout = "fixed";
                t.style.boxSizing   = "border-box";
              });
            }
            emitChange(e);
          }}
          onKeyDown={handleKeyDown}
          onKeyUp={updateActiveFormats}
          onMouseUp={updateActiveFormats}
          onFocus={() => {
            setIsFocused(true);
            requestAnimationFrame(updateActiveFormats);
          }}
          onBlur={() => setIsFocused(false)}
          onPaste={(e) => {
            e.preventDefault();
            const html = e.clipboardData.getData("text/html");
            if (html) {
              const tmp = document.createElement("div");
              tmp.innerHTML = html;
              tmp.querySelectorAll("script,style,meta,link,iframe,object,embed").forEach(el => el.remove());
              tmp.querySelectorAll("*").forEach(el => {
                Array.from(el.attributes).forEach(attr => {
                  if (attr.name.startsWith("on") || (attr.name === "style" && attr.value.includes("expression"))) {
                    el.removeAttribute(attr.name);
                  }
                });
              });
              document.execCommand("insertHTML", false, tmp.innerHTML);
            } else {
              const text = e.clipboardData.getData("text/plain");
              document.execCommand("insertText", false, text);
            }
          }}
        />
      </div>
    </div>
  );
}
