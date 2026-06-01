let requestInterceptor = null;
let responseInterceptor = null;

export function setRequestInterceptor(fn) {
  requestInterceptor = fn;
}

export function setResponseInterceptor(fn) {
  responseInterceptor = fn;
}

function resolveApiBase() {
  const fromEnv = import.meta.env.VITE_API_BASE?.trim();
  if (fromEnv) return fromEnv.replace(/\/+$/, "");
  if (import.meta.env.DEV) return "/api";
  return "http://127.0.0.1/ZemaLink/backend";
}

export const API_BASE = resolveApiBase();

function buildUrl(endpoint) {
  const path = String(endpoint).replace(/^\//, "");
  return path ? `${API_BASE}/${path}` : API_BASE;
}

function buildHeaders(options) {
  if (!options || options.body instanceof FormData) {
    return undefined;
  }
  return {
    "Content-Type": "application/json",
    Accept: "application/json",
    ...(options?.headers || {}),
  };
}

async function request(url, config = {}) {
  const endpoint = config.endpoint || url;
  const fullUrl = buildUrl(endpoint);
  const { endpoint: _, ...fetchConfig } = config;

  if (requestInterceptor) {
    requestInterceptor({ url: fullUrl, ...fetchConfig });
  }

  const headers = buildHeaders(fetchConfig);
  let body = fetchConfig.body;
  if (body && typeof body === "object" && !(body instanceof FormData)) {
    body = JSON.stringify(body);
  }

  try {
    const response = await fetch(fullUrl, {
      ...fetchConfig,
      headers,
      body,
      credentials: "include",
    });

    const text = await response.text();
    let data;
    try {
      data = text ? JSON.parse(text) : {};
    } catch {
      return {
        success: false,
        message: `Server error (${response.status}). Is the backend running?`,
      };
    }

    if (!response.ok) {
      const result = {
        ...data,
        success: data.success ?? false,
        status: response.status,
        message: data.message || data.error || `Request failed (${response.status})`,
      };
      if (responseInterceptor) {
        responseInterceptor({ response, data: result });
      }
      return result;
    }

    const result = { ...data, success: data.success ?? true };
    if (responseInterceptor) {
      responseInterceptor({ response, data: result });
    }
    return result;
  } catch (error) {
    return {
      success: false,
      message: "Network error — check that the backend server is running.",
      error: error.message,
    };
  }
}

const api = {
  get: (url, config) => request(url, { ...config, method: "GET", endpoint: url }),
  post: (url, data, config) =>
    request(url, { ...config, method: "POST", body: data, endpoint: url }),
  put: (url, data, config) =>
    request(url, { ...config, method: "PUT", body: data, endpoint: url }),
  del: (url, config) =>
    request(url, { ...config, method: "DELETE", endpoint: url }),

  request,
  getBaseUrl: () => API_BASE,
};

export { api };
export default api;
