import { join } from "node:path";

import { runCommand } from "./runCommand.ts";

/** Builds the UI package's Storybook in a checkout of this repository and returns the output directory. */
export async function buildStorybook(checkoutDir: string): Promise<string> {
  await runCommand(
    "pnpm",
    ["--filter", "@easyimmerse/ui", "build-storybook"],
    checkoutDir,
  );
  return join(checkoutDir, "packages/ui/storybook-static");
}
