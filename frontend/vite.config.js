import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv } from "vite";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  // Use 127.0.0.1 (not "localhost") so Node hits IPv4. On Windows, "localhost"
  // often resolves to ::1 first while XAMPP Apache listens on IPv4 only → 502.
  const proxyTarget =
    env.VITE_PROXY_TARGET?.trim() || "http://127.0.0.1/ZemaLink/backend";

  return {
    plugins: [react()],
    server: {
      port: 5173,
      strictPort: true,
      host: true,
      // Firefox + Windows: ws://localhost can prefer IPv6 while the dev server
      // is only reachable on IPv4 — force HMR over IPv4.
      hmr: {
        protocol: "ws",
        host: "127.0.0.1",
        port: 5173,
        clientPort: 5173,
      },
      proxy: {
        "/api": {
          target: proxyTarget,
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api/, ""),
        },
      },
    },
    resolve: {
      // Prefer JSX files before JS to avoid Windows case-insensitive collisions
      // such as `PlayerContext.jsx` vs `playerContext.js`.
      extensions: [".jsx", ".js", ".json"],
    },
  };
});
