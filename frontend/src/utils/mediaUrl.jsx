import { API_BASE } from "../constants";

export const IMAGE_FALLBACK = "/assets/images/default-cover.svg";

export function getMediaUrl(path) {
  if (!path || path === "null" || path === "undefined") {
    return IMAGE_FALLBACK;
  }
  const s = String(path).trim();
  if (!s) return IMAGE_FALLBACK;

  if (/^https?:\/\//i.test(s) || s.startsWith("cloudinary://")) {
    try {
      const u = new URL(s);
      const p = u.pathname;
      const assetsIdx = p.indexOf("/assets/");
      if (assetsIdx !== -1) {
        let tail = p.slice(assetsIdx) + u.search + u.hash;
        if (tail.includes("default-cover.jpg")) {
          tail = IMAGE_FALLBACK;
        }
        return tail;
      }
    } catch {
      /* not a valid URL, pass through */
    }
    return s;
  }

  const rel = s.replace(/^\/+/, "");
  if (rel.startsWith("assets/")) {
    if (rel.endsWith("default-cover.jpg")) {
      return IMAGE_FALLBACK;
    }
    return `/${rel}`;
  }

  const base = API_BASE.replace(/\/+$/, "");
  return `${base}/${rel}`;
}

export const resolveMediaUrl = getMediaUrl;
