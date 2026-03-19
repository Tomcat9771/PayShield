import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || "https://payshield-o0bg.onrender.com/api",
  withCredentials: false,
  headers: {
    "Content-Type": "application/json"
  }
});

// Attach auth token automatically
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

export default api;