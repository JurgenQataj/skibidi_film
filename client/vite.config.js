import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vite.dev/config/
export default defineConfig(({ command }) => {
  const config = {
    plugins: [react()],
    server: {
      host: true,
    },
  };

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
