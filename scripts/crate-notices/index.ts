import { execFileSync } from "node:child_process";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";

import type { LicenseNotice } from "../../packages/licenses/src/index.ts";
import { readOutputs, writeOutputs } from "../ffmpeg-notices/outputs.ts";
import { findStaleOutputs } from "../ffmpeg-notices/staleness.ts";
import {
  type CratePackage,
  isLicenseFileName,
  type LicenseFile,
  renderCrateNotice,
} from "./crateNotice.ts";

/**
 * Generates the license notices of the Rust crates listed in `crates.json`, quoting the license files
 * that each crate ships, or with `--check` verifies that the committed notices match `Cargo.lock`.
 * Runs `cargo metadata`, which downloads crate sources that are missing.
 *
 * Usage: `node scripts/crate-notices/index.ts [--check]`
 */
const { values } = parseArgs({
  options: { check: { type: "boolean", default: false } },
});

const repoRoot = fileURLToPath(new URL("../../", import.meta.url));
const outputPath = "packages/licenses/src/generated/crateNotices.json";

interface MetadataPackage extends CratePackage {
  manifest_path: string;
}

const outputs = { [outputPath]: renderOutput(collectNotices()) };
if (values.check) {
  const problems = findStaleOutputs(outputs, readOutputs([outputPath]));
  for (const problem of problems) console.error(problem);
  if (problems.length > 0) {
    console.error("Run `mise run crate-notices` and commit the result.");
    process.exitCode = 1;
  }
} else {
  writeOutputs(outputs);
}

function collectNotices(): LicenseNotice[] {
  const names: string[] = JSON.parse(
    readFileSync(new URL("crates.json", import.meta.url), "utf-8"),
  );
  const packages = readPackages();
  return names.flatMap((name) => {
    const versions = packages.filter((crate) => crate.name === name);
    if (versions.length === 0) throw new Error(`${name} is not in Cargo.lock`);
    return versions.map((crate) =>
      renderCrateNotice(crate, readLicenseFiles(dirname(crate.manifest_path))),
    );
  });
}

function readPackages(): MetadataPackage[] {
  const output = execFileSync(
    "cargo",
    ["metadata", "--format-version", "1", "--locked"],
    { cwd: repoRoot, encoding: "utf-8", maxBuffer: 512 * 1024 * 1024 },
  );
  return JSON.parse(output).packages;
}

function readLicenseFiles(directory: string): LicenseFile[] {
  return readdirSync(directory)
    .filter(isLicenseFileName)
    .filter((name) => statSync(join(directory, name)).isFile())
    .sort()
    .map((name) => ({
      name,
      text: readFileSync(join(directory, name), "utf-8").replace(/\r\n/g, "\n"),
    }));
}

function renderOutput(notices: LicenseNotice[]): string {
  return `${JSON.stringify(notices, null, 2)}\n`;
}
