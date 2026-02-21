import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  withCredentials: true,
});

// Optional: attach auth token automatically if needed later
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token"); // if you store JWT
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;