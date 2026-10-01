import { defineConfig } from "vitest/config";

type VitestEnvironment = "node" | "happy-dom";

/** Builds the Vitest configuration shared by every package, varying only the environment and whether type-level tests run. */
export function createVitestConfig(options: {
  environment: VitestEnvironment;
  typecheck?: boolean;
}) {
  return defineConfig({
    test: {
      environment: options.environment,
      include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
      // Vitest replaces CSS imports with empty modules, but tests read the fixture stylesheets as text.
      css: { include: [/\/fixtures\//] },
      typecheck: {
        enabled: options.typecheck ?? false,
        include: ["src/**/*.test-d.ts"],
      },
    },
  });
}
