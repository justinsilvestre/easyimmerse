import { cp, rm } from "node:fs/promises";
import { sourceMigrationsFolder } from "@easyimmerse/api/database/sourceMigrationsFolder";
import { build } from "esbuild";

// Some dependencies are CommonJS modules, which expect a `require` function to exist.
const requireShim = `
import { createRequire as createRequireShim } from "node:module";
const require = createRequireShim(import.meta.url);
`;

await rm("dist", { recursive: true, force: true });

await build({
  entryPoints: ["src/startServer.ts"],
  outfile: "dist/easyimmerse-server.mjs",
  bundle: true,
  platform: "node",
  target: "node24",
  format: "esm",
  banner: { js: requireShim },
});

await cp(sourceMigrationsFolder, "dist/migrations", { recursive: true });
