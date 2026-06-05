import { api } from "./api";

export const liveStreamService = {
  getLiveStreams: async () => {
    return await api.get("live-streams");
  },

  getLiveStream: async (id) => {
    return await api.get(`live-streams/${id}`);
  },

  createStream: async (data) => {
    return await api.post("live-streams", data);
  },

  updateStreamStatus: async (id, status) => {
    return await api.post(`live-streams/${id}/status`, { status });
  },

  deleteStream: async (id) => {
    return await api.del(`live-streams/${id}`);
  },

  getStreamMessages: async (id) => {
    return await api.get(`live-streams/${id}/messages`);
  },

  sendMessage: async (streamId, message) => {
    return await api.post(`live-streams/${streamId}/messages`, { message });
  },

  getAllStreams: async () => {
    return await api.get("live-streams");
  },

  getStreamDetails: async (id) => {
    return await api.get(`live-streams/${id}`);
  },

  updateStatus: async (id, status, streamUrl = "") => {
    return await api.post(`live-streams/${id}/status`, {
      status,
      stream_url: streamUrl,
    });
  },

  getMusicianStreams: async () => {
    return await api.get("musician/live-streams");
  },

  getMessages: async (streamId) => {
    return await api.get(`live-streams/${streamId}/messages`);
  },

  getReplay: async (streamId) => {
    return await api.get(`live-streams/${streamId}/replay`);
  },

  setVideoUrl: async (streamId, videoUrl) => {
    return await api.post(`live-streams/${streamId}/video-url`, { video_url: videoUrl });
  },
};
