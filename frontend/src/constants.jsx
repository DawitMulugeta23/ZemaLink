export const API_BASE = (import.meta.env.VITE_API_BASE || "/api").replace(/\/+$/, "");

export const GENRES = [
  "Afrobeat",
  "Blues",
  "Classical",
  "Country",
  "Electronic",
  "Folk",
  "Funk",
  "Hip Hop",
  "Jazz",
  "Latin",
  "Metal",
  "Pop",
  "R&B",
  "Rap",
  "Reggae",
  "Rock",
  "Soul",
  "Traditional",
];

export const DEFAULT_COVER = "/assets/images/default-cover.svg";

export const ROLES = {
  AUDIENCE: "audience",
  MUSICIAN: "musician",
  ADMIN: "admin",
};

export const SUBSCRIPTION_TYPES = {
  FREE: "free",
  PREMIUM: "premium",
};

export const MEDIA_TYPES = {
  AUDIO: "audio",
  VIDEO: "video",
};

export const PAYMENT_TYPES = {
  SONG: "song",
  SUBSCRIPTION: "subscription",
  TICKET: "ticket",
};

export const STREAM_STATUS = {
  SCHEDULED: "scheduled",
  LIVE: "live",
  ENDED: "ended",
};

export const ITEMS_PER_PAGE = 12;
