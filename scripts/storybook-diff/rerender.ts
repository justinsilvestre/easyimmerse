import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { parseArgs } from "node:util";

import { PNG } from "pngjs";

import type { ComparisonReport } from "./compareCaptures.ts";
import { changedArea } from "./diffImages.ts";
import { writeReport } from "./writeReport.ts";

/**
 * Rewrites an existing report's page from its `changes.json` with the current template, so the page can be tried or
 * worked on without capturing anything. A report made before the rectangles around changes were recorded gets them from
 * its diff images. A published report can be fetched from the gh-pages branch, as the README shows.
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
for (const change of report.changes) {
  change.changedAreas ??= {};
  for (const fileName of Object.keys(change.changedVariants)) {
    const diffPath = join(values.report, change.id, `diff-${fileName}`);
    const before = change.imageSizes[`before-${fileName}`];
    const after = change.imageSizes[`after-${fileName}`];
    if (
      fileName in change.changedAreas ||
      !existsSync(diffPath) ||
      !before ||
      !after
    )
      continue;
    const area = changedArea(
      PNG.sync.read(readFileSync(diffPath)),
      Math.min(before.width, after.width),
      Math.min(before.height, after.height),
    );
    if (area) change.changedAreas[fileName] = area;
  }
}
await writeReport(values.report, report, {
  storybookUrl: values["storybook-url"],
  baseLabel: values["base-label"],
  pullRequestUrl: values["pull-request-url"],
});
console.log(join(values.report, "index.html"));
