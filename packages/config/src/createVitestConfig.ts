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
      typecheck: {
        enabled: options.typecheck ?? false,
        include: ["src/**/*.test-d.ts"],
        // Type errors outside the type-level tests are left to each package's typecheck script.
        ignoreSourceErrors: true,
      },
    },
  });
}
