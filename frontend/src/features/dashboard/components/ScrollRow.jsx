import React, { useRef, useState, useEffect, useCallback } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import home from "../styles/dashboardHome.module.css";

const EDGE = 4;

const ScrollRow = ({ children }) => {
  const rowRef = useRef(null);
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(true);

  const updateEdges = useCallback(() => {
    const el = rowRef.current;
    if (!el) return;
    setAtStart(el.scrollLeft <= EDGE);
    setAtEnd(el.scrollLeft + el.clientWidth >= el.scrollWidth - EDGE);
  }, []);

  useEffect(() => {
    updateEdges();
    const el = rowRef.current;
    if (!el) return;
    el.addEventListener("scroll", updateEdges, { passive: true });
    window.addEventListener("resize", updateEdges);
    return () => {
      el.removeEventListener("scroll", updateEdges);
      window.removeEventListener("resize", updateEdges);
    };
  }, [updateEdges, children]);

  const scrollByDir = (dir, e) => {
    const el = rowRef.current;
    if (el) el.scrollBy({ left: dir * el.clientWidth * 0.8, behavior: "smooth" });
    // Прибираємо фокус після кліку мишею, щоб :focus-within
    // не тримав стрілки видимими після відведення курсора
    e?.currentTarget?.blur();
  };

  return (
    <div className={home.rowWrap}>
      <div ref={rowRef} className={home.tournRow}>
        {children}
      </div>
      <button
        type="button"
        className={`${home.rowArrow} ${home.rowArrowLeft} ${atStart ? home.rowArrowHidden : ""}`}
        onClick={(e) => scrollByDir(-1, e)}
        aria-label="Гортати вліво"
        tabIndex={atStart ? -1 : 0}
      >
        <ChevronLeft size={20} strokeWidth={2} />
      </button>
      <button
        type="button"
        className={`${home.rowArrow} ${home.rowArrowRight} ${atEnd ? home.rowArrowHidden : ""}`}
        onClick={(e) => scrollByDir(1, e)}
        aria-label="Гортати вправо"
        tabIndex={atEnd ? -1 : 0}
      >
        <ChevronRight size={20} strokeWidth={2} />
      </button>
    </div>
  );
};

export { ScrollRow };
