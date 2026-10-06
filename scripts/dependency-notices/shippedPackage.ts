import type { Artifact } from "./artifacts.ts";

export type Ecosystem = "rust" | "npm";

/** A third-party package whose code ships in at least one artifact. */
export interface ShippedPackage {
  ecosystem: Ecosystem;
  name: string;
  version: string;
  /** The SPDX license expression the package declares, if any. */
  license: string | null;
  repository: string | null;
  authors: string[];
  /** Where the package's files are on disk, to read its license files from. */
  directory: string;
  usedIn: Set<Artifact>;
}

/** Collects packages by ecosystem, name, and version, merging the artifacts each is used in. */
export class ShippedPackages {
  readonly byKey = new Map<string, ShippedPackage>();

  add(found: Omit<ShippedPackage, "usedIn">, artifacts: Artifact[]): void {
    const key = `${found.ecosystem}:${found.name}@${found.version}`;
    const known = this.byKey.get(key);
    const shipped = known ?? { ...found, usedIn: new Set<Artifact>() };
    for (const artifact of artifacts) shipped.usedIn.add(artifact);
    this.byKey.set(key, shipped);
  }

  /** Lists the packages sorted by ecosystem, name, and version. */
  sorted(): ShippedPackage[] {
    return [...this.byKey.values()].sort(
      (a, b) =>
        a.ecosystem.localeCompare(b.ecosystem) ||
        a.name.localeCompare(b.name) ||
        a.version.localeCompare(b.version, undefined, { numeric: true }),
    );
  }
}
