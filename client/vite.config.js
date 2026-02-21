import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from 'vite-plugin-pwa';
import basicSsl from '@vitejs/plugin-basic-ssl';

export default defineConfig(({ command }) => {
  const config = {
    plugins: [
      react(),
      basicSsl(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'mask-icon.svg', 'pwa-192x192.png', 'pwa-512x512.png'],
        devOptions: {
          enabled: true
        },
        manifest: {
          name: 'Skibidi Film',
          short_name: 'Skibidi Film',
          description: 'Track your watched movies and reviews',
          theme_color: '#ffffff',
          icons: [
            {
              src: 'pwa-192x192.png',
              sizes: '192x192',
              type: 'image/png'
            },
            {
              src: 'pwa-512x512.png',
              sizes: '512x512',
              type: 'image/png'
            }
          ]
        }
      })
    ],
    server: {
      host: "0.0.0.0",
      https: true,
      proxy: {
        "/api": {
          target: "http://0.0.0.0:5000",
          changeOrigin: true,
          secure: false,
        },
      },
    },
    preview: {
      proxy: {
        "/api": {
          target: "http://localhost:5000",
          changeOrigin: true,
        },
      },
    },
  };

  return config;
});
