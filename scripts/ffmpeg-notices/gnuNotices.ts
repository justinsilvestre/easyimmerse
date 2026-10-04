import type { LicenseNotice } from "../../packages/licenses/src/index.ts";
import { type AcceptedBuild, gnuLicenseUrls } from "./noticePlan.ts";
import { type LicenseTexts, quoteLicenseText } from "./quoteLicenseText.ts";

/**
 * Quotes the LGPL 2.1 that covers every build, and the LGPL 3.0 with the GPL 3.0 it
 * incorporates when any build is configured with `--enable-version3`.
 */
export function renderGnuNotices(
  builds: AcceptedBuild[],
  texts: LicenseTexts,
): LicenseNotice[] {
  const sources = [
    ...new Set(builds.map((accepted) => `- ${accepted.origin.sourceUrl}`)),
  ];
  const preamble = ["The FFmpeg source code is available at:", ...sources, ""];
  const notices = [
    gnuNotice(
      "GNU Lesser General Public License v2.1",
      gnuLicenseUrls.lgpl21,
      preamble,
      texts,
    ),
  ];
  if (builds.some((accepted) => accepted.isVersion3)) {
    notices.push(
      gnuNotice(
        "GNU Lesser General Public License v3.0",
        gnuLicenseUrls.lgpl3,
        preamble,
        texts,
      ),
      gnuNotice(
        "GNU General Public License v3.0",
        gnuLicenseUrls.gpl3,
        [
          "Version 3 of the GNU LGPL incorporates the terms of version 3 of the GNU GPL, reproduced here.",
          "",
        ],
        texts,
      ),
    );
  }
  return notices;
}

function gnuNotice(
  title: string,
  url: string,
  preamble: string[],
  texts: LicenseTexts,
): LicenseNotice {
  return {
    title,
    text: [...preamble, quoteLicenseText(url, texts)].join("\n"),
  };
}
