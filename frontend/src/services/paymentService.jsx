import { api } from "./api";

export const paymentService = {
  initiateSongPurchase: async (songId) => {
    return await api.post("payment/initiate-song", { song_id: songId });
  },

  initiateSubscription: async (plan) => {
    return await api.post("payment/initiate-subscription", { plan });
  },

  initiateTicketPurchase: async (eventId) => {
    return await api.post("payment/initiate-ticket", { event_id: eventId });
  },

  mockPurchaseSong: async (songId) => {
    return await api.post("payment/purchase-song-mock", { song_id: songId });
  },

  mockPurchaseTicket: async (eventId) => {
    return await api.post("payment/purchase-ticket-mock", { event_id: eventId });
  },

  verifySubscription: async () => {
    return await api.get("payment/verify-subscription");
  },
};
