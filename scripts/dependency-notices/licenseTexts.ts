import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

import { normalizeLicenseExpression } from "./licensePolicy.ts";

/** A license, copyright, or notice file shipped in a package, or a standard license text standing in for one. */
export interface LicenseText {
  name: string;
  text: string;
}

const LICENSE_FILE_NAME = /^(licen[cs]e|copying|copyright|notice)/i;
/** The licenses to quote when a package that ships no license file offers a choice, most preferred first. */
const PREFERRED_LICENSES = [
  "MIT",
  "MIT-0",
  "0BSD",
  "ISC",
  "BSD-2-Clause",
  "BSD-3-Clause",
  "Zlib",
  "Apache-2.0",
  "Unlicense",
  "CC0-1.0",
  "BSL-1.0",
  "Unicode-3.0",
  "MPL-2.0",
];

/**
 * Reports whether a file in a package's root directory holds license or copyright terms.
 * A `.spdx` file only names the license in a machine-readable form, so it does not count.
 */
export function isLicenseFileName(name: string): boolean {
  return LICENSE_FILE_NAME.test(name) && !name.endsWith(".spdx");
}

/** Reads the license, copyright, and notice files in a package's root directory, sorted by name. */
export function readLicenseFiles(directory: string): LicenseText[] {
  return readdirSync(directory)
    .filter(isLicenseFileName)
    .filter((name) => statSync(join(directory, name)).isFile())
    .sort()
    .map((name) => ({ name, text: readText(join(directory, name)) }));
}

/**
 * Lists the SPDX identifiers whose standard texts stand in for the license files of a package that ships none:
 * the preferred alternative of a choice, or every license and exception of a combination.
 */
export function licensesToQuote(expression: string): string[] {
  const identifiers = normalizeLicenseExpression(expression)
    .split(/[\s()]+/)
    .filter((token) => token && !["AND", "OR", "WITH"].includes(token));
  if (/\bAND\b/.test(expression)) return [...new Set(identifiers)];
  const exceptions = identifiers.filter((id) => id.endsWith("-exception"));
  const chosen =
    PREFERRED_LICENSES.find((id) => identifiers.includes(id)) ?? identifiers[0];
  const exception = /\bOR\b/.test(expression) ? [] : exceptions;
  return chosen ? [chosen, ...exception] : [];
}

/** Reads the standard SPDX texts kept beside this script. Throws for an identifier without one. */
export function readStandardTexts(identifiers: string[]): LicenseText[] {
  return identifiers.map((id) => ({
    name: `${id} (standard text)`,
    text: readText(new URL(`standard-texts/${id}.txt`, import.meta.url)),
  }));
}

function readText(path: string | URL): string {
  return readFileSync(path, "utf-8").replace(/\r\n/g, "\n").trim();
}
