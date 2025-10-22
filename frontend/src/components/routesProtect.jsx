// src/components/ProtectedRoute.js (refactored: Adds loading spinner with inline styles, no MUI)
import React, { useContext } from "react";
import { Navigate } from "react-router-dom";
import { AuthContext } from "../context/authContext";

const RoutesProtect = ({ children, allowedRoles }) => {
  const { token, role, isLoading } = useContext(AuthContext);

  // New: Show loading during auth init (prevents premature API calls)
  if (isLoading) {
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          minHeight: "100vh",
          flexDirection: "column",
        }}
      >
        {/* Simple CSS spinner */}
        <div
          style={{
            border: "4px solid #f3f3f3",
            borderTop: "4px solid #3498db",
            borderRadius: "50%",
            width: "40px",
            height: "40px",
            animation: "spin 1s linear infinite",
          }}
        />
        <p style={{ marginTop: "16px" }}>🔄 Validating session...</p>
      </div>
    );
  }

  // Unchanged: No token → login
  if (!token) {
    return <Navigate to="/login" replace />;
  }

  // Unchanged: Role mismatch → login
  if (allowedRoles && !allowedRoles.includes(role)) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

export default RoutesProtect;