import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { TabsProvider } from "./TabsContext";
import { useEffect, useState } from "react";

// Pages
import Landing              from "./assets/pages/Landing";
import AdminDashboard       from "./assets/pages/AdminDashboard";
import ParticipantDashboard from "./assets/pages/ParticipantDashboard";
import JuryDashboard        from "./assets/pages/JuryDashboard";
import Help                 from "./assets/pages/Help";
import Profile              from "./assets/pages/Profile";
import Settings             from "./assets/pages/Settings";
import Works                from "./assets/pages/Works";
import Tournaments          from "./assets/pages/Tournaments";
import Stats                from "./assets/pages/Stats";
import ResetPassword        from "./assets/pages/ResetPassword";
import TournamentPage       from "./assets/pages/TournamentPage";
import JoinTournamentPage   from "./assets/pages/JoinTournamentPage";
import ProtectedRoute       from "./assets/components/ProtectedRoute";

// ── Теплий оверлей — вішається поверх всього крім лендінгу ───────────────────
const WarmOverlay = () => {
  const location = useLocation();
  const [warmMode, setWarmMode] = useState(
    () => JSON.parse(localStorage.getItem("setting_warm") ?? "false")
  );

  useEffect(() => {
    const handler = () => {
      setWarmMode(JSON.parse(localStorage.getItem("setting_warm") ?? "false"));
    };
    window.addEventListener("storage", handler);
    window.addEventListener("settings-updated", handler);
    return () => {
      window.removeEventListener("storage", handler);
      window.removeEventListener("settings-updated", handler);
    };
  }, []);

  // Лендінг — не чіпаємо
  if (location.pathname === "/" || !warmMode) return null;

  return (
    <div style={{
      position: "fixed",
      inset: 0,
      pointerEvents: "none",
      zIndex: 9998,
      background: "rgba(255, 140, 30, 0.13)",
      mixBlendMode: "multiply",
    }} />
  );
};
// ─────────────────────────────────────────────────────────────────────────────

const App = () => (
  <TabsProvider>
    <BrowserRouter>
      <WarmOverlay />
      <Routes>

        {/* ── Публічні ──────────────────────────────────────────── */}
        <Route path="/"               element={<Landing />} />
        <Route path="/reset-password" element={<ResetPassword />} />

        <Route path="/join/:token" element={<JoinTournamentPage />} />

        {/* ── Адмін ─────────────────────────────────────────────── */}
        <Route
          path="/admindashboard"
          element={
            <ProtectedRoute allowedRoles={["admin"]}>
              <AdminDashboard />
            </ProtectedRoute>
          }
        />

        <Route
          path="/stats"
          element={
            <ProtectedRoute allowedRoles={["admin"]}>
              <Stats />
            </ProtectedRoute>
          }
        />

        {/* ── Журі ──────────────────────────────────────────────── */}
        <Route
          path="/jury"
          element={
            <ProtectedRoute allowedRoles={["jury"]}>
              <JuryDashboard />
            </ProtectedRoute>
          }
        />

        {/* ── Учасник ───────────────────────────────────────────── */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute allowedRoles={["participant"]}>
              <ParticipantDashboard />
            </ProtectedRoute>
          }
        />

        {/* ── Спільні (будь-яка авторизована роль) ──────────────── */}
        <Route
          path="/tournaments"
          element={
            <ProtectedRoute>
              <Tournaments />
            </ProtectedRoute>
          }
        />

        <Route
          path="/tournament/:id"
          element={
            <ProtectedRoute>
              <TournamentPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/works"
          element={
            <ProtectedRoute>
              <Works />
            </ProtectedRoute>
          }
        />

        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <Profile />
            </ProtectedRoute>
          }
        />

        <Route
          path="/settings"
          element={
            <ProtectedRoute>
              <Settings />
            </ProtectedRoute>
          }
        />

        <Route
          path="/help"
          element={
            <ProtectedRoute>
              <Help />
            </ProtectedRoute>
          }
        />

      </Routes>
    </BrowserRouter>
  </TabsProvider>
);

export default App;