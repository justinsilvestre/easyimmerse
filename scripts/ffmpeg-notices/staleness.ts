import type { ManifestEntry } from "../fetch-ffmpeg/manifest.ts";
import type { RecordedBuild } from "./noticeInputs.ts";

/** Lists every way the recorded builds differ from the manifest's entries. */
export function findManifestChanges(
  manifest: Record<string, ManifestEntry>,
  builds: Record<string, RecordedBuild>,
): string[] {
  const triples = new Set([...Object.keys(manifest), ...Object.keys(builds)]);
  return [...triples].sort().flatMap((triple) => {
    const entry = manifest[triple];
    const build = builds[triple];
    if (!entry) return [`${triple} is recorded but no longer in the manifest`];
    if (!build) return [`${triple} is in the manifest but not recorded`];
    if (entry.sha256 !== build.sha256 || entry.url !== build.url) {
      return [
        `${triple} was recorded from a different archive than the manifest names`,
      ];
    }
    return [];
  });
}

/** Lists the output files whose content differs from what rendering produces now. */
export function findStaleOutputs(
  expected: Record<string, string>,
  actual: Record<string, string | null>,
): string[] {
  return Object.keys(expected)
    .filter((path) => actual[path] !== expected[path])
    .map((path) => `${path} is out of date`);
}
