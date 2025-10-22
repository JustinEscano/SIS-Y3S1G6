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

// Helper: Parse duration string to ms (for expiry calcs)
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

// Request Interceptor: Attach token
AppService.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("accessToken");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
      // Optional: Log only in dev
      if (process.env.NODE_ENV === "development") {
        console.log("🔑 Attached token to", config.url);
      }
    } else if (process.env.NODE_ENV === "development") {
      console.warn("⚠️ No token for", config.url);
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor: Handle auth errors with refresh
AppService.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const status = error.response?.status;

    if (process.env.NODE_ENV === "development") {
      console.error("❌ Error for", originalRequest?.url, "- Status:", status);
    }

    if ((status === 401 || status === 403) && !originalRequest._retry) {
      if (process.env.NODE_ENV === "development") {
        console.log("🔄 Token error (", status, ") - Refreshing...");
      }

      if (isRefreshing) {
        if (process.env.NODE_ENV === "development") {
          console.log("⏳ Queuing request:", originalRequest.url);
        }
        return new Promise((resolve) => {
          subscribeTokenRefresh((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            if (process.env.NODE_ENV === "development") {
              console.log("🔄 Retrying queued:", originalRequest.url);
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
          throw new Error("No refresh token");
        }

        if (process.env.NODE_ENV === "development") {
          console.log("📤 Refreshing with token preview:", refreshToken.slice(0, 20) + "...");
        }

        // Use plain axios to avoid attaching expired access token
        const { data } = await axios.post(`${BACKEND_BASE}/auth/refresh`, { refreshToken });

        const newAccessToken = data.accessToken || data.token;
        if (!newAccessToken) {
          throw new Error("No access token in response");
        }

        if (data.refreshToken) {
          localStorage.setItem("refreshToken", data.refreshToken);
          if (process.env.NODE_ENV === "development") {
            console.log("🔄 Rotated refresh token");
          }
        }

        localStorage.setItem("accessToken", newAccessToken);
        if (process.env.NODE_ENV === "development") {
          console.log("✅ Updated access token preview:", newAccessToken.slice(0, 20) + "...");
          console.log("📢 Notified", refreshSubscribers.length, "queued requests");
        }

        onRefreshed(newAccessToken);

        if (process.env.NODE_ENV === "development") {
          console.log("🔄 Retrying:", originalRequest.url);
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

        // Clear tokens and logout
        localStorage.removeItem("accessToken");
        localStorage.removeItem("refreshToken");
        localStorage.removeItem("role");
        if (process.env.NODE_ENV === "development") {
          console.log("🧹 Cleared tokens - Redirecting to /login");
        }
        window.location.href = "/login";
        return Promise.reject(refreshErr);
      } finally {
        isRefreshing = false;
        if (process.env.NODE_ENV === "development") {
          console.log("🔄 Refresh ended");
        }
      }
    }

    if (process.env.NODE_ENV === "development" && status) {
      console.log("⚠️ Non-auth error - Rejecting:", status);
    }
    return Promise.reject(error);
  }
);

export default AppService;