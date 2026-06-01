import { api } from "./api";
import { getMediaUrl } from "../utils/mediaUrl";

function inferMediaType(path) {
  const raw = String(path || "").toLowerCase();
  if (!raw) return "audio";
  if (
    raw.includes(".mp4") ||
    raw.includes(".webm") ||
    raw.includes(".mov") ||
    raw.includes(".m4v") ||
    raw.includes(".mkv") ||
    raw.includes("video/upload")
  ) {
    return "video";
  }
  return "audio";
}

function mapSong(s) {
  if (!s) return s;
  const filePath = getMediaUrl(s.file_path);
  return {
    ...s,
    file_path: filePath,
    media_type: s.media_type || inferMediaType(filePath),
    cover_image:
      s.cover_image && s.cover_image !== "null"
        ? getMediaUrl(s.cover_image)
        : s.cover_image,
    can_play: s.can_play !== false,
    requires_purchase: s.requires_purchase === true,
    rating: parseFloat(s.rating) || 0,
    plays: parseInt(s.plays) || 0,
    likes_count: parseInt(s.likes_count) || 0,
    is_premium: s.is_premium == 1 || s.is_premium === "1",
    price: parseFloat(s.price) || 0,
  };
}

export const songService = {
  getSongs: async (params = {}) => {
    const query = new URLSearchParams();
    if (params.search) query.set("search", params.search);
    if (params.genre) query.set("genre", params.genre);
    if (params.page) query.set("page", params.page);
    if (params.limit) query.set("limit", params.limit);
    const qs = query.toString();
    const response = await api.get(`songs${qs ? `?${qs}` : ""}`);
    if (response.success && response.songs) {
      return response.songs.map(mapSong);
    }
    return [];
  },

  getSong: async (id) => {
    const response = await api.get(`song/${id}`);
    if (response.success && response.data) {
      return mapSong(response.data);
    }
    return null;
  },

  getTrending: async () => {
    const response = await api.get("songs/trending");
    if (response.success && response.songs) {
      return response.songs.map(mapSong);
    }
    return [];
  },

  getTopRated: async () => {
    const response = await api.get("songs/top-rated");
    if (response.success && response.songs) {
      return response.songs.map(mapSong);
    }
    return [];
  },

  getNewReleases: async () => {
    const response = await api.get("songs/new-releases");
    if (response.success && response.songs) {
      return response.songs.map(mapSong);
    }
    return [];
  },

  getFeatured: async () => {
    const response = await api.get("songs/featured");
    if (response.success && response.songs) {
      return response.songs.map(mapSong);
    }
    return [];
  },

  getRelatedSongs: async (songId) => {
    const response = await api.get(`songs/related/${songId}`);
    if (response.success && response.songs) {
      return response.songs.map(mapSong);
    }
    return [];
  },

  likeSong: async (songId) => {
    return await api.post("user/like", { song_id: songId });
  },

  unlikeSong: async (songId) => {
    return await api.del("user/like", { song_id: songId });
  },

  getLikedSongs: async () => {
    const response = await api.get("user/likes");
    if (response.success && Array.isArray(response.likes)) {
      return { ...response, likes: response.likes.map(mapSong) };
    }
    return response;
  },

  listenSong: async (songId) => {
    return await api.post("user/listen", { song_id: songId });
  },

  getListeningHistory: async () => {
    const response = await api.get("user/listening-history");
    if (response.success && Array.isArray(response.songs)) {
      return response.songs.map(mapSong);
    }
    return [];
  },

  getPurchasedSongs: async () => {
    const response = await api.get("user/purchased-songs");
    if (response.success && Array.isArray(response.songs)) {
      return response.songs.map(mapSong);
    }
    return [];
  },

  aiSearch: async (query) => {
    return await api.get(`songs/ai-search?q=${encodeURIComponent(query)}`);
  },

  reportSong: async (songId, reason) => {
    return await api.post("user/report-song", { song_id: songId, reason });
  },

  search: async (query) => {
    const response = await api.get(`songs?search=${encodeURIComponent(query)}`);
    return response.data || [];
  },

  getLikes: async () => {
    const response = await api.get("user/likes");
    if (response.success && Array.isArray(response.likes)) {
      return { ...response, likes: response.likes.map(mapSong) };
    }
    return response;
  },

  toggleLike: async (songId) => {
    const formData = new FormData();
    formData.append("song_id", songId);
    return await api.post("user/like", formData);
  },

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

  createPlaylist: async (name) => {
    const formData = new FormData();
    formData.append("name", name);
    return await api.post("playlists", formData);
  },

  deletePlaylist: async (playlistId) => {
    return await api.del(`playlists/${playlistId}`);
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

  getPlaylistSongs: async (playlistId) => {
    const response = await api.get(`playlist-songs/${playlistId}`);
    if (response.success && Array.isArray(response.songs)) {
      return response.songs.map(mapSong);
    }
    return [];
  },

  recordListen: async (songId) => {
    await api.post("user/listen", { song_id: songId });
  },

  purchaseSong: async (songId) => {
    return await api.post("payment/purchase-song", { song_id: songId });
  },

  upgradeSubscription: async (plan) => {
    return await api.post("user/upgrade-subscription", { plan });
  },
};
