import type { LicenseNotice } from "../../packages/licenses/src/index.ts";
import { libraries } from "./libraries.ts";
import type { AcceptedBuild } from "./noticePlan.ts";
import { labelPlatform } from "./platformLabels.ts";

/** Describes one ffmpeg build: its licence, origin, linked libraries, and configure flags. */
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
    `Third-party libraries linked: ${linked || "none"}`,
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
