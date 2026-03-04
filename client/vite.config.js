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
        registerType: 'prompt',
        includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'mask-icon.svg', 'pwa-192x192.png', 'pwa-512x512.png'],
        devOptions: {
          enabled: false
        },
        manifest: {
          name: 'Skibidi Film',
          short_name: 'Skibidi Film',
          description: 'Track your watched movies and reviews',
          theme_color: '#0a0a0f',
          background_color: '#0a0a0f',
          display: 'standalone',
          orientation: 'portrait',
          start_url: '/',
          scope: '/',
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
            },
            {
              src: 'pwa-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'maskable'
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
          // HTTPS target: the local Express server must also be reachable over HTTPS
          // (either via a reverse proxy like Caddy/nginx, or by setting VITE_API_TARGET
          // to http://... in a .env.local to override for plain-HTTP local backends).
          target: process.env.VITE_API_TARGET ?? "https://0.0.0.0:5000",
          changeOrigin: true,
          // Allow self-signed / untrusted certs on the local backend
          secure: false,
        },
      },
    },
    preview: {
      proxy: {
        "/api": {
          target: process.env.VITE_API_TARGET ?? "https://localhost:5000",
          changeOrigin: true,
          // Allow self-signed / untrusted certs on the local backend
          secure: false,
        },
      },
    },
  };

  return config;
});
