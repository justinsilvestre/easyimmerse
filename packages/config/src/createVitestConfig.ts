import { defineConfig } from "vitest/config";

type VitestEnvironment = "node" | "happy-dom";

/**
 * Builds the Vitest configuration shared by every package, varying the environment, whether type-level tests run,
 * the files that run before each test file, and how long a test may take.
 */
export function createVitestConfig(options: {
  environment: VitestEnvironment;
  typecheck?: boolean;
  setupFiles?: string[];
  testTimeout?: number;
}) {
  return defineConfig({
    test: {
      environment: options.environment,
      setupFiles: options.setupFiles,
      testTimeout: options.testTimeout,
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
