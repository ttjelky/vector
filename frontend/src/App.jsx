import { BrowserRouter, Routes, Route } from "react-router-dom";
import { TabsProvider } from "./TabsContext";
import Landing from "./assets/pages/Landing";
import AdminDashboard from "./assets/pages/AdminDashboard";
import Help from "./assets/pages/Help";
import Profile from "./assets/pages/Profile";
import Settings from "./assets/pages/Settings";
import Works from "./assets/pages/Works";
import Tournaments from "./assets/pages/Tournaments";
import ResetPassword from "./assets/pages/ResetPassword";
import TournamentPage from "./assets/pages/TournamentPage";
import ProtectedRoute from "./assets/components/ProtectedRoute";

const App = () => {
  return (
    <TabsProvider>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />

        <Route 
          path="/admindashboard" element={
            <ProtectedRoute allowedRoles={["admin"]}>
              <AdminDashboard />
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
          path="/help" 
          element={
            <ProtectedRoute>
              <Help />
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
          path="/works" 
          element={
            <ProtectedRoute>
              <Works />
            </ProtectedRoute>
          } 
        />

        <Route 
          path="/tournaments" 
          element={
            <ProtectedRoute>
              <Tournaments />
            </ProtectedRoute>
          } 
        />

        <Route path="/reset-password" element={<ResetPassword />} />
        
      </Routes>
    </BrowserRouter>
  </TabsProvider>
  );
};

export default App;