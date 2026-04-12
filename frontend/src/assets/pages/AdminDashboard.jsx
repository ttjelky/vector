import { useEffect, useState } from "react";
import { getProfile } from "../../api";
import React from "react";
import NavBar from "../components/NavBar";

const Dashboard = () => {
    const [stats, setStats] = useState({
        total_users: 0,
        active_users: 0,
        new_users: 0,
    });

    useEffect(() => {
        getProfile()
            .then(res => console.log(res.data))
            .catch(err => console.error(err)); 
    }, []);

    return (
        <NavBar>
        <div style={styles.dashboard}>
        <div style={styles.card}>
            <h3 style={styles.title}>Загальна кількість користувачів</h3>
            <p style={styles.value}>{stats.total_users}</p>
        </div>
        <div style={styles.card}>
            <h3 style={styles.title}>Активні користувачі</h3>
            <p style={styles.value}>{stats.active_users}</p>
        </div>
        <div style={styles.card}>
            <h3 style={styles.title}>Нові користувачі</h3>
            <p style={styles.value}>{stats.new_users}</p>
        </div>
        </div>
        </NavBar>
  );
};

const styles = {
    dashboard: {
        display: "flex",
        gap: "20px",
        justifyContent: "center",
        marginTop: "40px",
        fontFamily: "'Arial', sans-serif",
        backgroundColor: "#f8f8f8",
        padding: "20px",
        borderRadius: "12px",
    },
    card: {
        backgroundColor: "#fff",
        color: "#111",
        padding: "30px",
        borderRadius: "10px",
        textAlign: "center",
        minWidth: "150px",
        boxShadow: "0 4px 10px rgba(0,0,0,0.1)",
        border: "1px solid #e0e0e0",
    },
    title: {
        fontSize: "16px",
        marginBottom: "10px",
        textTransform: "uppercase",
        color: "#333",
    },
    value: {
        fontSize: "28px",
        fontWeight: "bold",
    },
};

export default Dashboard