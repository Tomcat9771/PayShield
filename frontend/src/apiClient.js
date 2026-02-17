import axios from "axios";

/* =========================
   API BASE (ENV-DRIVEN)
========================= */
const API_BASE = process.env.REACT_APP_API_URL;

if (!API_BASE) {
  throw new Error("REACT_APP_API_URL is not defined");
}

/* =========================
   AXIOS INSTANCE
========================= */
const apiClient = axios.create({
  baseURL: API_BASE,
});

/* =========================
   TOKEN HANDLING
========================= */
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

/* =========================
   AUTH
========================= */
export const login = async (email, password) => {
  const res = await apiClient.post("/login", { email, password });
  localStorage.setItem("token", res.data.token);
  return res.data;
};

/* =========================
   GUARDS
========================= */
export const listGuards = async () =>
  (await apiClient.get("/guards")).data;

export const createGuard = async (p) =>
  (await apiClient.post("/guards", p)).data;

// ✅ FIXED: use PATCH to match backend
export const updateGuard = async (id, p) =>
  (await apiClient.patch(`/guards/${id}`, p)).data;

export const deactivateGuard = async (id) =>
  (await apiClient.post(`/guards/${id}/deactivate`)).data;

export const saveGuardBankDetails = async (guardId, payload) =>
  (await apiClient.post(`/guards/bank-details/${guardId}`, payload)).data;

/* =========================
   TRANSACTIONS
========================= */
export const listTransactions = async (params = {}) =>
  (await apiClient.get("/transactions", { params })).data;

/* =========================
   PAYOUTS
========================= */
export const listPayouts = async () =>
  (await apiClient.get("/payouts")).data;

export const getPayout = async (id) =>
  (await apiClient.get(`/payouts/${id}`)).data;

export const confirmPayouts = async () =>
  (await apiClient.post("/payouts/confirm")).data;

export const approvePayout = async (id) =>
  (await apiClient.post(`/payouts/${id}/approve`)).data;

export const processPayout = async (id) =>
  (await apiClient.post(`/payouts/${id}/process`)).data;

/* 🔁 RETRY FAILED PAYOUT */
export const retryPayout = async (id) =>
  (await apiClient.post(`/payouts/${id}/retry`)).data;

/* =========================
   LEDGER / AUDIT
========================= */
export const listLedger = async () =>
  (await apiClient.get("/ledger")).data;

export const listAuditLog = async () =>
  (await apiClient.get("/audit")).data;

export default apiClient;
