import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from 'vite-plugin-pwa';


export default defineConfig(({ command }) => {
  const config = {
    plugins: [
      react(),
      VitePWA({
        registerType: 'prompt',
        includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'mask-icon.svg', 'pwa-192x192.png', 'pwa-512x512.png'],
        devOptions: {
          enabled: true
        },
        workbox: {
          globPatterns: command === 'serve' ? [] : ['**/*.{js,css,html,ico,png,svg}'],
          globIgnores: ['**/icona1.png', '**/icona2.png']
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
    build: {
      // Minificazione avanzata con terser
      minify: 'terser',
      terserOptions: {
        compress: {
          // Rimuove console.log in produzione
          drop_console: true,
          drop_debugger: true,
        },
      },
      // Immagini < 4KB vengono inline come base64 (meno richieste HTTP)
      assetsInlineLimit: 4096,
      rollupOptions: {
        output: {
          // Chunk splitting: separa le librerie pesanti in bundle dedicati
          // così il browser può cachearli indipendentemente
          manualChunks: {
            // React core — cambia raramente, cache a lungo
            'vendor-react': ['react', 'react-dom', 'react-router-dom'],
            // Animazioni — framer-motion è ~150kb da isolare
            'vendor-motion': ['framer-motion'],
            // Data fetching
            'vendor-query': ['@tanstack/react-query'],
            // Icone — react-icons è molto grande
            'vendor-icons': ['react-icons'],
          },
        },
      },
    },
    server: {
      host: "0.0.0.0",

      proxy: {
        "/api": {
          target: process.env.VITE_API_TARGET ?? "http://0.0.0.0:5000", // nosonar
          changeOrigin: true,
          secure: false,
        },
      },
    },
    preview: {
      proxy: {
        "/api": {
          target: process.env.VITE_API_TARGET ?? "http://localhost:5000", // nosonar
          changeOrigin: true,
          secure: false,
        },
      },
    },
  };

  return config;
});

