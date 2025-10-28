// src/services/authService.js (Refactored: Return full backend response structure for context compatibility, added decodeToken export, enhanced error handling)
import axios from "axios"; // ✅ For plain axios in refresh
import AppService from "../appService";

// Shared helpers
const BACKEND_BASE = process.env.REACT_APP_API_BASE || "http://localhost:5000/api";

export const decodeToken = (token) => {
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

// 🔐 Register (unchanged, uses AppService)
const register = async (payload) => {
  try {
    const { data } = await AppService.post("/auth/register", payload);
    return data;
  } catch (error) {
    console.error("Registration error:", error.response?.data || error.message);
    throw error;
  }
};

// 🔑 Login (Refactored: Return full backend data for context destructuring, store tokens, validate response)
const login = async ({ email, password }) => {
  try {
    const { data } = await AppService.post("/auth/login", { email, password });

    // Validate full response structure
    if (!data.success || !data.accessToken || !data.refreshToken || !data.user) {
      throw new Error("Invalid login response structure");
    }

    const { accessToken, refreshToken, user } = data;

    // Store in localStorage
    localStorage.setItem("accessToken", accessToken);
    localStorage.setItem("refreshToken", refreshToken);
    localStorage.setItem("role", user.role);

    if (process.env.NODE_ENV === "development") {
      console.log("✅ Login: Stored tokens for role", user.role, "- User:", { id: user.id, email: user.email });
    }

    // Return full backend shape for context
    return data; // { success: true, accessToken, refreshToken, user: { id, role, email, name } }
  } catch (error) {
    const errMsg = error.response?.data?.message || error.message || "Login failed";
    console.error("Login error:", { message: errMsg, status: error.response?.status });
    throw new Error(errMsg);
  }
};

// 🚪 Logout (enhanced: Clear all auth-related storage)
const logout = () => {
  localStorage.removeItem("accessToken");
  localStorage.removeItem("refreshToken");
  localStorage.removeItem("role");
  // Clear any other auth state if needed
  window.location.href = "/login";
};

const forgotPassword = async (email) => {
  try {
    if (!email || typeof email !== "string") {
      throw new Error("A valid email is required");
    }

    const { data } = await AppService.post("/auth/forgot-password", { email });
    return data;
  } catch (error) {
    const errMsg = error.response?.data?.message || error.message || "Password reset request failed";
    console.error("Forgot password error:", { message: errMsg, status: error.response?.status });
    throw new Error(errMsg);
  }
};

const resetPassword = async ({ token, password }) => {
  try {
    if (!token) {
      throw new Error("Reset token is required");
    }
    if (!password || typeof password !== "string" || password.length < 8) {
      throw new Error("Password must be at least 8 characters");
    }

    const { data } = await AppService.post(`/auth/reset-password/${token}`, { password });
    return data;
  } catch (error) {
    const errMsg = error.response?.data?.message || error.message || "Password reset failed";
    console.error("Reset password error:", { message: errMsg, status: error.response?.status });
    throw new Error(errMsg);
  }
};

// 🔁 Refresh (refactored: Return full response, handle role sync)
const refreshToken = async () => {
  try {
    const refreshTokenVal = localStorage.getItem("refreshToken");

    if (!refreshTokenVal) {
      throw new Error("No refresh token found");
    }

    // Use plain axios to avoid interceptor loop
    const { data } = await axios.post(`${BACKEND_BASE}/auth/refresh`, { refreshToken: refreshTokenVal });

    if (!data.success || !data.accessToken || !data.refreshToken || !data.user) {
      throw new Error("Invalid refresh response structure");
    }

    const { accessToken, refreshToken: newRefresh, user } = data;

    // Update storage
    localStorage.setItem("accessToken", accessToken);
    localStorage.setItem("refreshToken", newRefresh);
    localStorage.setItem("role", user.role);

    if (process.env.NODE_ENV === "development") {
      console.log("✅ Manual refresh: New token preview", accessToken.slice(0, 20) + "...", "Role:", user.role);
    }

    return data; // Full shape for consistency
  } catch (error) {
    const errMsg = error.response?.data?.message || error.message || "Refresh failed";
    console.error("Manual refresh failed:", { message: errMsg, status: error.response?.status });
    logout();
    throw new Error(errMsg);
  }
};

// Proactive check on app load (refactored: Integrates service refresh, exports decodeToken)
const validateAndRefresh = async () => {
  const accessToken = localStorage.getItem("accessToken");
  if (!accessToken) return false;

  const decoded = decodeToken(accessToken);
  if (!decoded?.exp) return false;

  const expMs = decoded.exp * 1000 - Date.now();
  const bufferMs = parseDurationToMs(process.env.REACT_APP_ACCESS_EXPIRY_BUFFER || "5m");

  if (expMs < bufferMs) {
    if (process.env.NODE_ENV === "development") {
      console.log("🔄 Proactive refresh: Token expiring soon (", Math.round(expMs / 1000), "s left)");
    }
    try {
      await refreshToken();
      return true;
    } catch {
      logout();
      return false;
    }
  }

  return true; // Valid
};

const authService = {
  register,
  login,
  logout,
  refreshToken,
  validateAndRefresh,
  forgotPassword,
  resetPassword,
  decodeToken, // Export for context use
};

export default authService;