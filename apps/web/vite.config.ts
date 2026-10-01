import { sharedVitePlugins } from "@easyimmerse/config/vite-plugins";
import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    ...sharedVitePlugins(),
    VitePWA({
      registerType: "autoUpdate",
      // The default patterns leave out the wasm module, which the offline backend needs.
      workbox: {
        globPatterns: ["**/*.{js,css,html,ico,png,svg,wasm}"],
        maximumFileSizeToCacheInBytes: 8 * 1024 * 1024,
      },
      manifest: {
        name: "easyImmerse",
        short_name: "easyImmerse",
        theme_color: "#2563eb",
        icons: [
          { src: "icons/pwa-192.png", sizes: "192x192", type: "image/png" },
          { src: "icons/pwa-512.png", sizes: "512x512", type: "image/png" },
        ],
      },
    }),
  ],
});
