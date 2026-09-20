import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath, URL } from "node:url";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  // Where the API runs during development. Proxying keeps the browser on one
  // origin, so the httpOnly session cookie is first-party (SameSite=Lax) and
  // no CORS gymnastics are needed locally.
  const apiProxyTarget = env.VITE_API_PROXY_TARGET || "http://127.0.0.1:4000";

  return {
    plugins: [react()],
    resolve: {
      alias: {
        "@": fileURLToPath(new URL("./src", import.meta.url)),
        "@bandhan/shared": fileURLToPath(new URL("../../packages/shared/src/index.ts", import.meta.url)),
      },
    },
    server: {
      proxy: {
        "/api": {
          target: apiProxyTarget,
          changeOrigin: true,
        },
      },
    },
    build: {
      sourcemap: false,
      // Route-level code splitting happens automatically via React.lazy;
      // keep vendor chunks stable for long-term caching.
      rollupOptions: {
        output: {
          manualChunks: {
            "vendor-react": ["react", "react-dom", "react-router-dom"],
            "vendor-motion": ["framer-motion"],
          },
        },
      },
    },
  };
});
