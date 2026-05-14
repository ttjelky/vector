import React from "react";
import AdminTournaments from "./AdminTournaments";
import ParticipantTournaments from "./ParticipantTournaments";

const Tournaments = () => {
  const role = localStorage.getItem("userRole") ?? "participant";

  if (role === "admin") return <AdminTournaments />;
  if (role === "participant") return <ParticipantTournaments />;

  return <ParticipantTournaments />;
};

export default Tournaments;
