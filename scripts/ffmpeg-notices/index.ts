import { tmpdir } from "node:os";
import { join } from "node:path";
import { parseArgs } from "node:util";

import {
  hasVerifiedHash,
  type ManifestEntry,
  readManifest,
} from "../fetch-ffmpeg/manifest.ts";
import { readBuildConfiguration } from "./buildConfiguration.ts";
import { collectLicenseTexts } from "./licenseTexts.ts";
import {
  type RecordedBuild,
  readNoticeInputs,
  writeNoticeInputs,
} from "./noticeInputs.ts";
import { listLicenseUrls, type NoticePlan, planNotices } from "./noticePlan.ts";
import { renderNotices } from "./notices.ts";
import { readOutputs, renderOutputs, writeOutputs } from "./outputs.ts";
import { findManifestChanges, findStaleOutputs } from "./staleness.ts";

/**
 * Generates the license notices for the ffmpeg builds in the fetch-ffmpeg manifest, or with
 * `--check` verifies offline that the committed notices match the manifest and this script.
 *
 * Usage: `node scripts/ffmpeg-notices/index.ts [--check] [--refresh] [--cache-dir <dir>]`
 */
const { values } = parseArgs({
  options: {
    check: { type: "boolean", default: false },
    refresh: { type: "boolean", default: false },
    "cache-dir": {
      type: "string",
      default: join(tmpdir(), "easyimmerse-ffmpeg-archives"),
    },
  },
});

process.exitCode = values.check
  ? check()
  : await generate(values.refresh, values["cache-dir"]);

function check(): number {
  const inputs = readNoticeInputs();
  const plan = planNotices(inputs.builds);
  const expected = renderOutputs(renderNotices(plan, inputs.licenseTexts));
  const problems = [
    ...findManifestChanges(verifiedManifest(), inputs.builds),
    ...findStaleOutputs(expected, readOutputs(Object.keys(expected))),
  ];
  for (const problem of problems) console.error(problem);
  if (problems.length > 0)
    console.error("Run `mise run ffmpeg-notices` and commit the result.");
  return reportRejections(plan) || problems.length > 0 ? 1 : 0;
}

async function generate(refresh: boolean, cacheDir: string): Promise<number> {
  const previous = readNoticeInputs();
  const builds: Record<string, RecordedBuild> = {};
  for (const [triple, entry] of Object.entries(verifiedManifest())) {
    const known = previous.builds[triple];
    const isCurrent = known?.sha256 === entry.sha256 && known.url === entry.url;
    builds[triple] =
      known && isCurrent && !refresh
        ? known
        : await recordBuild(entry, cacheDir);
  }
  const plan = planNotices(builds);
  const licenseTexts = await collectLicenseTexts(
    listLicenseUrls(plan),
    previous.licenseTexts,
    refresh,
  );
  writeNoticeInputs({ builds, licenseTexts });
  writeOutputs(renderOutputs(renderNotices(plan, licenseTexts)));
  return reportRejections(plan) ? 1 : 0;
}

async function recordBuild(
  entry: ManifestEntry,
  cacheDir: string,
): Promise<RecordedBuild> {
  const configuration = await readBuildConfiguration(entry, cacheDir);
  return { url: entry.url, sha256: entry.sha256, configuration };
}

/** Entries whose hash is still a TODO cannot be fetched, so they have no notices yet. */
function verifiedManifest(): Record<string, ManifestEntry> {
  return Object.fromEntries(
    Object.entries(readManifest()).filter(([, entry]) =>
      hasVerifiedHash(entry),
    ),
  );
}

/** Prints why each rejected build may not be shipped, and returns whether any was rejected. */
function reportRejections(plan: NoticePlan): boolean {
  const rejected = Object.entries(plan.rejections);
  if (rejected.length === 0) return false;
  console.error(
    "\nThese ffmpeg builds break the license policy and must not be shipped:",
  );
  for (const [triple, problems] of rejected) {
    console.error(
      `\n${triple}:\n${problems.map((problem) => `  - ${problem}`).join("\n")}`,
    );
  }
  console.error(
    "\nReplace them in scripts/fetch-ffmpeg/manifest.json, or change the policy in scripts/ffmpeg-notices/.",
  );
  return true;
}
