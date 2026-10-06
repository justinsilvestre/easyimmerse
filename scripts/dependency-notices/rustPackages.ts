import { execFileSync } from "node:child_process";
import { dirname } from "node:path";

import type { Artifact, RustTarget } from "./artifacts.ts";
import type { ShippedPackages } from "./shippedPackage.ts";

interface MetadataPackage {
  id: string;
  name: string;
  version: string;
  license: string | null;
  repository: string | null;
  authors: string[];
  source: string | null;
  manifest_path: string;
}

interface MetadataNode {
  id: string;
  deps: { pkg: string; dep_kinds: { kind: string | null }[] }[];
}

/** The parts of `cargo metadata` output that the walk reads. */
export interface Metadata {
  packages: MetadataPackage[];
  resolve: { nodes: MetadataNode[] };
}

/**
 * Adds the registry and git crates that each target's root crates depend on through normal dependencies.
 * Normal dependencies include procedural macros, whose expansions are compiled in; build and dev dependencies are left out.
 * `cargo metadata` resolves features for the whole workspace, so a crate enabled only for another workspace member may be counted too.
 */
export function addRustPackages(
  targets: RustTarget[],
  repoRoot: string,
  packages: ShippedPackages,
): void {
  for (const target of targets) {
    const metadata = readMetadata(repoRoot, target.triple);
    for (const root of target.roots) {
      for (const found of walkNormalDependencies(metadata, root.crate)) {
        addPackage(packages, found, root.artifacts);
      }
    }
  }
}

function readMetadata(repoRoot: string, triple: string): Metadata {
  const output = execFileSync(
    "cargo",
    [
      "metadata",
      "--format-version",
      "1",
      "--locked",
      "--filter-platform",
      triple,
    ],
    { cwd: repoRoot, encoding: "utf-8", maxBuffer: 512 * 1024 * 1024 },
  );
  return JSON.parse(output);
}

/** Lists the third-party packages that the workspace crate named `rootName` reaches through normal dependencies. */
export function walkNormalDependencies(
  metadata: Metadata,
  rootName: string,
): MetadataPackage[] {
  const packagesById = new Map(
    metadata.packages.map((found) => [found.id, found]),
  );
  const nodesById = new Map(
    metadata.resolve.nodes.map((node) => [node.id, node]),
  );
  const root = metadata.packages.find(
    (found) => found.name === rootName && found.source === null,
  );
  if (!root) throw new Error(`${rootName} is not a workspace crate`);
  const reached = new Set<string>();
  const pending = [root.id];
  for (let id = pending.pop(); id !== undefined; id = pending.pop()) {
    if (reached.has(id)) continue;
    reached.add(id);
    for (const dep of nodesById.get(id)?.deps ?? []) {
      if (dep.dep_kinds.some((kind) => kind.kind === null))
        pending.push(dep.pkg);
    }
  }
  return [...reached]
    .map((id) => packagesById.get(id))
    .filter(
      (found): found is MetadataPackage =>
        found !== undefined && found.source !== null,
    );
}

function addPackage(
  packages: ShippedPackages,
  found: MetadataPackage,
  artifacts: Artifact[],
): void {
  packages.add(
    {
      ecosystem: "rust",
      name: found.name,
      version: found.version,
      license: found.license,
      repository: found.repository,
      authors: found.authors,
      directory: dirname(found.manifest_path),
    },
    artifacts,
  );
}
