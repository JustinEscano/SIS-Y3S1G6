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
    const { token, role } = res.data;

    localStorage.setItem('accessToken', token);
    localStorage.setItem('role', role);
    return { token, role };
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
