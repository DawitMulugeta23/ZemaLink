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

  mockPurchaseSong: async (songId, accountData = {}) => {
    return await api.post("payment/purchase-song-mock", { song_id: songId, ...accountData });
  },

  mockPurchaseTicket: async (eventId, accountData = {}) => {
    return await api.post("payment/purchase-ticket-mock", { event_id: eventId, ...accountData });
  },

  verifySongPayment: async (txRef, songId) => {
    return await api.get(`payment/verify-song?tx_ref=${txRef}&song_id=${songId}`);
  },

  verifySubscription: async (txRef) => {
    return await api.get(`payment/verify-subscription?tx_ref=${txRef}`);
  },

  verifyTicketPayment: async (txRef) => {
    return await api.get(`payment/verify-ticket?tx_ref=${txRef}`);
  },
};
