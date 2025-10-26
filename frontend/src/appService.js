import axios from "axios";

const BACKEND_BASE = process.env.REACT_APP_API_BASE || "http://localhost:5000/api";

// Helper: Decode JWT payload (no verification, just for expiry check)
const decodeToken = (token) => {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload;
  } catch {
    return null;
  }
};

// Helper: Check if token is expired (compares exp to current time)
const isTokenExpired = (token) => {
  const decoded = decodeToken(token);
  if (!decoded || !decoded.exp) return true; // No exp = treat as expired
  return decoded.exp * 1000 < Date.now(); // exp is Unix seconds
};

// Helper: Parse duration string to ms (for expiry calcs, if needed)
const parseDurationToMs = (durationStr) => {
  const units = { s: 1000, m: 60e3, h: 3600e3, d: 86400e3 };
  const match = durationStr.match(/(\d+)([smhd])/i);
  if (!match) return NaN;
  return parseInt(match[1]) * (units[match[2].toLowerCase()] || 1000);
};

const AppService = axios.create({
  baseURL: BACKEND_BASE,
  headers: { "Content-Type": "application/json" },
});

// Global refresh state
let isRefreshing = false;
let refreshSubscribers = [];

// Queue management
const subscribeTokenRefresh = (cb) => refreshSubscribers.push(cb);
const onRefreshed = (token) => {
  refreshSubscribers.forEach((cb) => cb(token));
  refreshSubscribers = [];
};

// Request Interceptor: Attach token + proactive expiry check
AppService.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("accessToken");
    // ✅ Fix: Skip for public auth
    if (config.url.includes('/auth/login') || config.url.includes('/auth/register') || config.url.includes('/auth/refresh')) {
      delete config.headers.Authorization;
      if (process.env.NODE_ENV === "development") {
        console.log("🔓 Skipped token for public:", config.url);
      }
      return config;
    }

    if (token) {
      // 🔍 DEBUG: Log token expiry status before attaching
      const expired = isTokenExpired(token);
      if (process.env.NODE_ENV === "development") {
        console.log("🔑 Token expiry check:", { expired, exp: decodeToken(token)?.exp, now: Date.now() / 1000 });
        console.log("🔑 Attached token to", config.url);
      }
      config.headers.Authorization = `Bearer ${token}`;
    } else {
      if (process.env.NODE_ENV === "development") {
        console.log("⚠️ No token available for protected:", config.url);
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor: Handle auth errors (401 only for refresh)
AppService.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const status = error.response?.status;
    const url = originalRequest?.url || 'unknown';
    const isPublic = url.includes('/auth/login') || url.includes('/auth/register') || url.includes('/auth/refresh');

    if (process.env.NODE_ENV === "development") {
      console.error("❌ Error for", url, "- Status:", status, "- Is Public:", isPublic);
      // 🔍 DEBUG: Log full error response for all errors
      console.error("🔍 Full error details:", {
        status,
        data: error.response?.data,
        headers: error.response?.headers,
        url,
        method: originalRequest?.method,
        payload: originalRequest?.data ? JSON.stringify(originalRequest.data).slice(0, 200) + '...' : 'none',
        isPublic
      });
    }

    // ✅ Fix: ONLY refresh/retry on 401 for NON-PUBLIC routes
    if (status === 401 && !originalRequest._retry && !isPublic) {
      if (process.env.NODE_ENV === "development") {
        console.log("🔄 Token expired/invalid (401) - Refreshing... (protected route only)");
      }

      if (isRefreshing) {
        if (process.env.NODE_ENV === "development") {
          console.log("⏳ Queuing request:", url);
        }
        return new Promise((resolve) => {
          subscribeTokenRefresh((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            if (process.env.NODE_ENV === "development") {
              console.log("🔄 Retrying queued:", url);
            }
            resolve(AppService(originalRequest));
          });
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;
      if (process.env.NODE_ENV === "development") {
        console.log("🔄 Starting refresh...");
      }

      try {
        const refreshToken = localStorage.getItem("refreshToken");
        if (!refreshToken) {
          throw new Error("No refresh token available");
        }

        if (process.env.NODE_ENV === "development") {
          console.log("📤 Refreshing with token preview:", refreshToken.slice(0, 20) + "...");
          // 🔍 DEBUG: Log refresh token expiry
          const refreshDecoded = decodeToken(refreshToken);
          console.log("🔍 Refresh token details:", { exp: refreshDecoded?.exp, expired: isTokenExpired(refreshToken) });
        }

        // Use plain axios to avoid interceptor loop
        const { data } = await axios.post(`${BACKEND_BASE}/auth/refresh`, { refreshToken });

        const newAccessToken = data.accessToken || data.token;
        if (!newAccessToken) {
          throw new Error("No access token in refresh response");
        }

        // Rotate refresh if provided
        if (data.refreshToken) {
          localStorage.setItem("refreshToken", data.refreshToken);
          if (process.env.NODE_ENV === "development") {
            console.log("🔄 Rotated refresh token");
          }
        }

        localStorage.setItem("accessToken", newAccessToken);
        localStorage.setItem("role", decodeToken(newAccessToken)?.role || ""); // Optional: Cache role

        if (process.env.NODE_ENV === "development") {
          console.log("✅ Updated access token preview:", newAccessToken.slice(0, 20) + "...");
          console.log("📢 Notified", refreshSubscribers.length, "queued requests");
        }

        onRefreshed(newAccessToken);

        if (process.env.NODE_ENV === "development") {
          console.log("🔄 Retrying original request:", url);
        }
        return AppService(originalRequest);
      } catch (refreshErr) {
        if (process.env.NODE_ENV === "development") {
          console.error("❌ Refresh failed:", {
            message: refreshErr.message,
            status: refreshErr.response?.status,
            data: refreshErr.response?.data,
          });
        }

        // Clear tokens and redirect to login
        localStorage.removeItem("accessToken");
        localStorage.removeItem("refreshToken");
        localStorage.removeItem("role");
        window.location.href = "/login"; // Or use React Router: navigate('/login')
        return Promise.reject(refreshErr);
      } finally {
        isRefreshing = false;
        if (process.env.NODE_ENV === "development") {
          console.log("🔄 Refresh cycle ended");
        }
      }
    } else if (status === 401 && isPublic) {
      // 🔍 DEBUG: Explicitly log 401 on public routes to confirm no refresh
      if (process.env.NODE_ENV === "development") {
        console.warn("⚠️ 401 on public route (e.g., login) - Likely invalid creds, NOT refreshing:", url, "- Message:", error.response?.data?.message);
      }
    }

    // ✅ New: Handle 403 separately - No retry, custom message
    if (status === 403) {
      const errMsg = error.response?.data?.message || "Access denied - Insufficient permissions";
      if (process.env.NODE_ENV === "development") {
        console.error("🚫 403 Forbidden on", url, "- Role/Permissions issue");
      }
      return Promise.reject({ ...error, message: errMsg });
    }

    // Handle rate limits (optional)
    if (status === 429) {
      if (process.env.NODE_ENV === "development") {
        console.warn("⏱️ Rate limited - Retry in", error.response?.headers?.['retry-after'], "s");
      }
      return Promise.reject({ ...error, message: "Too many requests - Please wait" });
    }

    // Other errors (404, 500, etc.)
    if (process.env.NODE_ENV === "development" && status) {
      console.log("⚠️ Non-auth error - Rejecting:", status, "on", url);
    }
    return Promise.reject(error);
  }
);

export default AppService;