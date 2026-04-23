import { api } from "./api";
import { resolveMediaUrl } from "../utils/mediaUrl";

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
  const filePath = resolveMediaUrl(s.file_path);
  return {
    ...s,
    file_path: filePath,
    media_type: s.media_type || inferMediaType(filePath),
    cover_image:
      s.cover_image && s.cover_image !== "null"
        ? resolveMediaUrl(s.cover_image)
        : s.cover_image,
    can_play: s.can_play !== false,
  };
}

export const songService = {
  search: async (query) => {
    const all = await songService.getSongs();
    const q = String(query).toLowerCase().trim();
    if (!q) return all;
    return all.filter(
      (s) =>
        s.title?.toLowerCase().includes(q) ||
        s.artist?.toLowerCase().includes(q) ||
        (s.album && s.album.toLowerCase().includes(q)),
    );
  },

  getSongs: async () => {
    const response = await api.get("songs");
    if (response.success && response.songs) {
      return response.songs.map(mapSong);
    }
    return [];
  },

  getTrending: async () => {
    const response = await api.get("songs/trending");
    if (response.success && response.songs) {
      return response.songs.map(mapSong);
    }
    return [];
  },

  getLikes: async () => {
    const response = await api.get("user/likes");
    if (response.success && Array.isArray(response.likes)) {
      return { ...response, likes: response.likes.map(mapSong) };
    }
    return response;
  },

  toggleLike: async (songId) => {
    // Using FormData for POST
    const formData = new FormData();
    formData.append("song_id", songId);
    return await api.postForm("user/like", formData);
  },

  getPlaylists: async () => {
    const response = await api.get("playlists");
    if (response.success && Array.isArray(response.playlists)) {
      return {
        ...response,
        playlists: response.playlists.map((p) => ({
          ...p,
          cover_image: p.cover_image
            ? resolveMediaUrl(p.cover_image)
            : p.cover_image,
        })),
      };
    }
    return response;
  },

  createPlaylist: async (name) => {
    // Using FormData for POST
    const formData = new FormData();
    formData.append("name", name);
    return await api.postForm("playlists", formData);
  },

  getPlaylistSongs: async (playlistId) => {
    const response = await api.get(`playlists/${playlistId}/songs`);
    if (response.success && Array.isArray(response.songs)) {
      return response.songs.map(mapSong);
    }
    return [];
  },

  recordListen: async (songId) => {
    await api.post("user/listen", { song_id: songId });
  },

  getPurchasedSongs: async () => {
    const response = await api.get("user/purchased-songs");
    if (response.success && Array.isArray(response.songs)) {
      return response.songs.map(mapSong);
    }
    return [];
  },

  getListeningHistory: async () => {
    const response = await api.get("user/listening-history");
    if (response.success && Array.isArray(response.songs)) {
      return response.songs.map(mapSong);
    }
    return [];
  },

  purchaseSong: async (songId) => {
    return await api.post("payment/purchase-song", { song_id: songId });
  },

  initiateSongPayment: async (songId, returnUrl) => {
    return await api.post("payment/initiate-song", {
      song_id: songId,
      return_url: returnUrl,
    });
  },

  verifySongPayment: async (songId, txRef) => {
    return await api.post("payment/verify-song", {
      song_id: songId || 0,
      tx_ref: txRef,
    });
  },

  reportSong: async (songId, reason) => {
    return await api.post("user/report-song", { song_id: songId, reason });
  },

  upgradeSubscription: async (plan) => {
    return await api.post("user/upgrade-subscription", { plan });
  },
};
