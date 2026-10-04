import type { LicenseNotice } from "../../packages/licenses/src/index.ts";
import { type Library, type LibraryKey, libraries } from "./libraries.ts";
import type { AcceptedBuild } from "./noticePlan.ts";
import { labelPlatform } from "./platformLabels.ts";
import { type LicenseTexts, quoteLicenseText } from "./quoteLicenseText.ts";

/** Names a statically linked library, the platforms that link it, and quotes its license. */
export function renderLibraryNotice(
  library: Library,
  platforms: string[],
  texts: LicenseTexts,
): LicenseNotice {
  const text = [
    `${library.name} is statically linked into FFmpeg for ${platforms.join(", ")}.`,
    `License: ${library.license}`,
    `License text: ${library.licenseUrl}`,
    "",
    quoteLicenseText(library.licenseUrl, texts, library.licenseLineCount),
  ].join("\n");
  return { title: library.name, text };
}

/** Pairs each library the builds link with the platforms that link it, sorted by name. */
export function listLinkedLibraries(
  builds: AcceptedBuild[],
): [LibraryKey, string[]][] {
  const users = new Map<LibraryKey, string[]>();
  for (const accepted of builds) {
    for (const key of accepted.libraryKeys) {
      users.set(key, [
        ...(users.get(key) ?? []),
        labelPlatform(accepted.triple),
      ]);
    }
  }
  return [...users].sort(([a], [b]) =>
    libraries[a].name.localeCompare(libraries[b].name),
  );
}
