import { api } from "./api";

export const eventService = {
  getEvents: async () => {
    return await api.get("events");
  },

  getEvent: async (id) => {
    return await api.get(`events/${id}`);
  },

  createEvent: async (data) => {
    return await api.post("events", data);
  },

  updateEvent: async (id, data) => {
    return await api.put(`events/${id}`, data);
  },

  deleteEvent: async (id) => {
    return await api.del(`events/${id}`);
  },

  getMyEvents: async () => {
    return await api.get("musician/events");
  },

  getMyTickets: async () => {
    return await api.get("user/tickets");
  },

  purchaseTicket: async (eventId) => {
    return await api.post("payment/initiate-ticket", { event_id: eventId });
  },

  getAllEvents: async () => {
    return await api.get("events");
  },

  getEventDetails: async (id) => {
    return await api.get(`events/${id}`);
  },

  getMusicianEvents: async () => {
    return await api.get("musician/events");
  },

  initiateTicketPayment: async (eventId, returnUrl = "") => {
    return await api.post("payment/initiate-ticket", {
      event_id: eventId,
      return_url: returnUrl,
    });
  },

  purchaseTicketMock: async (eventId) => {
    return await api.post("payment/purchase-ticket-mock", { event_id: eventId });
  },

  getUserTickets: async () => {
    return await api.get("user/tickets");
  },
};
