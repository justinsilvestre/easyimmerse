import { type BuildOrigin, describeBuildOrigin } from "./buildOrigin.ts";
import { listEnabledFeatures, parseConfigureLine } from "./configureLine.ts";
import { type LibraryKey, libraries } from "./libraries.ts";
import { assessFeatures } from "./licensePolicy.ts";
import type { RecordedBuild } from "./noticeInputs.ts";

/** A build that passed the license policy, with what its notice needs. */
export interface AcceptedBuild {
  triple: string;
  build: RecordedBuild;
  origin: BuildOrigin;
  configureArgs: string[];
  libraryKeys: LibraryKey[];
  /** Whether the build is distributed under LGPL version 3 rather than 2.1. */
  isVersion3: boolean;
}

export interface NoticePlan {
  acceptedBuilds: AcceptedBuild[];
  /** The reasons each rejected build may not be shipped, keyed by target triple. */
  rejections: Record<string, string[]>;
}

export const gnuLicenseUrls = {
  lgpl21:
    "https://raw.githubusercontent.com/FFmpeg/FFmpeg/master/COPYING.LGPLv2.1",
  lgpl3:
    "https://raw.githubusercontent.com/FFmpeg/FFmpeg/master/COPYING.LGPLv3",
  gpl3: "https://raw.githubusercontent.com/FFmpeg/FFmpeg/master/COPYING.GPLv3",
};

export function planNotices(builds: Record<string, RecordedBuild>): NoticePlan {
  const plan: NoticePlan = { acceptedBuilds: [], rejections: {} };
  for (const [triple, build] of Object.entries(builds)) {
    const configureArgs = parseConfigureLine(build.configuration);
    const { libraryKeys, problems } = assessFeatures(
      listEnabledFeatures(configureArgs),
    );
    if (problems.length > 0) plan.rejections[triple] = problems;
    else {
      const origin = describeBuildOrigin(build.url);
      const isVersion3 = configureArgs.includes("--enable-version3");
      plan.acceptedBuilds.push({
        triple,
        build,
        origin,
        configureArgs,
        libraryKeys,
        isVersion3,
      });
    }
  }
  return plan;
}

/** Lists the URLs of every license text the plan's notices quote. */
export function listLicenseUrls(plan: NoticePlan): string[] {
  const urls = new Set<string>();
  if (plan.acceptedBuilds.length > 0) urls.add(gnuLicenseUrls.lgpl21);
  if (plan.acceptedBuilds.some((accepted) => accepted.isVersion3)) {
    urls.add(gnuLicenseUrls.lgpl3);
    urls.add(gnuLicenseUrls.gpl3);
  }
  for (const key of plan.acceptedBuilds.flatMap(
    (accepted) => accepted.libraryKeys,
  )) {
    urls.add(libraries[key].licenseUrl);
  }
  return [...urls].sort();
}
