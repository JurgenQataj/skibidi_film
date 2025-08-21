import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ command }) => {
  const config = {
    plugins: [react()],
    server: {
      host: true,
    },
  };

  // Applica il proxy solo quando esegui `npm run dev` in locale
  if (command === "serve") {
    config.server.proxy = {
      "/api": {
        target: "http://localhost:5000",
        changeOrigin: true,
      },
    };
  }

  return config;
});
