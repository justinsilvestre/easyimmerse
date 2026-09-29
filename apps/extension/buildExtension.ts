import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { build } from "vite";

/**
 * Background and content scripts cannot load other files as modules in all browsers,
 * so each of them is built separately into a single self-contained file.
 */
const standaloneScripts = ["background", "contentScript"];

await build({
  configFile: false,
  plugins: [react(), tailwindcss()],
  build: { rolldownOptions: { input: "popup.html" } },
});

for (const script of standaloneScripts) {
  await build({
    configFile: false,
    publicDir: false,
    build: {
      emptyOutDir: false,
      lib: {
        entry: `src/${script}.ts`,
        formats: ["iife"],
        name: script,
        fileName: () => `${script}.js`,
      },
    },
  });
}
