import { api } from "./api";

export const musicianService = {
  getMySongs: async () => {
    return await api.get("musician/my-songs");
  },

  getStats: async () => {
    return await api.get("musician/stats");
  },

  getEarnings: async () => {
    return await api.get("musician/earnings");
  },

  uploadSong: async (formData) => {
    return await api.post("musician/upload-song", formData);
  },

  deleteSong: async (id) => {
    return await api.del(`musician/delete-song/${id}`);
  },

  updateSong: async (id, data) => {
    if (data instanceof FormData) {
      return await api.post(`musician/update-song/${id}`, data);
    }
    return await api.put(`musician/update-song/${id}`, data);
  },

  getPlatformLinks: async () => {
    return await api.get("musician/platform-links");
  },

  savePlatformLinks: async (links) => {
    return await api.post("musician/platform-links", { links });
  },
};
