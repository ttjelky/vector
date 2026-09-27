import { useState, useLayoutEffect } from "react";

// ─── useDropdownPosition ─────────────────────────────────────────────────────
// Розумне позиціонування випадачок: відкриває там, де є місце на екрані,
// інакше перевертає на протилежний бік; координати завжди в межах в'юпорта.
//
// anchorRef — ref-об'єкт або DOM-елемент якоря (кнопка).
// open      — чи відкрита випадачка.
// side      — бажаний бік: "bottom" | "top" | "left" | "right".
// align     — вирівнювання: "start" | "center" | "end".
// fallbacks — порядок перебору боків (за замовчуванням [протилежний]).
//
// Повертає { panelRef, dropdownStyle, placement }.
// panelRef вішається на панель, dropdownStyle — у style панелі.

const OPPOSITE = { top: "bottom", bottom: "top", left: "right", right: "left" };

const ORIGIN = {
  top: "50% 100%",
  bottom: "50% 0",
  left: "100% 50%",
  right: "0 50%",
};

function resolveAnchor(refOrEl) {
  if (!refOrEl) return null;
  if (refOrEl instanceof Element) return refOrEl;
  return refOrEl.current ?? null;
}

function place(side, ar, w, h, gap, align) {
  let top = 0;
  let left = 0;
  let fits = false;

  if (side === "bottom" || side === "top") {
    top = side === "bottom" ? ar.bottom + gap : ar.top - gap - h;
    if (align === "start")       left = ar.left;
    else if (align === "center") left = ar.left + ar.width / 2 - w / 2;
    else                         left = ar.right - w;
  } else {
    left = side === "right" ? ar.right + gap : ar.left - gap - w;
    if (align === "start")       top = ar.top;
    else if (align === "center") top = ar.top + ar.height / 2 - h / 2;
    else                         top = ar.bottom - h;
  }

  return { top, left, fits };
}

function fitsSide(side, top, left, w, h, vw, vh, margin) {
  if (side === "bottom") return top + h <= vh - margin;
  if (side === "top")    return top >= margin;
  if (side === "right")  return left + w <= vw - margin;
  return left >= margin;
}

export function useDropdownPosition(anchorRef, open, options = {}) {
  const {
    side = "bottom",
    align = "end",
    gap = 10,
    margin = 12,
    fallbacks,
  } = options;

  const [panelNode, setPanelNode] = useState(null);
  const [pos, setPos] = useState({ top: 0, left: 0, placement: side });

  useLayoutEffect(() => {
    if (!open) return;
    const anchor = resolveAnchor(anchorRef);
    if (!anchor || !panelNode) return;

    const compute = () => {
      const ar = anchor.getBoundingClientRect();
      const w = panelNode.offsetWidth;
      const h = panelNode.offsetHeight;
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      if (!w || !h) return;

      const sides = [side, ...(fallbacks ?? [OPPOSITE[side]])];
      let chosen = sides[0];
      let top = 0;
      let left = 0;
      for (const s of sides) {
        const r = place(s, ar, w, h, gap, align);
        top = r.top;
        left = r.left;
        chosen = s;
        if (fitsSide(s, top, left, w, h, vw, vh, margin)) break;
      }

      top = Math.min(Math.max(top, margin), Math.max(margin, vh - margin - h));
      left = Math.min(Math.max(left, margin), Math.max(margin, vw - margin - w));
      setPos({ top, left, placement: chosen });
    };

    compute();
    window.addEventListener("resize", compute);
    window.addEventListener("scroll", compute, true);
    return () => {
      window.removeEventListener("resize", compute);
      window.removeEventListener("scroll", compute, true);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, panelNode, anchorRef, side, align, gap, margin]);

  return {
    panelRef: setPanelNode,
    placement: pos.placement,
    dropdownStyle: {
      position: "fixed",
      top: pos.top,
      left: pos.left,
      margin: 0,
      transformOrigin: ORIGIN[pos.placement] ?? ORIGIN.bottom,
    },
  };
}
