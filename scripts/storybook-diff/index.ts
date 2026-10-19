import { spawn } from "node:child_process";
import { rm } from "node:fs/promises";
import { join } from "node:path";
import { parseArgs } from "node:util";

import { captureCommitOnce, findMergeBase } from "./baseCapture.ts";
import { buildStorybook } from "./buildStorybook.ts";
import { captureStories, defaultConcurrency } from "./captureStories.ts";
import { compareCaptures } from "./compareCaptures.ts";
import { describeChanges } from "./describeChanges.ts";
import { repositoryRoot } from "./repositoryRoot.ts";
import { writeReport } from "./writeReport.ts";

/**
 * Shows which stories the working tree changes against a base branch, as before and after screenshots.
 * The base is the commit where the current branch left the base branch. Its Storybook is built in a
 * temporary worktree and its capture is kept under `.dev/storybook-diff/captures`, so later runs on the
 * same base skip straight to the working tree.
 *
 * Usage: `node scripts/storybook-diff/index.ts [--base <ref>] [--no-open]`
 */
const { values } = parseArgs({
  allowNegative: true,
  options: {
    base: { type: "string", default: "main" },
    open: { type: "boolean", default: true },
  },
});

const workDir = join(repositoryRoot, ".dev/storybook-diff");
const capturesDir = join(workDir, "captures");
const reportDir = join(workDir, "report");

const baseCommit = await findMergeBase(repositoryRoot, values.base);
const baseCapture = join(capturesDir, baseCommit);
await captureCommitOnce(repositoryRoot, baseCommit, workDir, baseCapture);

const workingCapture = join(capturesDir, "working");
await rm(workingCapture, { recursive: true, force: true });
const storybookDir = await buildStorybook(repositoryRoot);
await captureStories({
  storybookDir,
  outputDir: workingCapture,
  concurrency: defaultConcurrency(),
});

await rm(reportDir, { recursive: true, force: true });
const report = await compareCaptures({
  beforeDir: baseCapture,
  afterDir: workingCapture,
  outputDir: reportDir,
});
await writeReport(reportDir, report, {
  baseLabel: `${values.base} (${baseCommit.slice(0, 7)})`,
});

const reportPath = join(reportDir, "index.html");
console.log(`${describeChanges(report)}\nReport: ${reportPath}`);
if (values.open) openInBrowser(reportPath);

const openers: Partial<Record<NodeJS.Platform, string>> = {
  darwin: "open",
  win32: "start",
};

function openInBrowser(path: string): void {
  const opener = openers[process.platform] ?? "xdg-open";
  spawn(opener, [path], { detached: true, stdio: "ignore" }).unref();
}
