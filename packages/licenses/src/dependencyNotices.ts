import type { LicenseNotice, LicenseNoticeGroup } from "./licenseNotice.ts";

/**
 * The license notices of the third-party packages that ship, as `mise run license-notices` writes them.
 * Each license text is stored once, because many packages ship the same one.
 */
export interface DependencyNoticeData {
  texts: string[];
  groups: { title: string; packages: PackageNoticeData[] }[];
}

export interface PackageNoticeData {
  name: string;
  version: string;
  /** The SPDX license expression the package declares, or null when it declares none. */
  license: string | null;
  /** The artifacts the package ships in. */
  usedIn: string[];
  source: string | null;
  /** Whether the package ships no license file, so that standard license texts stand in for its own. */
  usesStandardTexts: boolean;
  /** Each license file, naming its text by position in `texts`. */
  files: { name: string; text: number }[];
}

/** Turns the stored data into one notice per package, grouped as stored. */
export function expandDependencyNotices(
  data: DependencyNoticeData,
): LicenseNoticeGroup[] {
  return data.groups.map((group) => ({
    title: group.title,
    notices: group.packages.map((found) => packageNotice(found, data.texts)),
  }));
}

function packageNotice(
  found: PackageNoticeData,
  texts: readonly string[],
): LicenseNotice {
  const header = [
    `License: ${found.license ?? "not declared"}`,
    `Used in: ${found.usedIn.join(", ")}`,
    ...(found.source ? [`Source: ${found.source}`] : []),
    ...(found.usesStandardTexts
      ? ["The package ships no license file, so the standard text follows."]
      : []),
  ].join("\n");
  const quoted = found.files.map(
    (file) => `${file.name}\n\n${texts[file.text] ?? ""}`,
  );
  return {
    title: `${found.name} ${found.version}`,
    text: [header, ...quoted].join("\n\n"),
  };
}
