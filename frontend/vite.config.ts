import path from "node:path";
import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const dirname = path.dirname(fileURLToPath(import.meta.url));
const backendTarget = "http://127.0.0.1:4000";
const frontendHost = "127.0.0.1";
const frontendPort = 3030;

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(dirname, "./src"),
      "@restify/shared": path.resolve(dirname, "../shared/src/index.ts"),
    },
  },
  server: {
    host: frontendHost,
    port: frontendPort,
    strictPort: false,
    proxy: {
      "/api": {
        target: backendTarget,
        changeOrigin: true,
        secure: false,
      },
    },
  },
  preview: {
    host: frontendHost,
    port: 3031,
    strictPort: false,
  },
});
