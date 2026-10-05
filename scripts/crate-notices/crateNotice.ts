import type { LicenseNotice } from "../../packages/licenses/src/index.ts";

/** The fields of a package in `cargo metadata` output that a notice uses. */
export interface CratePackage {
  name: string;
  version: string;
  license: string | null;
  repository: string | null;
}

/** A license, copyright, or notice file shipped in a crate's source. */
export interface LicenseFile {
  name: string;
  text: string;
}

const LICENSE_FILE_NAME = /^(licen[cs]e|copying|copyright|notice)/i;

/** Reports whether a file in a crate's root directory holds license or copyright terms. */
export function isLicenseFileName(name: string): boolean {
  return LICENSE_FILE_NAME.test(name);
}

/** Names the crate, its license expression and source, and quotes every license file it ships. */
export function renderCrateNotice(
  crate: CratePackage,
  files: LicenseFile[],
): LicenseNotice {
  if (files.length === 0) {
    throw new Error(`${crate.name} ${crate.version} ships no license file`);
  }
  const header = [
    `${crate.name} ${crate.version} is compiled into easyImmerse.`,
    `License: ${crate.license ?? "unspecified"}`,
    ...(crate.repository ? [`Source code: ${crate.repository}`] : []),
  ];
  const quoted = files.map(({ name, text }) => `${name}\n\n${text.trim()}`);
  return {
    title: crate.name,
    text: [header.join("\n"), ...quoted].join("\n\n"),
  };
}
