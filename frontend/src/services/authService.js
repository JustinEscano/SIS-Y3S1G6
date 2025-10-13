import AppService from "../appService";

// 🔐 Register (student / teacher / superadmin)
const register = async (payload) => {
  try {
    const res = await AppService.post("/auth/register", payload);
    return res.data;
  } catch (error) {
    console.error("Registration error:", error.response?.data || error.message);
    throw error;
  }
};

const login = async ({ email, password }) => {
  try {
    const res = await AppService.post('/auth/login', { email, password });
    // backend may return { token } or { accessToken }
    const accessToken = res.data.accessToken || res.data.token;
    const { refreshToken, role } = res.data;

    if (accessToken) localStorage.setItem('accessToken', accessToken);
    if (refreshToken) localStorage.setItem('refreshToken', refreshToken);
    if (role) localStorage.setItem('role', role);
    return { accessToken, refreshToken, role };
  } catch (err) {
    throw err.response?.data || err;
  }
};


// 🚪 Logout
const logout = () => {
  localStorage.removeItem("accessToken");
  localStorage.removeItem("refreshToken");
  window.location.href = "/login";
};

// 🔁 Refresh token (used internally by appService)
const refreshToken = async () => {
  try {
    const refreshToken = localStorage.getItem("refreshToken");
    if (!refreshToken) throw new Error("No refresh token found");

    const res = await AppService.post("/auth/refresh", { refreshToken });
    const newToken = res.data.accessToken;
    localStorage.setItem("accessToken", newToken);
    return newToken;
  } catch (error) {
    console.error("Token refresh failed:", error.response?.data || error.message);
    logout();
    throw error;
  }
};

const authService = {
  register,
  login,
  logout,
  refreshToken,
};

export default authService;
