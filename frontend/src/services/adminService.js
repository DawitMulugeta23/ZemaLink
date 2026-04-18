import { api } from "./api";

export const adminService = {
  getStats: () => api.get("admin/stats"),
  getPendingMusicians: () => api.get("admin/pending-musicians"),
  getPendingSongs: () => api.get("admin/pending-songs"),
  getAllSongs: () => api.get("admin/all-songs"),
  getUsers: () => api.get("admin/users"),
  getReports: () => api.get("admin/reports"),
  getPayments: () => api.get("admin/payments"),
  approveMusician: (userId) =>
    api.post("admin/approve-musician", { user_id: userId }),
  rejectMusician: (userId) =>
    api.post("admin/reject-musician", { user_id: userId }),
  updateRole: (userId, role) =>
    api.post("admin/update-role", { user_id: userId, role }),
  deleteUser: (userId) => api.post("admin/delete-user", { user_id: userId }),
  approveSong: (songId) => api.post("admin/approve-song", { song_id: songId }),
  rejectSong: (songId) => api.post("admin/reject-song", { song_id: songId }),
  featureSong: (songId, featured) =>
    api.post("admin/feature-song", { song_id: songId, featured }),
  setSongPremium: (songId, isPremium, price) =>
    api.post("admin/set-song-premium", {
      song_id: songId,
      is_premium: isPremium,
      price,
    }),
  deleteSong: (songId) => api.post("admin/delete-song", { song_id: songId }),
  setReportStatus: (reportId, status) =>
    api.post("admin/report-status", { report_id: reportId, status }),
};
