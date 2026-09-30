import { sharedVitePlugins } from "@easyimmerse/config/vite-plugins";
import { defineConfig } from "vite";

// Set by the Tauri CLI when it runs Vite; documented under "Vite" in the Tauri frontend guides.
const devHost = process.env.TAURI_DEV_HOST;
const isWindows = process.env.TAURI_ENV_PLATFORM === "windows";
const isDebug = process.env.TAURI_ENV_DEBUG === "true";

export default defineConfig({
  plugins: sharedVitePlugins(),
  clearScreen: false,
  envPrefix: ["VITE_", "TAURI_ENV_*"],
  server: {
    port: 1421,
    strictPort: true,
    host: devHost || false,
    hmr: devHost ? { protocol: "ws", host: devHost, port: 1422 } : undefined,
    watch: { ignored: ["**/src-tauri/**"] },
  },
  build: {
    target: isWindows ? "chrome105" : "safari13",
    minify: isDebug ? false : "esbuild",
    sourcemap: isDebug,
  },
});
