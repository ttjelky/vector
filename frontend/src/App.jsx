import { BrowserRouter, Routes, Route } from "react-router-dom";
import { TabsProvider } from "./TabsContext";

// Pages
import Landing            from "./assets/pages/Landing";
import AdminDashboard     from "./assets/pages/AdminDashboard";
import ParticipantDashboard from "./assets/pages/ParticipantDashboard";
import JuryDashboard      from "./assets/pages/JuryDashboard";
import Help               from "./assets/pages/Help";
import Profile            from "./assets/pages/Profile";
import Settings           from "./assets/pages/Settings";
import Works              from "./assets/pages/Works";
import Tournaments        from "./assets/pages/Tournaments";
import Stats              from "./assets/pages/Stats";
import ResetPassword      from "./assets/pages/ResetPassword";
import TournamentPage     from "./assets/pages/TournamentPage";
import JoinTournamentPage from "./assets/pages/JoinTournamentPage";
import ProtectedRoute     from "./assets/components/ProtectedRoute";

const App = () => (
  <TabsProvider>
    <BrowserRouter>
      <Routes>

        {/* ── Публічні ──────────────────────────────────────────── */}
        <Route path="/"               element={<Landing />} />
        <Route path="/reset-password" element={<ResetPassword />} />

        {/*
          /join/:token — публічний: неавторизований користувач бачить
          сторінку, вводить PIN, потім логіниться всередині компонента.
        */}
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
