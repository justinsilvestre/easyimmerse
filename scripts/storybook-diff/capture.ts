import { parseArgs } from "node:util";

import { captureStories } from "./captureStories.ts";

/**
 * Screenshots every story of a built Storybook in each theme and viewport.
 *
 * Usage: `node scripts/storybook-diff/capture.ts --storybook <dir> --out <dir> [--concurrency <n>]`
 */
const { values } = parseArgs({
  options: {
    storybook: { type: "string" },
    out: { type: "string" },
    concurrency: { type: "string", default: "4" },
  },
});

if (!values.storybook || !values.out) {
  console.error(
    "Usage: node scripts/storybook-diff/capture.ts --storybook <dir> --out <dir> [--concurrency <n>]",
  );
  process.exit(2);
}

const started = Date.now();
const manifest = await captureStories({
  storybookDir: values.storybook,
  outputDir: values.out,
  concurrency: Number(values.concurrency),
});
const failed = manifest.stories.filter((story) => story.error).length;
const seconds = Math.round((Date.now() - started) / 1000);
console.log(
  `Captured ${manifest.stories.length - failed} of ${manifest.stories.length} stories in ${manifest.variants.length} variants in ${seconds}s.`,
);
