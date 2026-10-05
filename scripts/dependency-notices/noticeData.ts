import type {
  DependencyNoticeData,
  PackageNoticeData,
} from "../../packages/licenses/src/index.ts";
import type { LicenseText } from "./licenseTexts.ts";
import type { Ecosystem, ShippedPackage } from "./shippedPackage.ts";

/** The license texts of one package, and whether they are standard texts standing in for files it lacks. */
export interface PackageTexts {
  texts: LicenseText[];
  usesStandardTexts: boolean;
}

const GROUP_TITLES: Record<Ecosystem, string> = {
  rust: "Rust crates",
  npm: "JavaScript packages",
};

/** Builds the stored notice data, grouping packages by ecosystem and storing each distinct license text once. */
export function buildNoticeData(
  packages: ShippedPackage[],
  readTexts: (found: ShippedPackage) => PackageTexts,
): DependencyNoticeData {
  const texts: string[] = [];
  const positions = new Map<string, number>();
  const store = (text: string) => {
    const known = positions.get(text);
    if (known !== undefined) return known;
    positions.set(text, texts.length);
    return texts.push(text) - 1;
  };
  const groups = (Object.keys(GROUP_TITLES) as Ecosystem[]).map(
    (ecosystem) => ({
      title: GROUP_TITLES[ecosystem],
      packages: packages
        .filter((found) => found.ecosystem === ecosystem)
        .map((found) => packageData(found, readTexts(found), store)),
    }),
  );
  return { texts, groups };
}

function packageData(
  found: ShippedPackage,
  { texts, usesStandardTexts }: PackageTexts,
  store: (text: string) => number,
): PackageNoticeData {
  return {
    name: found.name,
    version: found.version,
    license: found.license,
    usedIn: [...found.usedIn].sort(),
    source: found.repository,
    usesStandardTexts,
    files: texts.map(({ name, text }) => ({ name, text: store(text) })),
  };
}
