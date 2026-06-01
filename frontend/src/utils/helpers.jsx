export const formatTime = (seconds) => {
  if (!seconds && seconds !== 0) return "0:00";
  const total = Math.floor(Math.abs(seconds));
  const hrs = Math.floor(total / 3600);
  const mins = Math.floor((total % 3600) / 60);
  const secs = total % 60;
  if (hrs > 0) {
    return `${hrs}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  }
  return `${mins}:${secs.toString().padStart(2, "0")}`;
};

export const formatNumber = (num) => {
  if (num == null || isNaN(num)) return "0";
  const n = Number(num);
  if (n >= 1_000_000_000) return (n / 1_000_000_000).toFixed(1).replace(/\.0$/, "") + "B";
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, "") + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1).replace(/\.0$/, "") + "K";
  return n.toLocaleString();
};

export const truncateText = (str, maxLen = 100) => {
  if (!str) return "";
  const s = String(str);
  if (s.length <= maxLen) return s;
  return s.slice(0, maxLen).trimEnd() + "...";
};

export const getInitials = (name) => {
  if (!name) return "?";
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join("");
};

export const getRandomColor = () => {
  const hue = Math.floor(Math.random() * 360);
  return `hsl(${hue}, 55%, 45%)`;
};

export const debounce = (fn, delay = 300) => {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
};

export const classNames = (...classes) => {
  return classes.filter(Boolean).join(" ");
};

export const isValidEmail = (email) => {
  if (!email) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};

export const parseError = (err) => {
  if (!err) return "An unexpected error occurred";
  if (typeof err === "string") return err;
  if (err.message) return err.message;
  if (err.error) return err.error;
  if (typeof err === "object") {
    const msg = err.message || err.error || err.msg || err.detail;
    if (msg) return msg;
  }
  return "An unexpected error occurred";
};

export const generateId = () => {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 9);
};
