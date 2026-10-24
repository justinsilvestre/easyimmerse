import { existsSync, readFileSync } from "node:fs";
import { writeFile } from "node:fs/promises";
import { join } from "node:path";
import { parseArgs } from "node:util";

import { PNG } from "pngjs";

import { variantFileName } from "./captureVariants.ts";
import type { ComparisonReport } from "./compareCaptures.ts";
import { contentColumns } from "./contentColumns.ts";
import { writeReport } from "./writeReport.ts";

/**
 * Rewrites an existing report's page from its `changes.json` and images, with the current template, so the page can be
 * tried or worked on without capturing anything. Each story's content columns are measured again, so a report made before
 * they were recorded gets them too. A published report can be fetched from the gh-pages branch, as the README shows.
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

const reportDir = values.report;
const report: ComparisonReport = JSON.parse(
  readFileSync(join(reportDir, "changes.json"), "utf8"),
);
for (const change of report.changes) {
  change.contentColumns = {};
  for (const fileName of report.variants.map(variantFileName)) {
    const screenshots = ["before", "after"]
      .map((side) => join(reportDir, change.id, `${side}-${fileName}`))
      .filter((path) => existsSync(path))
      .map((path) => PNG.sync.read(readFileSync(path)));
    const content = screenshots.length && contentColumns(screenshots);
    if (content) change.contentColumns[fileName] = content;
  }
}
await writeFile(
  join(reportDir, "changes.json"),
  JSON.stringify(report, null, 2),
);
await writeReport(reportDir, report, {
  storybookUrl: values["storybook-url"],
  baseLabel: values["base-label"],
  pullRequestUrl: values["pull-request-url"],
});
console.log(join(reportDir, "index.html"));
