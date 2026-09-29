import { defineProject } from "vitest/config";

export default defineProject({
  test: {
    name: "native",
    environment: "node",
    exclude: ["src-tauri/**", "node_modules/**"],
  },
});
