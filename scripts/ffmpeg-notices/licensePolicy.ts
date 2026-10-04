import {
  featureLibraries,
  featuresWithoutLibraries,
  forbiddenFeatures,
} from "./featureLibraries.ts";
import { type LibraryKey, libraries } from "./libraries.ts";
import { evaluateSpdxExpression } from "./spdxExpression.ts";

/**
 * SPDX identifiers the bundled ffmpeg may contain: MIT, the BSD family, ISC, Zlib,
 * Apache-2.0, and the LGPL. Anything else needs an explicit decision first.
 */
const allowedLicenses = new Set([
  "Apache-2.0",
  "BSD-2-Clause",
  "BSD-3-Clause",
  "ISC",
  "LGPL-2.0-or-later",
  "LGPL-2.1-only",
  "LGPL-2.1-or-later",
  "LGPL-3.0-or-later",
  "MIT",
  "Zlib",
  // Variants of the MIT or BSD licenses under their own SPDX identifiers.
  "0BSD",
  "BSD-2-Clause-Patent",
  "BSD-3-Clause-Clear",
  "HPND-sell-variant",
  "MIT-Modern-Variant",
  "X11",
]);

/** Accepts an SPDX expression when its allowed licenses alone satisfy it. */
export function isAllowedLicense(expression: string): boolean {
  return evaluateSpdxExpression(expression, (license) =>
    allowedLicenses.has(license),
  );
}

/** The libraries a build links, and every reason it may not be shipped. */
export interface LibraryAssessment {
  libraryKeys: LibraryKey[];
  problems: string[];
}

export function assessFeatures(features: string[]): LibraryAssessment {
  const keys = new Set<LibraryKey>();
  const problems: string[] = [];
  for (const feature of features) {
    const reason = forbiddenFeatures[feature];
    if (reason !== undefined) {
      problems.push(`--enable-${feature} is not allowed: ${reason}`);
    } else if (featureLibraries[feature]) {
      for (const key of featureLibraries[feature]) keys.add(key);
    } else if (!featuresWithoutLibraries.has(feature)) {
      problems.push(`no license information for feature "${feature}"`);
    }
  }
  const libraryKeys = [...keys].sort();
  return {
    libraryKeys,
    problems: [...problems, ...licenseProblems(libraryKeys)],
  };
}

function licenseProblems(keys: LibraryKey[]): string[] {
  return keys
    .filter((key) => !isAllowedLicense(libraries[key].license))
    .map((key) => `${libraries[key].name} is ${libraries[key].license}`);
}
