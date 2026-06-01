import { api } from "./api";
import { getMediaUrl } from "../utils/mediaUrl";

export const playlistService = {
  getPlaylists: async () => {
    const response = await api.get("playlists");
    if (response.success && Array.isArray(response.playlists)) {
      return {
        ...response,
        playlists: response.playlists.map((p) => ({
          ...p,
          cover_image: p.cover_image ? getMediaUrl(p.cover_image) : p.cover_image,
        })),
      };
    }
    return response;
  },

  createPlaylist: async (data) => {
    const name = typeof data === "object" ? data.name : data;
    const formData = new FormData();
    formData.append("name", name);
    return await api.post("playlists", formData);
  },

  deletePlaylist: async (id) => {
    return await api.del(`playlists/${id}`);
  },

  getPlaylistSongs: async (id) => {
    const response = await api.get(`playlist-songs/${id}`);
    if (response.success && Array.isArray(response.songs)) {
      return response.songs;
    }
    return [];
  },

  addSongToPlaylist: async (playlistId, songId) => {
    return await api.post("playlist/add-song", {
      playlist_id: playlistId,
      song_id: songId,
    });
  },

  removeSongFromPlaylist: async (playlistId, songId) => {
    return await api.post("playlist/remove-song", {
      playlist_id: playlistId,
      song_id: songId,
    });
  },
};
