import type { LicenseNotice } from "../../packages/licenses/src/index.ts";
import { type Library, type LibraryKey, libraries } from "./libraries.ts";
import {
  type AcceptedBuild,
  gnuLicenseUrls,
  type NoticePlan,
} from "./noticePlan.ts";
import { labelPlatform } from "./platformLabels.ts";

type LicenseTexts = Record<string, string>;

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

export function renderBuildNotice(accepted: AcceptedBuild): LicenseNotice {
  const { triple, build, origin, configureArgs, libraryKeys } = accepted;
  const linked = libraryKeys.map((key) => libraries[key].name).join(", ");
  const text = [
    `easyImmerse runs FFmpeg (https://ffmpeg.org) as the separate programs ffmpeg and ffprobe. ${describeLicense(accepted)}`,
    "",
    `Platform: ${labelPlatform(triple)}, target ${triple}`,
    `Version: ${origin.version}`,
    `Source code: ${origin.sourceUrl}`,
    `Build origin: ${origin.builder}`,
    `Release: ${origin.releaseUrl}`,
    `Download: ${build.url}`,
    `SHA-256 of the download: ${build.sha256}`,
    `Statically linked libraries: ${linked || "none"}`,
    "",
    "Configure flags:",
    ...configureArgs.map(quoteConfigureArg),
  ].join("\n");
  return {
    title: `FFmpeg ${origin.version} for ${labelPlatform(triple)}`,
    text,
  };
}

/** Quotes an argument the way configure prints it when it contains whitespace. */
function quoteConfigureArg(arg: string): string {
  if (!/\s/.test(arg)) return arg;
  const [option, value] = arg.split(/=(.*)/s);
  return value === undefined ? `'${arg}'` : `${option}='${value}'`;
}

function describeLicense({ isVersion3 }: AcceptedBuild): string {
  const base =
    "FFmpeg is free software licensed under the GNU Lesser General Public License (LGPL) version 2.1 or later.";
  return isVersion3
    ? `${base} This build is configured with --enable-version3, so it is distributed under the LGPL version 3 or later.`
    : base;
}

function renderGnuNotices(
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
  return { title, text: [...preamble, quoteText(url, texts)].join("\n") };
}

function listLinkedLibraries(
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
    quoteText(library.licenseUrl, texts, library.licenseLineCount),
  ].join("\n");
  return { title: library.name, text };
}

function quoteText(
  url: string,
  texts: LicenseTexts,
  lineCount?: number,
): string {
  const text = texts[url];
  if (text === undefined) {
    throw new Error(
      `the license text from ${url} is missing; run \`mise run ffmpeg-notices\``,
    );
  }
  const lines = text.trimEnd().split("\n");
  return lines.slice(0, lineCount ?? lines.length).join("\n");
}

/** Joins the notices into one plain-text document. */
export function renderNoticesText(notices: LicenseNotice[]): string {
  return notices
    .map(
      ({ title, text }) => `${title}\n${"=".repeat(title.length)}\n\n${text}\n`,
    )
    .join("\n\n");
}
