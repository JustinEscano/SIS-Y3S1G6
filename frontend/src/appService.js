// src/AppService.ts
import axios from "axios";

const AppService = axios.create({
  baseURL: "http://localhost:8000/api", // replace with your backend base URL
  headers: {
    "Content-Type": "application/json",
  },
});

// ✅ Request interceptor: add token if available
AppService.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("authToken");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ✅ Response interceptor: handle 401 errors
AppService.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // token expired or not valid
      localStorage.removeItem("authToken");
      window.location.href = "/login"; // redirect to login
    }
    return Promise.reject(error);
  }
);

export default AppService;