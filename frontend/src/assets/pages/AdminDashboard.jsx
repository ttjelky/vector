import { useEffect, useState } from "react";
import { getProfile } from "../../api";
import React from "react";
import NavBar from "../components/NavBar";
import styles from "../components/styles/admindashboard.module.css";
import CreateTournamentModal from "../components/CreateTournamentModal";

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

    const [open, setOpen] = useState(false);

    return (
        <NavBar>
            <div className={styles.createBtnContainer}>
                <button onClick={() => setOpen(true)} className={styles.createBtn}>
                    + Створити турнір
                </button>
            </div>
            {open && (
            <CreateTournamentModal
                onClose={() => setOpen(false)}
                onSubmit={(data) => {
                console.log(data); // відправляй на Django API
                setOpen(false);
                }}
            />
            )}
        </NavBar>
  );
};


export default Dashboard