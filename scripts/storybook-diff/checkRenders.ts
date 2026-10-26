import { parseArgs } from "node:util";

import { readManifest } from "./captureManifest.ts";
import { renderErrors } from "./renderErrors.ts";

/**
 * Fails when any story of a capture failed to render, listing each one with its error.
 *
 * Usage: `node scripts/storybook-diff/checkRenders.ts --capture <dir>`
 */
const { values } = parseArgs({ options: { capture: { type: "string" } } });

if (!values.capture) {
  console.error(
    "Usage: node scripts/storybook-diff/checkRenders.ts --capture <dir>",
  );
  process.exit(2);
}

const errors = renderErrors(await readManifest(values.capture));
if (errors.length > 0) {
  console.error(`Stories that failed to render (${errors.length}):`);
  for (const error of errors) console.error(`  ${error}`);
  process.exit(1);
}
console.log("Every story rendered.");
