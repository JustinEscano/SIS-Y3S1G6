// src/context/authContext.jsx (Fixed: Added token state for ProtectedRoute sync, restored in init)
import React, { createContext, useState, useContext, useEffect } from "react";
import authService from "../services/authService";

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem("accessToken") || null);  // NEW: Token state from storage
  const [role, setRole] = useState(localStorage.getItem("role") || null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Refactored Login: Centralized - Calls service, stores via service, updates state from response
  const login = async (credentials) => {
    try {
      setIsLoading(true);
      setError(null);

      // Validate creds early
      if (!credentials?.email || !credentials?.password) {
        throw new Error("Email and password are required");
      }

      const response = await authService.login(credentials);
      const { accessToken, refreshToken, user: userData } = response;

      if (!accessToken || !refreshToken || !userData?.role) {
        throw new Error("Login succeeded but missing tokens or role");
      }

      // Service should store tokens; here update state
      const { id, role: loginRole, email, name } = userData;
      setUser({ id, role: loginRole, email, name });
      setRole(loginRole);
      setToken(accessToken);  // NEW: Sync token to state

      if (process.env.NODE_ENV === "development") {
        console.log("✅ AuthContext: Login success - User", { id, role: loginRole, email });
      }

      return { success: true, role: loginRole, user: userData };
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Login failed';
      setError(msg);
      if (process.env.NODE_ENV === "development") {
        console.error("❌ AuthContext login error:", { message: msg, fullErr: err });
      }
      throw new Error(msg); // Re-throw for component handling
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    authService.logout();
    setUser(null);
    setToken(null);  // NEW: Clear token state
    setRole(null);
    setError(null);
    setIsLoading(false);
    // Optional: Redirect via navigate if passed as prop
  };

  // Init useEffect: Restore from localStorage on mount
  useEffect(() => {
    const initAuth = async () => {
      try {
        const storedToken = localStorage.getItem("accessToken");
        const storedRole = localStorage.getItem("role");
        if (storedToken && storedRole) {
          // Optional: Validate token via service.refresh() or decode
          const decoded = authService.decodeToken(storedToken); // Assume service has helper
          if (decoded?.role === storedRole) {
            setToken(storedToken);  // NEW: Restore token to state
            setRole(storedRole);
            setUser({ id: decoded.id, role: storedRole });
            if (process.env.NODE_ENV === "development") {
              console.log("✅ AuthContext: Restored session", { role: storedRole, token: 'present' });
            }
          } else {
            authService.logout();
            setToken(null);
          }
        }
      } catch (err) {
        console.error("❌ AuthContext init error:", err);
        authService.logout();
        setToken(null);
      } finally {
        setIsLoading(false);
      }
    };
    initAuth();
  }, []);

  const value = { user, token, role, isLoading, error, login, logout };  // UPDATED: +token

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);