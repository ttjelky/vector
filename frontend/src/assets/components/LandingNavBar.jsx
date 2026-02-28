import React from "react";
import logo from "./static/VectorLogo.svg";

const LandingNavBar = () => {
    return (
        <nav className="landing-nav-bar">
        <a className="landingNavLogo" href="/">
        <img src={logo} alt="Logo" />
        </a>

    
        </nav>
    );
}

export default LandingNavBar;