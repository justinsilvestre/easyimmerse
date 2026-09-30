import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "wxt";

export default defineConfig({
  modules: ["@wxt-dev/module-react"],
  // The auto-import transform also runs over the workspace packages bundled from source. Its
  // default regex parser mistakes function parameters such as `storage` for WXT globals and
  // injects `wxt` imports those packages cannot resolve; a real parser scopes them correctly.
  imports: { parser: "oxc" },
  vite: () => ({ plugins: [tailwindcss()] }),
  manifest: ({ browser }) => ({
    name: "easyImmerse",
    description:
      "Learn languages from media you enjoy: subtitles, ebooks, and dictionaries in a side panel.",
    permissions: ["sidePanel", "storage"],
    host_permissions: ["http://127.0.0.1/*", "http://localhost/*"],
    action: { default_title: "easyImmerse" },
    ...(browser === "firefox" && {
      browser_specific_settings: {
        gecko: {
          id: "easyimmerse@easyimmerse.app",
          data_collection_permissions: { required: ["none"] },
        },
      },
    }),
    // The offline WebAssembly module cannot be instantiated without 'wasm-unsafe-eval'.
    content_security_policy: {
      extension_pages:
        "script-src 'self' 'wasm-unsafe-eval'; object-src 'self'",
    },
  }),
});
