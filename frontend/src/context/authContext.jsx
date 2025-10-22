// src/context/authContext.jsx (refactored: Adds proactive refresh, loading, retry-friendly)
import React, { createContext, useState, useContext, useEffect } from "react";
import { jwtDecode } from "jwt-decode"; // Keep for decoding (fallback to native if preferred)
import authService from "../services/authService"; // Import for validateAndRefresh

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(localStorage.getItem("accessToken"));
  const [role, setRole] = useState(localStorage.getItem("role"));
  const [isLoading, setIsLoading] = useState(true); // New: Block UI during init

  // Login: Store tokens (unchanged, but now supports refreshToken via authService)
  const login = (newToken, newRole, refreshToken) => { // Optional refreshToken param
    setToken(newToken);
    setRole(newRole);
    localStorage.setItem("accessToken", newToken);
    localStorage.setItem("role", newRole);
    if (refreshToken) localStorage.setItem("refreshToken", refreshToken); // Handle if provided
    if (process.env.NODE_ENV === "development") {
      console.log("✅ Login: Stored tokens for role", newRole);
    }
  };

  // Logout: Clear all (unchanged)
  const logout = () => {
    setToken(null);
    setRole(null);
    setIsLoading(false); // Ensure no loading loop
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    localStorage.removeItem("role");
    window.location.href = "/login";
  };

  // Init: Proactive validate/refresh on mount (handles refreshToken too)
  useEffect(() => {
    const initAuth = async () => {
      if (!token) {
        setIsLoading(false);
        return;
      }

      try {
        // Decode & check expiry (your old logic)
        const decoded = jwtDecode(token);
        if (decoded.exp * 1000 < Date.now()) {
          if (process.env.NODE_ENV === "development") {
            console.log("🔄 Access token expired - Attempting refresh...");
          }
          // New: Use authService for proactive refresh (tries refreshToken)
          const refreshed = await authService.validateAndRefresh();
          if (!refreshed) {
            logout();
            return;
          }
          // Re-decode post-refresh
          const newDecoded = jwtDecode(localStorage.getItem("accessToken"));
          if (newDecoded.exp * 1000 < Date.now()) {
            logout();
            return;
          }
        }
        // Sync role if valid
        setRole(localStorage.getItem("role") || null);
      } catch (error) {
        console.error("Auth decode failed:", error);
        logout();
      } finally {
        setIsLoading(false);
      }
    };

    initAuth();
  }, [token]); // Keep dep on token for changes

  const value = {
    token,
    role,
    isLoading, // New: Expose for RoutesProtect
    login,
    logout,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

// Custom hook (unchanged)
export const useAuth = () => useContext(AuthContext);