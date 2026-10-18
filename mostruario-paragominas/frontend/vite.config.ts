import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "prompt",
      includeAssets: ["icone.svg", "apple-touch-icon.png"],
      manifest: {
        name: "Mostruário Paragominas",
        short_name: "Mostruário",
        description: "Controle de amostras de pisos do mostruário: requisição, aprovação, expedição e devolução.",
        lang: "pt-BR",
        start_url: "/",
        scope: "/",
        display: "standalone",
        orientation: "any",
        theme_color: "#1d4ed8",
        background_color: "#f5f6f8",
        categories: ["business", "productivity"],
        icons: [
          { src: "/icone-192.png", sizes: "192x192", type: "image/png" },
          { src: "/icone-512.png", sizes: "512x512", type: "image/png" },
          { src: "/icone-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
        shortcuts: [
          { name: "Nova requisição", url: "/requisicoes/nova", icons: [{ src: "/icone-192.png", sizes: "192x192" }] },
          { name: "Requisições", url: "/requisicoes", icons: [{ src: "/icone-192.png", sizes: "192x192" }] },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,svg,png,woff2}"],
        globIgnores: ["**/*cyrillic*", "**/*greek*", "**/*vietnamese*"],
        navigateFallback: "/index.html",
        navigateFallbackDenylist: [/^\/api\//],
        cleanupOutdatedCaches: true,
      },
    }),
  ],
  server: { proxy: { "/api": "http://localhost:8000" } },
  build: { chunkSizeWarningLimit: 700 },
});
