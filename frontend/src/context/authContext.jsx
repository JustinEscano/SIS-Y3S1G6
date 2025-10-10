// src/context/authContext.jsx
import React, { createContext, useState, useContext, useEffect } from "react";
import { jwtDecode } from "jwt-decode";

export const AuthContext = createContext(); // ✅ create context

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(localStorage.getItem("accessToken"));
  const [role, setRole] = useState(localStorage.getItem("role"));

  const login = (newToken, newRole) => {
    setToken(newToken);
    setRole(newRole);
    localStorage.setItem("accessToken", newToken);
    localStorage.setItem("role", newRole);
  };

  const logout = () => {
    setToken(null);
    setRole(null);
    localStorage.removeItem("accessToken");
    localStorage.removeItem("role");
    window.location.href = "/login";
  };

  useEffect(() => {
    if (token) {
      try {
        const decoded = jwtDecode(token);
        if (decoded.exp * 1000 < Date.now()) logout();
      } catch {
        logout();
      }
    }
  }, [token]);

  return (
    <AuthContext.Provider value={{ token, role, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

// Custom hook
export const useAuth = () => useContext(AuthContext); // ✅ hook
