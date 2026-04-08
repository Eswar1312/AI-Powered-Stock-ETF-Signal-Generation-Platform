import axios from "axios";

const runtimeBase = (() => {
  if (typeof window === "undefined") return "http://localhost:5000/api";
  const { protocol, hostname } = window.location;
  return `${protocol}//${hostname}:5000/api`;
})();

const BASE = process.env.REACT_APP_API_URL || runtimeBase;

export const api = axios.create({ baseURL: BASE });

export const fetchSignal = (ticker, period = 10) =>
  api.get(`/signals/generate/${ticker}?period=${period}`).then((r) => r.data);

export const fetchBacktestAnalyzer = (ticker, params = { period: 10 }) =>
  api.get(`/backtest/run/${ticker}`, { params }).then((r) => r.data);

export const fetchLivePrice = (ticker) =>
  api.get(`/signals/price/${ticker}`).then((r) => r.data);

export const fetchWatchlist = () =>
  api.get("/signals/watchlist").then((r) => r.data);

export const fetchAlerts = () => api.get("/alerts").then((r) => r.data);
export const fetchAlertsHistory = () => api.get("/alerts/history").then((r) => r.data);
export const createAlert = (p) => api.post("/alerts", p).then((r) => r.data);
export const deleteAlert = (id) => api.delete(`/alerts/${id}`).then((r) => r.data);
export const sendAlertsTestEmail = () => api.post("/alerts/test", { slack: false }).then((r) => r.data);

export const fetchPortfolio = () => api.get("/portfolio").then((r) => r.data);
export const fetchPortfolioHistory = () => api.get("/portfolio/history").then((r) => r.data);
export const addHolding = (p) => api.post("/portfolio", p).then((r) => r.data);
export const removeHolding = (id) => api.delete(`/portfolio/${id}`).then((r) => r.data);

export const fetchSaved = () => api.get("/saved").then((r) => r.data);
export const savePrediction = (p) => api.post("/saved", p).then((r) => r.data);
export const deleteSaved = (id) => api.delete(`/saved/${id}`).then((r) => r.data);

export const adminFetchUsers = () => api.get("/admin/users").then((r) => r.data);
export const adminToggleUser = (id) => api.patch(`/admin/users/${id}/toggle`).then((r) => r.data);
export const adminDeleteUser = (id) => api.delete(`/admin/users/${id}`).then((r) => r.data);
export const adminFetchStats = () => api.get("/admin/stats").then((r) => r.data);
export const adminFetchSettings = () => api.get("/admin/settings").then((r) => r.data);
export const adminSetBacktestingEnabled = (enabled) =>
  api.patch("/admin/settings/backtesting", { enabled }).then((r) => r.data);
export const fetchPublicSettings = () => api.get("/settings/public").then((r) => r.data);

export const forgotPassword = (email) =>
  api.post("/auth/forgot-password", { email }).then((r) => r.data);

export const resetPassword = (token, password) =>
  api.post("/auth/reset-password", { token, password }).then((r) => r.data);

export const changePassword = (currentPassword, newPassword) =>
  api.post("/auth/change-password", { currentPassword, newPassword }).then((r) => r.data);
