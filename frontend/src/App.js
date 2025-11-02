// src/App.jsx
import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { Helmet, HelmetProvider } from 'react-helmet-async';
import { AuthProvider } from "./context/authContext";
import Login from "./pages/Login/Login";
import ForgotPassword from "./pages/Password/ForgotPassword";
import ResetPassword from "./pages/Password/ResetPassword";
import TeacherRoutes from "./pages/Teacher/Route";
import StudentRoutes from "./pages/Student/StudentRoutes";
import SuperadminRoutes from "./pages/Superadmin/Route";
import RoutesProtect from "./components/routesProtect";
import favicon from './assets/images/favicon.ico';

function App() {
  return (
    <HelmetProvider>
      <AuthProvider>
        <Helmet>
          <title>Student Information System</title>
          <link rel="icon" type="image/x-icon" href={favicon} />
        </Helmet>
        <Router>
          <Routes>
            {/* Default route */}
            <Route path="/" element={<Navigate to="/login" replace />} />

            <Route path="/login" element={<Login />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />

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

            {/* Optional: 404 fallback */}
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </Router>
      </AuthProvider>
    </HelmetProvider>
  );
}

export default App;