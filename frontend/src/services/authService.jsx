import { api } from "./api";

export const authService = {
  register: async (name, email, password, role = "audience") => {
    const response = await api.post("auth/register", { name, email, password, role });
    return response;
  },

  login: async (email, password) => {
    const response = await api.post("auth/login", { email, password });
    return response;
  },

  logout: async () => {
    const response = await api.post("auth/logout", {});
    return response;
  },

  check: async () => {
    return await api.get("auth/check");
  },

  verifyCode: async (email, code) => {
    return await api.post("auth/verify-code", { email, code });
  },

  resendCode: async (email) => {
    return await api.post("auth/resend-code", { email });
  },

  forgotPassword: async (email) => {
    return await api.post("auth/forgot-password", { email });
  },

  resetPassword: async (token, password) => {
    return await api.post("auth/reset-password", { token, password });
  },

  adminExists: async () => {
    return await api.get("auth/admin-exists");
  },
};
