import { api } from "./api";

export const musicianService = {
  getMySongs: () => api.get("musician/my-songs"),
  getStats: () => api.get("musician/stats"),
  getEarnings: () => api.get("musician/earnings"),
  uploadSong: (formData) => api.postForm("musician/upload-song", formData),
  updateSong: (songId, formData) =>
    api.postForm(`musician/update-song/${songId}`, formData),
  deleteSong: (songId) =>
    api.post(`musician/delete-song/${songId}`, {}),
};
