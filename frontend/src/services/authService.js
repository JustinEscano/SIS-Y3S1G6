// src/services/authService.js (no changes needed; already refactored)
import axios from "axios";
import AppService from "../appService";

// Shared helpers
const BACKEND_BASE = process.env.REACT_APP_API_BASE || "http://localhost:5000/api";

const decodeToken = (token) => {
  try {
    return JSON.parse(atob(token.split('.')[1]));
  } catch {
    return null;
  }
};

// Helper: Parse duration string to ms (for expiry calcs)
const parseDurationToMs = (durationStr) => {
  const units = { s: 1000, m: 60e3, h: 3600e3, d: 86400e3 };
  const match = durationStr.match(/(\d+)([smhd])/i);
  if (!match) return NaN;
  return parseInt(match[1]) * (units[match[2].toLowerCase()] || 1000);
};

// 🔐 Register
const register = async (payload) => {
  try {
    const { data } = await AppService.post("/auth/register", payload);
    return data;
  } catch (error) {
    console.error("Registration error:", error.response?.data || error.message);
    throw error;
  }
};

// 🔑 Login
const login = async ({ email, password }) => {
  try {
    const { data } = await AppService.post("/auth/login", { email, password });

    // Handle backend variations: { token, refreshToken, role } or { accessToken, ... }
    const accessToken = data.accessToken || data.token;
    const { refreshToken, role } = data;

    if (!accessToken) {
      throw new Error("No access token in response");
    }

    // Store in localStorage
    localStorage.setItem("accessToken", accessToken);
    if (refreshToken) localStorage.setItem("refreshToken", refreshToken);
    if (role) localStorage.setItem("role", role);

    if (process.env.NODE_ENV === "development") {
      console.log("✅ Login: Stored tokens for role", role);
    }

    return { accessToken, refreshToken, role };
  } catch (error) {
    console.error("Login error:", error.response?.data || error.message);
    throw error.response?.data || error;
  }
};

// 🚪 Logout
const logout = () => {
  localStorage.removeItem("accessToken");
  localStorage.removeItem("refreshToken");
  localStorage.removeItem("role");
  window.location.href = "/login";
};

// 🔁 Refresh (manual/proactive use; interceptor handles auto)
const refreshToken = async () => {
  try {
    const refreshToken = localStorage.getItem("refreshToken");
    if (!refreshToken) {
      throw new Error("No refresh token found");
    }

    // Use plain axios to avoid interceptor attaching expired access token
    const { data } = await axios.post(`${BACKEND_BASE}/auth/refresh`, { refreshToken });

    const newAccessToken = data.accessToken || data.token;
    if (!newAccessToken) {
      throw new Error("No access token in response");
    }

    if (data.refreshToken) {
      localStorage.setItem("refreshToken", data.refreshToken);
    }

    localStorage.setItem("accessToken", newAccessToken);

    if (process.env.NODE_ENV === "development") {
      console.log("✅ Manual refresh: New token preview", newAccessToken.slice(0, 20) + "...");
    }

    return newAccessToken;
  } catch (error) {
    console.error("Manual refresh failed:", error.response?.data || error.message);
    logout();
    throw error;
  }
};

// Proactive check on app load (optional export for use in App.js/AuthProvider)
const validateAndRefresh = async () => {
  const accessToken = localStorage.getItem("accessToken");
  if (!accessToken) return false;

  const decoded = decodeToken(accessToken);
  if (!decoded?.exp) return false;

  const expMs = decoded.exp * 1000 - Date.now();
  const bufferMs = parseDurationToMs(process.env.REACT_APP_ACCESS_EXPIRY || "5m"); // Env or default buffer

  if (expMs < bufferMs) {
    if (process.env.NODE_ENV === "development") {
      console.log("🔄 Proactive refresh: Token expiring soon (", Math.round(expMs / 1000), "s left)");
    }
    await refreshToken();
    return true;
  }

  return true; // Valid
};

const authService = {
  register,
  login,
  logout,
  refreshToken,
  validateAndRefresh, // New: For on-load checks
};

export default authService;