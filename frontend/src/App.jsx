import { useState, useEffect } from "react";
import { BrowserRouter, Routes, Route, useNavigate } from "react-router-dom";
import { TabsProvider }   from '@shared/contexts/TabsContext'
import { SearchProvider } from '@shared/contexts/SearchContext'
import { restoreSession, clearAccessToken, setUserRole } from "./api";
import "@shared/styles/jellyButtons.css";
import "@shared/styles/glassMaterial.css";

// Pages
import { Landing }              from "@pages/Landing";
import { AdminDashboard }       from "@features/dashboard";
import { ParticipantDashboard } from "@features/dashboard";
import { AdminTournaments }     from "@features/tournaments";
import { ParticipantTournaments } from "@features/tournaments";
import { JuryDashboard }        from "@features/jury";
import { Help }                from "@pages/Help";
import { NotFound }            from "@pages/NotFound";
import { Profile }              from "@features/profile";
import { Settings }             from "@features/profile";
import { Works }                from "@features/submissions";
import { Tournaments }          from "@features/tournaments";
import { ResetPassword }        from "@features/auth";
import { TournamentPage }       from "@features/tournaments";
import { JoinTournamentPage }   from "@features/tournaments";
import { ProtectedRoute } from "@shared/components/ProtectedRoute";
import { News }                 from "@features/news";
import { TeamInvitePage }       from "@features/teams";


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

        {/* ── 404 ─────────────────────────────────────────────────── */}
        <Route path="*" element={<NotFound />} />

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
      if (data && !data.networkError) {
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
      } else if (!data || (!data.networkError)) {
        // Refresh cookie немає або протухла — чистимо все
        localStorage.removeItem("userRole");
        localStorage.removeItem("fullUserName");
      }
      // data.networkError — нічого не чіпаємо, лишаємо юзера де він є
      setAuthReady(true);
    });
  }, []);

  if (!authReady) return null;

  return (
    <BrowserRouter>
      <SearchProvider>
        <TabsProvider>
          <AppRoutes />
        </TabsProvider>
      </SearchProvider>
    </BrowserRouter>
  );
};

export { App };
