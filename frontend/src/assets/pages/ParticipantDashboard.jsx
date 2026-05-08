import React from "react";
import NavBar from "../components/NavBar";
import styles from "../components/styles/admindashboard.module.css";

const placeholders = [
  {
    icon: "🏆",
    title: "Мої досягнення",
    description: "Відзнаки та нагороди за участь у турнірах — у розробці.",
  },
  {
    icon: "📁",
    title: "Мої роботи",
    description: "Швидкий доступ до завантажених та оцінених робіт — у розробці.",
  },
  {
    icon: "📅",
    title: "Розклад",
    description: "Найближчі події та дедлайни турнірів — у розробці.",
  },
  {
    icon: "💬",
    title: "Повідомлення від журі",
    description: "Коментарі та фідбек до ваших робіт — у розробці.",
  },
];

const ParticipantDashboard = () => {
  return (
    <NavBar>
      <div className={styles.contentArea}>
        <div style={{ marginBottom: "2rem" }}>
          <h2 style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: "0.5rem" }}>
            Особистий кабінет учасника
          </h2>
          <p style={{ color: "var(--color-text-muted, #888)", fontSize: "0.95rem" }}>
            Цей розділ зараз у розробці. Нижче — майбутні блоки функціональності.
          </p>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
            gap: "1.25rem",
          }}
        >
          {placeholders.map((item) => (
            <div
              key={item.title}
              style={{
                border: "2px dashed var(--color-border, #d1d5db)",
                borderRadius: "12px",
                padding: "1.5rem",
                display: "flex",
                flexDirection: "column",
                gap: "0.75rem",
                opacity: 0.7,
                background: "var(--color-surface, #f9fafb)",
              }}
            >
              <span style={{ fontSize: "2rem" }}>{item.icon}</span>
              <strong style={{ fontSize: "1rem" }}>{item.title}</strong>
              <p style={{ fontSize: "0.85rem", color: "var(--color-text-muted, #888)", margin: 0 }}>
                {item.description}
              </p>
              <span
                style={{
                  display: "inline-block",
                  marginTop: "auto",
                  fontSize: "0.75rem",
                  fontWeight: 600,
                  color: "var(--color-text-muted, #aaa)",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  border: "1px solid currentColor",
                  borderRadius: "4px",
                  padding: "2px 8px",
                  width: "fit-content",
                }}
              >
                Незабаром
              </span>
            </div>
          ))}
        </div>
      </div>
    </NavBar>
  );
};

export default ParticipantDashboard;
