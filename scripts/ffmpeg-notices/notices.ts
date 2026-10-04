import type { LicenseNotice } from "../../packages/licenses/src/index.ts";
import { renderBuildNotice } from "./buildNotice.ts";
import { renderGnuNotices } from "./gnuNotices.ts";
import { libraries } from "./libraries.ts";
import { listLinkedLibraries, renderLibraryNotice } from "./libraryNotice.ts";
import type { NoticePlan } from "./noticePlan.ts";
import type { LicenseTexts } from "./quoteLicenseText.ts";

/** Renders one notice per build, then the GNU licenses, then one per linked library. */
export function renderNotices(
  plan: NoticePlan,
  texts: LicenseTexts,
): LicenseNotice[] {
  const builds = plan.acceptedBuilds;
  if (builds.length === 0) return [];
  return [
    ...builds.map(renderBuildNotice),
    ...renderGnuNotices(builds, texts),
    ...listLinkedLibraries(builds).map(([key, users]) =>
      renderLibraryNotice(libraries[key], users, texts),
    ),
  ];
}

/** Joins the notices into one plain-text document. */
export function renderNoticesText(notices: LicenseNotice[]): string {
  return notices
    .map(
      ({ title, text }) => `${title}\n${"=".repeat(title.length)}\n\n${text}\n`,
    )
    .join("\n\n");
}
