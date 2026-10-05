import { createHash } from "node:crypto";
import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

/** The hashes that let `--check` tell, without running Cargo, whether the notices are current. */
export interface RecordedInputs {
  /** A hash of the manifests, lockfiles, and generator sources the notices were generated from. */
  inputs: string;
  /** A hash of the generated notices, so that a hand edit is noticed. */
  output: string;
}

const recordPath = new URL("inputs.json", import.meta.url);

/** Lists the files whose contents decide which packages ship and how their notices read. */
export function listInputFiles(repoRoot: string): string[] {
  const manifestDirectories = [
    ".",
    "apps/server",
    "apps/native/src-tauri",
    ...childDirectories(repoRoot, "crates"),
  ];
  const packageDirectories = [
    ".",
    ...childDirectories(repoRoot, "apps"),
    ...childDirectories(repoRoot, "packages"),
  ];
  return [
    "Cargo.lock",
    "pnpm-lock.yaml",
    ...manifestDirectories.map((directory) => join(directory, "Cargo.toml")),
    ...packageDirectories.map((directory) => join(directory, "package.json")),
    ...generatorSources(repoRoot),
  ].filter((path) => existsSync(join(repoRoot, path)));
}

function childDirectories(repoRoot: string, parent: string): string[] {
  return readdirSync(join(repoRoot, parent), { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => join(parent, entry.name))
    .sort();
}

function generatorSources(repoRoot: string): string[] {
  const directory = "scripts/dependency-notices";
  const sources = readdirSync(join(repoRoot, directory))
    .filter((name) => name.endsWith(".ts") && !name.endsWith(".test.ts"))
    .map((name) => join(directory, name));
  const texts = readdirSync(join(repoRoot, directory, "standard-texts")).map(
    (name) => join(directory, "standard-texts", name),
  );
  return [
    ...sources,
    ...texts,
    "scripts/ffmpeg-notices/spdxExpression.ts",
  ].sort();
}

/** Hashes the paths and contents of the files, in order. */
export function hashFiles(repoRoot: string, paths: string[]): string {
  const hash = createHash("sha256");
  for (const path of paths) {
    hash.update(`${path}\0`);
    hash.update(readFileSync(join(repoRoot, path)));
    hash.update("\0");
  }
  return hash.digest("hex");
}

export function hashText(text: string): string {
  return createHash("sha256").update(text).digest("hex");
}

export function readRecordedInputs(): RecordedInputs | null {
  return existsSync(recordPath)
    ? JSON.parse(readFileSync(recordPath, "utf-8"))
    : null;
}

export function writeRecordedInputs(recorded: RecordedInputs): void {
  writeFileSync(recordPath, `${JSON.stringify(recorded, null, 2)}\n`);
}
