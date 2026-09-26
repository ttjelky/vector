import { useState } from "react";
import styles from "../styles/CreateTournamentModal.module.css";

export const FIELD_TYPES = [
  { value: "text", label: "Короткий текст" },
  { value: "textarea", label: "Довгий текст" },
  { value: "number", label: "Число" },
  { value: "date", label: "Дата" },
  { value: "select", label: "Випадаючий список" },
  { value: "radio", label: "Один варіант" },
  { value: "checkbox", label: "Кілька варіантів" },
];

const CHOICE_TYPES = new Set(["select", "radio", "checkbox"]);

export function blankField() {
  return {
    _key: Math.random().toString(36).slice(2),
    label: "",
    field_type: "text",
    required: false,
    options: ["", ""],
    placeholder: "",
  };
}

/**
 * Конструктор кастомної форми реєстрації (як Google Forms).
 * Props: fields, onChange(fields)
 */
export function RegistrationFormBuilder({ fields = [], onChange }) {
  const update = (idx, patch) => {
    const next = fields.map((f, i) => (i === idx ? { ...f, ...patch } : f));
    onChange(next);
  };

  const addField = () => onChange([...fields, blankField()]);
  const removeField = (idx) => onChange(fields.filter((_, i) => i !== idx));
  const move = (idx, dir) => {
    const j = idx + dir;
    if (j < 0 || j >= fields.length) return;
    const next = [...fields];
    [next[idx], next[j]] = [next[j], next[idx]];
    onChange(next);
  };

  const setOption = (idx, oi, val) => {
    const opts = [...(fields[idx].options || [])];
    opts[oi] = val;
    update(idx, { options: opts });
  };
  const addOption = (idx) => update(idx, { options: [...(fields[idx].options || []), ""] });
  const removeOption = (idx, oi) =>
    update(idx, { options: (fields[idx].options || []).filter((_, i) => i !== oi) });

  return (
    <div>
      {fields.length === 0 && (
        <p style={{ fontSize: 13, color: "#888", margin: "4px 0 10px" }}>
          Поки полів немає — учасники приєднуватимуться без додаткових питань.
          Натисніть «+ Додати поле», щоб створити кастомне вікно реєстрації.
        </p>
      )}

      {fields.map((f, idx) => {
        const isChoice = CHOICE_TYPES.has(f.field_type);
        return (
          <div
            key={f._key || idx}
            style={{
              border: "1px solid #e5e5e5",
              borderRadius: 14,
              padding: 12,
              marginBottom: 10,
              background: "#fafafa",
            }}
          >
            <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8 }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: "#888" }}>#{idx + 1}</span>
              <input
                className={styles.input}
                placeholder="Питання, напр. Нікнейм / Вік / Команда…"
                value={f.label}
                onChange={(e) => update(idx, { label: e.target.value })}
                style={{ flex: 1 }}
              />
              <button type="button" className={styles.btnCancel} style={{ padding: "6px 10px" }}
                onClick={() => move(idx, -1)} disabled={idx === 0} title="Вгору">↑</button>
              <button type="button" className={styles.btnCancel} style={{ padding: "6px 10px" }}
                onClick={() => move(idx, 1)} disabled={idx === fields.length - 1} title="Вниз">↓</button>
              <button type="button" className={styles.btnCancel} style={{ padding: "6px 10px" }}
                onClick={() => removeField(idx)} title="Видалити">✕</button>
            </div>

            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
              <select
                className={styles.input}
                value={f.field_type}
                onChange={(e) => {
                  const v = e.target.value;
                  update(idx, {
                    field_type: v,
                    options: CHOICE_TYPES.has(v) ? (f.options?.length ? f.options : ["", ""]) : [],
                  });
                }}
                style={{ maxWidth: 220 }}
              >
                {FIELD_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>

              <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "#444" }}>
                <input
                  type="checkbox"
                  checked={!!f.required}
                  onChange={(e) => update(idx, { required: e.target.checked })}
                />
                Обов'язкове
              </label>

              {!isChoice && (
                <input
                  className={styles.input}
                  placeholder="Підказка (placeholder)"
                  value={f.placeholder || ""}
                  onChange={(e) => update(idx, { placeholder: e.target.value })}
                  style={{ flex: 1, minWidth: 160 }}
                />
              )}
            </div>

            {isChoice && (
              <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 6 }}>
                {(f.options || []).map((opt, oi) => (
                  <div key={oi} style={{ display: "flex", gap: 6, alignItems: "center" }}>
                    <span style={{ fontSize: 12, color: "#999", width: 18 }}>
                      {f.field_type === "checkbox" ? "☐" : f.field_type === "radio" ? "○" : "–"}
                    </span>
                    <input
                      className={styles.input}
                      placeholder={`Варіант ${oi + 1}`}
                      value={opt}
                      onChange={(e) => setOption(idx, oi, e.target.value)}
                      style={{ flex: 1 }}
                    />
                    <button
                      type="button" className={styles.btnCancel}
                      style={{ padding: "6px 10px" }}
                      onClick={() => removeOption(idx, oi)}
                      disabled={(f.options || []).length <= 2}
                    >✕</button>
                  </div>
                ))}
                <button type="button" className={styles.btnCancel}
                  style={{ alignSelf: "flex-start", padding: "6px 12px" }}
                  onClick={() => addOption(idx)}>+ Варіант</button>
              </div>
            )}
          </div>
        );
      })}

      <button type="button" className={styles.btnCancel}
        style={{ padding: "8px 14px" }} onClick={addField}>
        + Додати поле
      </button>
    </div>
  );
}

/**
 * Рендер форми для учасника (Join / Public).
 * Props: fields, values {fieldId: value}, onChange(values), errors {fieldId: msg}
 */
export function RegistrationFormRenderer({ fields = [], values = {}, onChange, errors = {} }) {
  const setVal = (fid, val) => onChange({ ...values, [fid]: val });

  if (!fields.length) return null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 8 }}>
      {fields.map((f) => {
        const err = errors[f.id] || errors[String(f.id)];
        const val = values[f.id] ?? values[String(f.id)] ?? (f.field_type === "checkbox" ? [] : "");
        return (
          <div key={f.id}>
            <label style={{ fontSize: 13, fontWeight: 600, color: "#333", display: "block", marginBottom: 4 }}>
              {f.label} {f.required && <span style={{ color: "#d04d3e" }}>*</span>}
            </label>

            {f.field_type === "textarea" && (
              <textarea
                className={styles.input}
                style={{ minHeight: 80, paddingTop: 10 }}
                placeholder={f.placeholder || ""}
                value={val}
                onChange={(e) => setVal(f.id, e.target.value)}
              />
            )}
            {f.field_type === "number" && (
              <input type="number" className={styles.input}
                placeholder={f.placeholder || ""} value={val}
                onChange={(e) => setVal(f.id, e.target.value)} />
            )}
            {f.field_type === "date" && (
              <input type="date" className={styles.input} value={val}
                onChange={(e) => setVal(f.id, e.target.value)} />
            )}
            {(f.field_type === "text") && (
              <input type="text" className={styles.input}
                placeholder={f.placeholder || ""} value={val}
                onChange={(e) => setVal(f.id, e.target.value)} />
            )}
            {f.field_type === "select" && (
              <select className={styles.input} value={val}
                onChange={(e) => setVal(f.id, e.target.value)}>
                <option value="">— Оберіть —</option>
                {(f.options || []).map((o, i) => (
                  <option key={i} value={o}>{o}</option>
                ))}
              </select>
            )}
            {f.field_type === "radio" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {(f.options || []).map((o, i) => (
                  <label key={i} style={{ fontSize: 13, display: "flex", gap: 8, alignItems: "center" }}>
                    <input type="radio" name={`reg-${f.id}`} checked={val === o}
                      onChange={() => setVal(f.id, o)} /> {o}
                  </label>
                ))}
              </div>
            )}
            {f.field_type === "checkbox" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {(f.options || []).map((o, i) => (
                  <label key={i} style={{ fontSize: 13, display: "flex", gap: 8, alignItems: "center" }}>
                    <input
                      type="checkbox"
                      checked={Array.isArray(val) && val.includes(o)}
                      onChange={(e) => {
                        const arr = Array.isArray(val) ? [...val] : [];
                        if (e.target.checked) setVal(f.id, [...arr, o]);
                        else setVal(f.id, arr.filter((v) => v !== o));
                      }}
                    /> {o}
                  </label>
                ))}
              </div>
            )}

            {err && <p style={{ color: "#d04d3e", fontSize: 12, marginTop: 4 }}>{err}</p>}
          </div>
        );
      })}
    </div>
  );
}
