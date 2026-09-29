import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";

const icons = [
  { src: "icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
];

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: "autoUpdate",
      manifest: {
        name: "easyImmerse",
        short_name: "easyImmerse",
        description: "Learn languages through native media.",
        theme_color: "#4f46e5",
        icons,
      },
    }),
  ],
});
