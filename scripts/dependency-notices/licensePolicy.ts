import { evaluateSpdxExpression } from "../ffmpeg-notices/spdxExpression.ts";

/**
 * The licenses a shipped dependency may use: the permissive licenses the project accepts,
 * and licenses that grant the same freedoms, such as public-domain dedications.
 */
const ALLOWED_LICENSES = new Set([
  "MIT",
  "MIT-0",
  "Apache-2.0",
  "BSD-2-Clause",
  "BSD-3-Clause",
  "ISC",
  "Zlib",
  "Unlicense",
  "MPL-2.0",
  "0BSD",
  "CC0-1.0",
  "Unicode-3.0",
  "Unicode-DFS-2016",
  "BSL-1.0",
]);

/** Rewrites the `MIT/Apache-2.0` form that older packages use into an SPDX expression. */
export function normalizeLicenseExpression(expression: string): string {
  return expression.replace(/\s*\/\s*/g, " OR ");
}

/** Reports whether a declared license lets the package ship. A missing or malformed expression does not. */
export function isAllowedLicense(expression: string | null): boolean {
  if (!expression) return false;
  try {
    return evaluateSpdxExpression(
      normalizeLicenseExpression(expression),
      (license) => ALLOWED_LICENSES.has(license),
    );
  } catch {
    return false;
  }
}
