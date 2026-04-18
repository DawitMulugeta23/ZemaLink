import { api } from "./api";

export const authService = {
  register: async (name, email, password, role) => {
    // Using FormData for POST
    const formData = new FormData();
    formData.append("name", name);
    formData.append("email", email);
    formData.append("password", password);
    formData.append("role", role);

    const response = await api.postForm("auth/register", formData);
    if (response.success && response.user) {
      localStorage.setItem("user", JSON.stringify(response.user));
    }
    return response;
  },

  login: async (email, password) => {
    // Using FormData for POST
    const formData = new FormData();
    formData.append("email", email);
    formData.append("password", password);

    const response = await api.postForm("auth/login", formData);
    if (response.success) {
      localStorage.setItem("user", JSON.stringify(response.user));
    }
    return response;
  },

  logout: async () => {
    const response = await api.post("auth/logout", {});
    if (response.success) {
      localStorage.removeItem("user");
    }
    return response;
  },

  check: async () => {
    const response = await api.get("auth/check");
    if (response.authenticated) {
      localStorage.setItem("user", JSON.stringify(response.user));
    }
    return response;
  },

  adminExists: async () => {
    return await api.get("auth/admin-exists");
  },

  verifyCode: async (email, code) => {
    return await api.post("auth/verify-code", { email, code });
  },

  resendCode: async (email) => {
    return await api.post("auth/resend-code", { email });
  },
};
