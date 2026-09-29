import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

/** The configuration used by Storybook. */
export default defineConfig({
  plugins: [react(), tailwindcss()],
});
