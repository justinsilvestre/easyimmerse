import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import type { PluginOption } from "vite";

/** The Vite plugins every app needs: React fast refresh and Tailwind. */
export function sharedVitePlugins(): PluginOption[] {
  return [react(), tailwindcss()];
}
