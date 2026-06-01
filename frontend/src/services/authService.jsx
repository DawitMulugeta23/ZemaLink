import { api } from "./api";

function storeUser(user) {
  if (user) {
    localStorage.setItem("user", JSON.stringify(user));
  }
}

function clearUser() {
  localStorage.removeItem("user");
}

export const authService = {
  register: async (data) => {
    const { name, email, password, role } = typeof data === "object" ? data : {};
    const formData = new FormData();
    formData.append("name", name || data);
    formData.append("email", email);
    formData.append("password", password);
    formData.append("role", role || "audience");
    const response = await api.post("auth/register", formData);
    if (response.success && response.user) {
      storeUser(response.user);
    }
    return response;
  },

  login: async (data) => {
    const { email, password } = typeof data === "object" ? data : {};
    const formData = new FormData();
    formData.append("email", email || data);
    formData.append("password", password);
    const response = await api.post("auth/login", formData);
    if (response.success && response.user) {
      storeUser(response.user);
    }
    return response;
  },

  logout: async () => {
    const response = await api.post("auth/logout", {});
    if (response.success) {
      clearUser();
    }
    return response;
  },

  checkAuth: async () => {
    const response = await api.get("auth/check");
    if (response.authenticated && response.user) {
      storeUser(response.user);
    }
    return response;
  },

  verifyEmail: async (data) => {
    const { email, code } = typeof data === "object" ? data : {};
    return await api.post("auth/verify-code", { email, code });
  },

  resendCode: async (data) => {
    const email = typeof data === "object" ? data.email || data : data;
    return await api.post("auth/resend-code", { email });
  },

  updateProfile: async (data) => {
    const response = await api.post("user/profile", data);
    if (response.success && response.user) {
      storeUser(response.user);
    }
    return response;
  },

  check: async () => {
    const response = await api.get("auth/check");
    if (response.authenticated && response.user) {
      storeUser(response.user);
    }
    return response;
  },

  adminExists: async () => {
    return await api.get("auth/admin-exists");
  },

  verifyCode: async (email, code) => {
    return await api.post("auth/verify-code", { email, code });
  },
};
