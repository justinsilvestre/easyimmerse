import { sharedVitePlugins } from "@easyimmerse/config/vite-plugins";
import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    ...sharedVitePlugins(),
    VitePWA({
      registerType: "autoUpdate",
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
