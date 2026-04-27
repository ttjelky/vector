import React, { useEffect, useState } from "react";
import API from "../../api";
import NavBar from "../components/NavBar";
import styles from "../components/styles/admindashboard.module.css";

const Stats = () => {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    API.get("/dashboard/")
      .then((res) => setStats(res.data))
      .catch((err) => console.error("Помилка завантаження статистики:", err));
  }, []);

  return (
    <NavBar>
      <div className={styles.contentArea}>
        <h2 style={{ fontFamily: "Google Sans, sans-serif", marginBottom: 24 }}>
          Статистика
        </h2>
        {stats ? (
          <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
            <StatCard label="Всього користувачів" value={stats.total_users} />
            <StatCard label="Активних"             value={stats.active_users} />
            <StatCard label="Нових цього місяця"   value={stats.new_users} />
          </div>
        ) : (
          <p style={{ color: "#888" }}>Завантаження...</p>
        )}
      </div>
    </NavBar>
  );
};

const StatCard = ({ label, value }) => (
  <div
    style={{
      minWidth: 180,
      padding: "24px 28px",
      border: "0.5px solid rgba(0,0,0,0.1)",
      borderRadius: 20,
      fontFamily: "Google Sans, sans-serif",
      background: "#fff",
    }}
  >
    <p style={{ fontSize: 13, color: "#888", marginBottom: 8 }}>{label}</p>
    <p style={{ fontSize: 36, fontWeight: 700, color: "#111" }}>{value ?? "—"}</p>
  </div>
);

export default Stats;
