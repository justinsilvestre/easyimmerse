import { existsSync, readFileSync, realpathSync } from "node:fs";
import { basename, dirname, join } from "node:path";

import type { Artifact, JavaScriptBundle } from "./artifacts.ts";
import type { ShippedPackages } from "./shippedPackage.ts";

interface PackageJson {
  name: string;
  version: string;
  license?: unknown;
  licenses?: unknown;
  repository?: unknown;
  author?: unknown;
  dependencies?: Record<string, string>;
  optionalDependencies?: Record<string, string>;
}

/** The scope of the repository's own packages, whose code is not third-party. */
const WORKSPACE_SCOPE = "@easyimmerse/";
/** The scope of packages that hold only type declarations, which no bundle includes. */
const TYPES_SCOPE = "@types/";

/**
 * Adds the npm packages each bundle ships: the app's production dependencies, followed through the workspace packages
 * and installed packages they depend on, and the build-tool code that the build adds.
 * Type declaration packages are followed but not listed, since they hold no code.
 * Optional dependencies that are not installed, such as those for other platforms, are skipped.
 */
export function addNpmPackages(
  bundles: JavaScriptBundle[],
  repoRoot: string,
  packages: ShippedPackages,
): void {
  for (const bundle of bundles) {
    const appDirectory = join(repoRoot, bundle.app);
    for (const directory of walkProductionDependencies(appDirectory)) {
      addPackage(packages, directory, bundle.artifacts);
    }
    for (const chain of bundle.buildToolCode) {
      addPackage(packages, resolveChain(appDirectory, chain), bundle.artifacts);
    }
  }
}

/** Lists the directories of the third-party packages that a package reaches through production dependencies. */
export function walkProductionDependencies(root: string): string[] {
  const rootDirectory = realpathSync(root);
  const reached = new Set<string>();
  const thirdParty: string[] = [];
  const pending = [rootDirectory];
  for (let directory = pending.pop(); directory; directory = pending.pop()) {
    if (reached.has(directory)) continue;
    reached.add(directory);
    const manifest = readPackageJson(directory);
    if (directory !== rootDirectory && isBundledThirdParty(manifest)) {
      thirdParty.push(directory);
    }
    pending.push(...resolveDependencies(directory, manifest));
  }
  return thirdParty.sort();
}

function resolveDependencies(
  directory: string,
  manifest: PackageJson,
): string[] {
  const required = Object.keys(manifest.dependencies ?? {}).map((name) => {
    const found = resolvePackage(directory, name);
    if (!found)
      throw new Error(`${manifest.name} needs ${name}, which is not installed`);
    return found;
  });
  const optional = Object.keys(manifest.optionalDependencies ?? {})
    .map((name) => resolvePackage(directory, name))
    .filter((found) => found !== undefined);
  return [...required, ...optional];
}

/** Follows a chain of dependency names from a package directory to the last package's directory. */
export function resolveChain(start: string, chain: string[]): string {
  let directory = realpathSync(start);
  for (const name of chain) {
    const found = resolvePackage(directory, name);
    if (!found)
      throw new Error(`cannot resolve ${chain.join(" > ")} from ${start}`);
    directory = found;
  }
  return directory;
}

/** Finds an installed package as Node does: in the `node_modules` of the directory and of each directory above it. */
function resolvePackage(from: string, name: string): string | undefined {
  for (let directory = from; ; directory = dirname(directory)) {
    if (basename(directory) !== "node_modules") {
      const candidate = join(directory, "node_modules", name);
      if (existsSync(join(candidate, "package.json")))
        return realpathSync(candidate);
    }
    if (dirname(directory) === directory) return undefined;
  }
}

function isBundledThirdParty(manifest: PackageJson): boolean {
  return ![WORKSPACE_SCOPE, TYPES_SCOPE].some((scope) =>
    manifest.name.startsWith(scope),
  );
}

function readPackageJson(directory: string): PackageJson {
  return JSON.parse(readFileSync(join(directory, "package.json"), "utf-8"));
}

function addPackage(
  packages: ShippedPackages,
  directory: string,
  artifacts: Artifact[],
): void {
  const manifest = readPackageJson(directory);
  packages.add(
    {
      ecosystem: "npm",
      name: manifest.name,
      version: manifest.version,
      license: licenseExpression(manifest),
      repository: repositoryUrl(manifest.repository),
      authors: personName(manifest.author),
      directory,
    },
    artifacts,
  );
}

/** Reads the `license` field, or the deprecated `licenses` list, as an SPDX expression. */
export function licenseExpression(
  manifest: Pick<PackageJson, "license" | "licenses">,
): string | null {
  const declared = manifest.license ?? manifest.licenses;
  if (typeof declared === "string") return declared;
  const entries = Array.isArray(declared) ? declared : [declared];
  const types = entries
    .map((entry) => (entry as { type?: unknown } | undefined)?.type)
    .filter((type) => typeof type === "string");
  return types.length > 0 ? types.join(" OR ") : null;
}

function repositoryUrl(repository: unknown): string | null {
  const url =
    typeof repository === "string"
      ? repository
      : (repository as { url?: unknown } | undefined)?.url;
  return typeof url === "string"
    ? url.replace(/^git\+/, "").replace(/\.git$/, "")
    : null;
}

function personName(person: unknown): string[] {
  if (typeof person === "string") return [person];
  const name = (person as { name?: unknown } | undefined)?.name;
  return typeof name === "string" ? [name] : [];
}
