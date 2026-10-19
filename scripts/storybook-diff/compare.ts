import { parseArgs } from "node:util";

import { compareCaptures } from "./compareCaptures.ts";
import { describeChanges } from "./describeChanges.ts";
import { writeReport } from "./writeReport.ts";

/**
 * Compares two capture directories and writes a report directory: `changes.json`,
 * the before, after, and diff images of every changed story, and an `index.html` that shows them.
 *
 * Usage: `node scripts/storybook-diff/compare.ts --before <dir> --after <dir> --out <dir> [--storybook-url <url>] [--base-label <text>]`
 */
const { values } = parseArgs({
  options: {
    before: { type: "string" },
    after: { type: "string" },
    out: { type: "string" },
    "storybook-url": { type: "string" },
    "base-label": { type: "string" },
  },
});

if (!values.before || !values.after || !values.out) {
  console.error(
    "Usage: node scripts/storybook-diff/compare.ts --before <dir> --after <dir> --out <dir> [--storybook-url <url>] [--base-label <text>]",
  );
  process.exit(2);
}

const report = await compareCaptures({
  beforeDir: values.before,
  afterDir: values.after,
  outputDir: values.out,
});
await writeReport(values.out, report, {
  storybookUrl: values["storybook-url"],
  baseLabel: values["base-label"],
});
console.log(describeChanges(report));
