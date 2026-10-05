import { readFileSync } from "node:fs";

import type { DependencyNoticeData } from "../../packages/licenses/src/index.ts";
import { isAllowedLicense } from "./licensePolicy.ts";

/** A shipped package whose license is outside the allowed list. */
export interface Outlier {
  group: string;
  name: string;
  version: string;
  license: string | null;
}

/** A package whose license is outside the allowed list but has been reviewed, matched by name and license in any version. */
export interface AcceptedOutlier {
  group: string;
  name: string;
  license: string | null;
  reason: string;
}

/** Lists every shipped package whose license is outside the allowed list. */
export function findOutliers(data: DependencyNoticeData): Outlier[] {
  return data.groups.flatMap((group) =>
    group.packages
      .filter((found) => !isAllowedLicense(found.license))
      .map(({ name, version, license }) => ({
        group: group.title,
        name,
        version,
        license,
      })),
  );
}

/** Keeps the outliers that no accepted entry covers. */
export function findUnacceptedOutliers(
  outliers: Outlier[],
  accepted: AcceptedOutlier[],
): Outlier[] {
  return outliers.filter(
    (outlier) =>
      !accepted.some(
        (entry) =>
          entry.group === outlier.group &&
          entry.name === outlier.name &&
          entry.license === outlier.license,
      ),
  );
}

export function readAcceptedOutliers(): AcceptedOutlier[] {
  return JSON.parse(
    readFileSync(new URL("accepted-outliers.json", import.meta.url), "utf-8"),
  );
}

export function describeOutlier(outlier: Outlier): string {
  return `${outlier.group}: ${outlier.name} ${outlier.version} (${outlier.license ?? "no license declared"})`;
}
