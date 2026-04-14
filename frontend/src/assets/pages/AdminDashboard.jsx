import { useEffect, useState } from "react";
import { getProfile } from "../../api";
import React from "react";
import NavBar from "../components/NavBar";
import styles from "../components/styles/admindashboard.module.css";

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
            <div>
                <div className={styles.statscontainer}>
                    <div className={styles.infocard}>
                        <h3 className={styles.infotitle}>Загальна кількість користувачів</h3>
                        <p className={styles.infovalue}>{stats.total_users}</p>
                    </div>
                    <div className={styles.infocard}>
                        <h3 className={styles.infotitle}>Активні користувачі</h3>
                        <p className={styles.infovalue}>{stats.active_users}</p>
                    </div>
                    <div className={styles.infocard}>
                        <h3 className={styles.infotitle}>Нові користувачі</h3>
                        <p className={styles.infovalue}>{stats.new_users}</p>
                    </div>
                </div>
            </div>
        </NavBar>
  );
};


export default Dashboard