import { readFileSync } from "node:fs";
import { join } from "node:path";
import { parseArgs } from "node:util";

import type { ComparisonReport } from "./compareCaptures.ts";
import { writeReport } from "./writeReport.ts";

/**
 * Rewrites an existing report's page from its `changes.json` with the current template, so the page can be tried or
 * worked on without capturing anything. A published report can be fetched from the gh-pages branch, as the README shows.
 *
 * Usage: `node scripts/storybook-diff/rerender.ts --report <dir> [--storybook-url <url>] [--base-label <text>] [--pull-request-url <url>]`
 */
const { values } = parseArgs({
  options: {
    report: { type: "string" },
    "storybook-url": { type: "string" },
    "base-label": { type: "string" },
    "pull-request-url": { type: "string" },
  },
});

if (!values.report) {
  console.error(
    "Usage: node scripts/storybook-diff/rerender.ts --report <dir> [--storybook-url <url>] [--base-label <text>] [--pull-request-url <url>]",
  );
  process.exit(2);
}

const report: ComparisonReport = JSON.parse(
  readFileSync(join(values.report, "changes.json"), "utf8"),
);
await writeReport(values.report, report, {
  storybookUrl: values["storybook-url"],
  baseLabel: values["base-label"],
  pullRequestUrl: values["pull-request-url"],
});
console.log(join(values.report, "index.html"));
