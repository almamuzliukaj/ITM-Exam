import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const backendTarget = (env.VITE_API_PROXY_TARGET || "http://localhost:5045").replace(/\/+$/, "");

  return {
    plugins: [react()],
    server: {
      proxy: {
        "/auth": {
          target: backendTarget,
          changeOrigin: true,
        },
        "/api": {
          target: backendTarget,
          changeOrigin: true,
        },
      },
    },
    preview: {
      proxy: {
        "/auth": {
          target: backendTarget,
          changeOrigin: true,
        },
        "/api": {
          target: backendTarget,
          changeOrigin: true,
        },
      },
    },
  };
});
