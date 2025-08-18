import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // Rende il server visibile sulla tua rete locale (Wi-Fi)
    host: true,
    proxy: {
      // Qualsiasi richiesta che il frontend fa a "/api/..."
      "/api": {
        // ...verrà reindirizzata al tuo server backend
        target: "http://localhost:5000",
        // Necessario per evitare problemi di CORS
        changeOrigin: true,
      },
    },
  },
});
