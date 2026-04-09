import { BrowserRouter, Routes, Route } from "react-router-dom";
import Landing from "./assets/pages/Landing";
import AdminDashboard from "./assets/pages/AdminDashboard";
import Help from "./assets/pages/Help";
import Profile from "./assets/pages/Profile";
import Settings from "./assets/pages/Settings";
import Works from "./assets/pages/Works";
import Tournaments from "./assets/pages/Tournaments";
import ResetPassword from "./assets/pages/ResetPassword";
import ProtectedRoute from "./assets/components/ProtectedRoute";

const App = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />

        <Route 
          path="/admin" element={
            <ProtectedRoute allowedRoles={["admin"]}>
              <AdminDashboard />
            </ProtectedRoute>
          }
        />

        <Route 
          path="/AdminDashboard" 
          element={
            <ProtectedRoute>
              <AdminDashboard />
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

  );
};

export default App;