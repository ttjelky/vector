
import { useState, useCallback } from "react";

// Дефолтний набір критеріїв для нового турніру
export const DEFAULT_CRITERIA = [
  { key: "originality",  label: "Оригінальність",    max_score: 10, group: "", hint: "Наскільки ідея є унікальною та нестандартною", order: 0 },
  { key: "execution",    label: "Виконання",          max_score: 10, group: "", hint: "Якість реалізації та технічний рівень",         order: 1 },
  { key: "presentation", label: "Презентація",        max_score: 10, group: "", hint: "Ясність викладу, оформлення роботи",            order: 2 },
];

// ─── CriteriaEditor ──────────────────────────────────────────────────────────

export function CriteriaEditor({ criteria, onChange, styles }) {
  const [expandedIdx, setExpandedIdx] = useState(null);

  const update = useCallback((idx, field, value) => {
    onChange(prev => {
      const next = [...prev];
      next[idx] = { ...next[idx], [field]: value };
      return next;
    });
  }, [onChange]);

  const addCriterion = () => {
    const order = criteria.length;
    onChange(prev => [
      ...prev,
      { key: "", label: "", max_score: 10, group: "", hint: "", order },
    ]);
    setExpandedIdx(criteria.length);
  };

  const remove = (idx) => {
    onChange(prev => prev.filter((_, i) => i !== idx).map((c, i) => ({ ...c, order: i })));
    setExpandedIdx(null);
  };

  const moveUp = (idx) => {
    if (idx === 0) return;
    onChange(prev => {
      const next = [...prev];
      [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]];
      return next.map((c, i) => ({ ...c, order: i }));
    });
  };

  const moveDown = (idx) => {
    if (idx === criteria.length - 1) return;
    onChange(prev => {
      const next = [...prev];
      [next[idx], next[idx + 1]] = [next[idx + 1], next[idx]];
      return next.map((c, i) => ({ ...c, order: i }));
    });
  };

  const maxTotal = criteria.reduce((a, c) => a + (Number(c.max_score) || 0), 0);

  return (
    <div className={styles.criteriaEditor}>
      {/* Header row */}
      <div className={styles.criteriaEditorHeader}>
        <span className={styles.criteriaEditorNote}>
          Максимальний загальний бал: <strong>{maxTotal}</strong>
        </span>
      </div>

      {criteria.length === 0 && (
        <p className={styles.criteriaEditorEmpty}>
          Критерії не додані — журі буде використовувати дефолтний критерій «Загальна оцінка» (макс. 10).
        </p>
      )}

      <div className={styles.criteriaList}>
        {criteria.map((c, idx) => {
          const isOpen = expandedIdx === idx;
          return (
            <div
              key={idx}
              className={`${styles.criterionRow} ${isOpen ? styles.criterionRowOpen : ""}`}
            >
              {/* ── Collapsed header ── */}
              <div
                className={styles.criterionHeader}
                onClick={() => setExpandedIdx(isOpen ? null : idx)}
              >
                <span className={styles.criterionDragHandle}>
                  {/* order arrows */}
                  <button
                    type="button"
                    className={styles.criterionOrderBtn}
                    onClick={(e) => { e.stopPropagation(); moveUp(idx); }}
                    disabled={idx === 0}
                    title="Вище"
                  >
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="m18 15-6-6-6 6"/>
                    </svg>
                  </button>
                  <button
                    type="button"
                    className={styles.criterionOrderBtn}
                    onClick={(e) => { e.stopPropagation(); moveDown(idx); }}
                    disabled={idx === criteria.length - 1}
                    title="Нижче"
                  >
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="m6 9 6 6 6-6"/>
                    </svg>
                  </button>
                </span>

                <span className={styles.criterionLabel}>
                  {c.label || <em className={styles.criterionLabelEmpty}>Без назви</em>}
                </span>

                <span className={styles.criterionMaxBadge}>
                  макс. {c.max_score || 0}
                </span>

                <span className={styles.criterionToggle}>
                  <svg
                    width="12" height="12" viewBox="0 0 24 24" fill="none"
                    stroke="currentColor" strokeWidth="2.5"
                    style={{ transform: isOpen ? "rotate(180deg)" : "none", transition: "transform .2s" }}
                  >
                    <path d="m6 9 6 6 6-6"/>
                  </svg>
                </span>
              </div>

              {/* ── Expanded body ── */}
              {isOpen && (
                <div className={styles.criterionBody}>
                  <div className={styles.criterionFields}>
                    {/* Label */}
                    <div className={styles.criterionField}>
                      <label className={styles.criterionFieldLabel}>
                        Назва <span className={styles.editRequired}>*</span>
                      </label>
                      <input
                        type="text"
                        className={styles.input}
                        placeholder="Напр.: Оригінальність"
                        value={c.label}
                        maxLength={200}
                        onChange={(e) => update(idx, "label", e.target.value)}
                      />
                    </div>

                    {/* max_score */}
                    <div className={styles.criterionField} style={{ maxWidth: 120 }}>
                      <label className={styles.criterionFieldLabel}>Макс. бал</label>
                      <input
                        type="number"
                        className={styles.input}
                        min={1} max={1000}
                        value={c.max_score}
                        onChange={(e) => update(idx, "max_score", Math.max(1, Number(e.target.value)))}
                      />
                    </div>
                  </div>

                  <div className={styles.criterionFields}>
                    {/* Group */}
                    <div className={styles.criterionField}>
                      <label className={styles.criterionFieldLabel}>
                        Група <span className={styles.optional}>необов'язково</span>
                      </label>
                      <input
                        type="text"
                        className={styles.input}
                        placeholder="Напр.: Технічна частина"
                        value={c.group}
                        maxLength={100}
                        onChange={(e) => update(idx, "group", e.target.value)}
                      />
                    </div>
                  </div>

                  {/* Hint */}
                  <div className={styles.criterionField}>
                    <label className={styles.criterionFieldLabel}>
                      Підказка для журі <span className={styles.optional}>необов'язково</span>
                    </label>
                    <input
                      type="text"
                      className={styles.input}
                      placeholder="Напр.: Наскільки ідея є унікальною"
                      value={c.hint}
                      maxLength={300}
                      onChange={(e) => update(idx, "hint", e.target.value)}
                    />
                  </div>

                  {/* Delete */}
                  <button
                    type="button"
                    className={styles.criterionRemoveBtn}
                    onClick={() => remove(idx)}
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="3 6 5 6 21 6"/><path d="m19 6-.867 14.142A2 2 0 0 1 16.138 22H7.862a2 2 0 0 1-1.995-1.858L5 6m5 0V4a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v2"/>
                    </svg>
                    Видалити критерій
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <button
        type="button"
        className={styles.criteriaAddBtn}
        onClick={addCriterion}
      >
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
        </svg>
        Додати критерій
      </button>
    </div>
  );
}
