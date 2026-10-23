import { createVitestConfig } from "@easyimmerse/config/vitest";
import { unpackFixtures } from "@easyimmerse/fixtures";

unpackFixtures();

export default createVitestConfig({
  environment: "happy-dom",
  setupFiles: ["src/testSupport/configureTestingLibrary.ts"],
  testTimeout: 15_000,
});
