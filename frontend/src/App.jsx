import { BrowserRouter, Routes, Route } from "react-router-dom";
import Landing from "./assets/pages/Landing";
import Dashboard from "./assets/pages/Dashboard";
import ProtectedRoute from "./assets/components/ProtectedRoute";

const App = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route 
          path="/dashboard" 
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          } 
        />
      </Routes>
    </BrowserRouter>

  );
};

export default App;