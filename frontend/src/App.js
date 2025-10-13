// src/App.jsx
import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/authContext";
import Login from "./pages/Login/Login";
import TeacherRoutes from "./pages/Teacher/Route";
import StudentDashboard from "./pages/Student/Dashboard";
import RoutesProtect from "./components/routesProtect";

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Default route */}
          <Route path="/" element={<Navigate to="/login" replace />} />

          <Route path="/login" element={<Login />} />

          <Route
            path="/teacher/*"
            element={
              <RoutesProtect allowedRoles={["teacher", "superadmin"]}>
                <TeacherRoutes />
              </RoutesProtect>
            }
          />

          <Route
            path="/student"
            element={
              <RoutesProtect allowedRoles={["student"]}>
                <StudentDashboard />
              </RoutesProtect>
            }
          />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
