import { createContext, useContext, useState, useEffect } from "react";
import { fetchProfile } from "../api/profile";

const ProfileContext = createContext();

export const ProfileProvider = ({ children }) => {
    const [profile, setProfile] = useState(null);

    const loadProfile = async () => {
        const data = await fetchProfile();
        setProfile(data);
    };

    useEffect(() => {
        loadProfile();
    }, []);

    return (
        <ProfileContext.Provider value={{ profile, setProfile, loadProfile }}>
            {children}
        </ProfileContext.Provider>
    );
};

export const useProfile = () => useContext(ProfileContext);