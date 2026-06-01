import { api } from "./api";

export const adminService = {
  getStats: async () => {
    return await api.get("admin/stats");
  },

  getPendingSongs: async () => {
    return await api.get("admin/pending-songs");
  },

  getAllSongs: async () => {
    return await api.get("admin/all-songs");
  },

  getUsers: async () => {
    return await api.get("admin/users");
  },

  getReports: async () => {
    return await api.get("admin/reports");
  },

  getPayments: async () => {
    return await api.get("admin/payments");
  },

  approveSong: async (id) => {
    return await api.post("admin/approve-song", { song_id: id });
  },

  rejectSong: async (id) => {
    return await api.post("admin/reject-song", { song_id: id });
  },

  featureSong: async (id) => {
    return await api.post("admin/feature-song", { song_id: id, featured: 1 });
  },

  unfeatureSong: async (id) => {
    return await api.post("admin/feature-song", { song_id: id, featured: 0 });
  },

  setSongPremium: async (id, data) => {
    const isPremium = data?.is_premium ?? data?.isPremium ?? 0;
    const price = data?.price ?? 0;
    return await api.post("admin/set-song-premium", {
      song_id: id,
      is_premium: isPremium,
      price,
    });
  },

  deleteSong: async (id) => {
    return await api.post("admin/delete-song", { song_id: id });
  },

  updateRole: async (userId, role) => {
    return await api.post("admin/update-role", { user_id: userId, role });
  },

  deleteUser: async (id) => {
    return await api.post("admin/delete-user", { user_id: id });
  },

  approveMusician: async (id) => {
    return await api.post("admin/approve-musician", { user_id: id });
  },

  rejectMusician: async (id) => {
    return await api.post("admin/reject-musician", { user_id: id });
  },

  handleReport: async (id, action) => {
    return await api.post("admin/handle-report", { report_id: id, action });
  },

  getPendingMusicians: async () => {
    return await api.get("admin/pending-musicians");
  },

  setReportStatus: async (reportId, status) => {
    return await api.post("admin/report-status", { report_id: reportId, status });
  },
};
