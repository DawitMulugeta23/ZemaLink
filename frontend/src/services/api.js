/**
 * API base URL (no trailing slash).
 * - Development: defaults to `/api` so requests go through the Vite proxy (same
 *   origin → session cookies work with the PHP backend on XAMPP).
 * - Production: set `VITE_API_BASE` in `.env.production` (e.g. full URL or `/ZemaLink/backend`).
 */
function resolveApiBase() {
  const fromEnv = import.meta.env.VITE_API_BASE?.trim();
  if (fromEnv) {
    return fromEnv.replace(/\/$/, "");
  }
  if (import.meta.env.DEV) {
    return "/api";
  }
  return "http://127.0.0.1/ZemaLink/backend".replace(/\/$/, "");
}

export const API_BASE = resolveApiBase();

function buildUrl(endpoint) {
  const path = String(endpoint).replace(/^\//, "");
  return path ? `${API_BASE}/${path}` : API_BASE;
}

class ApiService {
  async request(endpoint, options = {}) {
    const url = buildUrl(endpoint);

    const config = {
      ...options,
      credentials: "include",
    };

    if (options.body && options.body instanceof FormData) {
      delete config.headers;
    } else if (options.headers) {
      config.headers = {
        "Content-Type": "application/json",
        Accept: "application/json",
        ...options.headers,
      };
    } else {
      config.headers = {
        "Content-Type": "application/json",
        Accept: "application/json",
      };
    }

    try {
      const response = await fetch(url, config);
      const text = await response.text();
      let data;
      try {
        data = text ? JSON.parse(text) : {};
      } catch {
        console.error("API: non-JSON response", response.status, text.slice(0, 200));
        return {
          success: false,
          message: `Server error (${response.status}). Is Apache/XAMPP running and VITE_PROXY_TARGET correct?`,
        };
      }
      if (!response.ok) {
        return {
          ...data,
          success: data.success ?? false,
          message:
            data.message ||
            data.error ||
            `Request failed (${response.status})`,
        };
      }
      return data;
    } catch (error) {
      console.error("API Error:", error);
      return {
        success: false,
        message:
          "Network error — check dev server, proxy, and that the backend URL matches your XAMPP path.",
      };
    }
  }

  get(endpoint) {
    return this.request(endpoint, { method: "GET" });
  }

  post(endpoint, body) {
    return this.request(endpoint, {
      method: "POST",
      body: body instanceof FormData ? body : JSON.stringify(body),
    });
  }

  postForm(endpoint, formData) {
    return this.request(endpoint, {
      method: "POST",
      body: formData,
    });
  }

  put(endpoint, body) {
    return this.request(endpoint, {
      method: "PUT",
      body: body instanceof FormData ? body : JSON.stringify(body),
    });
  }

  delete(endpoint) {
    return this.request(endpoint, { method: "DELETE" });
  }
}

export const api = new ApiService();
