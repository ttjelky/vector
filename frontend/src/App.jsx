import { useState, useEffect } from "react";
import { BrowserRouter, Routes, Route, useNavigate } from "react-router-dom";
import { TabsProvider } from "./TabsContext";
import { restoreSession, clearAccessToken, setUserRole } from "./api";

// Pages
import Landing              from "./assets/pages/Landing";
import AdminDashboard       from "./assets/pages/AdminDashboard";
import ParticipantDashboard from "./assets/pages/ParticipantDashboard";
import AdminTournaments     from "./assets/pages/AdminTournaments";
import ParticipantTournaments from "./assets/pages/ParticipantTournaments";
import JuryDashboard        from "./assets/pages/JuryDashboard";
import Help                 from "./assets/pages/Help";
import Profile              from "./assets/pages/Profile";
import Settings             from "./assets/pages/Settings";
import Works                from "./assets/pages/Works";
import Tournaments          from "./assets/pages/Tournaments";
import ResetPassword        from "./assets/pages/ResetPassword";
import TournamentPage       from "./assets/pages/TournamentPage";
import JoinTournamentPage   from "./assets/pages/JoinTournamentPage";
import ProtectedRoute       from "./assets/components/ProtectedRoute";
import News                 from "./assets/pages/News";
import TeamInvitePage       from "./assets/pages/TeamInvitePage";


// ── AuthExpiredHandler ────────────────────────────────────────────────────────
function AuthExpiredHandler() {
  const navigate = useNavigate();

  useEffect(() => {
    const handler = () => {
      clearAccessToken(); // також очищає _userRole всередині
      localStorage.removeItem("userRole");
      localStorage.removeItem("fullUserName");
      localStorage.removeItem("userId");
      window.dispatchEvent(new Event("auth-changed"));
      navigate("/");
    };

    window.addEventListener("auth-expired", handler);
    return () => window.removeEventListener("auth-expired", handler);
  }, [navigate]);

  return null;
}


// ── AppRoutes ─────────────────────────────────────────────────────────────────
function AppRoutes() {
  return (
    <>
      <AuthExpiredHandler />
      <Routes>

        {/* ── Публічні ──────────────────────────────────────────── */}
        <Route path="/"               element={<Landing />} />
        <Route path="/login"          element={<Landing />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/join/:token"         element={<JoinTournamentPage />} />
        <Route path="/team-invite/:token"  element={<TeamInvitePage />} />
        <Route path="/team-invite/:token/" element={<TeamInvitePage />} />

        {/* ── Адмін ─────────────────────────────────────────────── */}
        <Route path="/admindashboard" element={
          <ProtectedRoute allowedRoles={["admin"]}><AdminDashboard /></ProtectedRoute>
        } />
        <Route path="/admin/tournaments" element={
          <ProtectedRoute allowedRoles={["admin"]}><AdminTournaments /></ProtectedRoute>
        } />

        {/* ── Журі ──────────────────────────────────────────────── */}
        <Route path="/jury" element={
          <ProtectedRoute allowedRoles={["jury"]}><JuryDashboard /></ProtectedRoute>
        } />

        {/* ── Учасник ───────────────────────────────────────────── */}
        <Route path="/dashboard" element={
          <ProtectedRoute allowedRoles={["participant"]}><ParticipantDashboard /></ProtectedRoute>
        } />
        <Route path="/participant/tournaments" element={
          <ProtectedRoute allowedRoles={["participant"]}><ParticipantTournaments /></ProtectedRoute>
        } />
        <Route path="/news" element={
          <ProtectedRoute allowedRoles={["participant"]}><News /></ProtectedRoute>
        } />

        {/* ── Спільні ───────────────────────────────────────────── */}
        <Route path="/tournaments"    element={<ProtectedRoute><Tournaments /></ProtectedRoute>} />
        <Route path="/tournament/:id" element={<ProtectedRoute><TournamentPage /></ProtectedRoute>} />
        <Route path="/works"          element={<ProtectedRoute><Works /></ProtectedRoute>} />
        <Route path="/profile"        element={<ProtectedRoute><Profile /></ProtectedRoute>} />
        <Route path="/settings"       element={<ProtectedRoute><Settings /></ProtectedRoute>} />
        <Route path="/help"           element={<ProtectedRoute><Help /></ProtectedRoute>} />

      </Routes>
    </>
  );
}


// ── App ───────────────────────────────────────────────────────────────────────
const App = () => {
  const [authReady, setAuthReady] = useState(false);

  useEffect(() => {
    // ── Прибираємо legacy-ключі старого коду ─────────────────────────────
    localStorage.removeItem("role");
    localStorage.removeItem("userName");
    localStorage.removeItem("userId");

    restoreSession().then((data) => {
      if (data) {
        // Роль — в пам'яті (захищено)
        if (data.role) setUserRole(data.role);

        // Не-чутливі UI-дані — можна в localStorage
        if (data.role)       localStorage.setItem("userRole", data.role);
        if (data.first_name) {
          localStorage.setItem(
            "fullUserName",
            `${data.first_name} ${data.last_name || ""}`.trim()
          );
        }
      } else {
        // Refresh cookie немає або протухла — чистимо все
        localStorage.removeItem("userRole");
        localStorage.removeItem("fullUserName");
      }
      setAuthReady(true);
    });
  }, []);

  if (!authReady) return null;

  return (
    <TabsProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </TabsProvider>
  );
};

export default App;
