// src/App.jsx
import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/authContext";
import Login from "./pages/Login/Login";
import TeacherRoutes from "./pages/Teacher/Route";
import StudentRoutes from "./pages/Student/StudentRoutes";
import SuperadminRoutes from "./pages/Superadmin/Route";
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
              <RoutesProtect allowedRoles={["teacher"]}>
                <TeacherRoutes />
              </RoutesProtect>
            }
          />

          <Route
            path="/student/*"
            element={
              <RoutesProtect allowedRoles={["student"]}>
                <StudentRoutes />
              </RoutesProtect>
            }
          />

          <Route
            path="/superadmin/*"
            element={
              <RoutesProtect allowedRoles={["superadmin"]}>
                <SuperadminRoutes />
              </RoutesProtect>
            }
          />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
