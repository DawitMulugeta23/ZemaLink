/**
 * Turn DB paths (e.g. uploads/...) into absolute URLs served by PHP/Apache.
 * Never rewrite frontend static paths (`/assets/...`) — those must stay on the
 * Vite app origin; pointing them at the PHP host hits index.php (JSON) and
 * triggers ORB / cross-site cookie warnings.
 */
export function resolveMediaUrl(path) {
  if (path == null || path === "" || path === "null") {
    return "";
  }
  const s = String(path).trim();

  if (/^https?:\/\//i.test(s)) {
    try {
      const u = new URL(s);
      const p = u.pathname;
      const assetsIdx = p.indexOf("/assets/");
      if (assetsIdx !== -1) {
        let tail = p.slice(assetsIdx) + u.search + u.hash;
        if (tail.includes("default-cover.jpg")) {
          tail = "/assets/images/default-cover.svg";
        }
        return tail;
      }
    } catch {
      /* ignore */
    }
    return s;
  }

  const rel = s.replace(/^\//, "");
  if (rel.startsWith("assets/")) {
    if (rel.endsWith("default-cover.jpg")) {
      return "/assets/images/default-cover.svg";
    }
    return `/${rel}`;
  }

  const base = (import.meta.env.VITE_BACKEND_PUBLIC_URL || "").replace(
    /\/$/,
    "",
  );
  if (base) {
    return `${base}/${rel}`;
  }
  return s.startsWith("/") ? s : `/${rel}`;
}
