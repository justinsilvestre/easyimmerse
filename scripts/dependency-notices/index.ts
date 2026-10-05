import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";

import type { DependencyNoticeData } from "../../packages/licenses/src/index.ts";
import { javaScriptBundles, rustTargets } from "./artifacts.ts";
import {
  hashFiles,
  hashText,
  listInputFiles,
  readRecordedInputs,
  writeRecordedInputs,
} from "./inputs.ts";
import {
  licensesToQuote,
  readLicenseFiles,
  readStandardTexts,
} from "./licenseTexts.ts";
import { buildNoticeData, type PackageTexts } from "./noticeData.ts";
import { addNpmPackages } from "./npmPackages.ts";
import {
  describeOutlier,
  findOutliers,
  findUnacceptedOutliers,
  readAcceptedOutliers,
} from "./outliers.ts";
import { addRustPackages } from "./rustPackages.ts";
import { type ShippedPackage, ShippedPackages } from "./shippedPackage.ts";

/**
 * Generates the license notices of every Rust crate and npm package that ships, or with `--check` verifies,
 * without running Cargo, that the committed notices match the manifests and lockfiles and that no shipped
 * license falls outside the allowed list unless `accepted-outliers.json` accepts it.
 * Generating runs `cargo metadata` for every shipped target, which downloads the crate sources that are missing.
 *
 * Usage: `node scripts/dependency-notices/index.ts [--check]`
 */
const { values } = parseArgs({
  options: { check: { type: "boolean", default: false } },
});

const repoRoot = fileURLToPath(new URL("../../", import.meta.url));
const outputPath = `${repoRoot}packages/licenses/src/generated/dependencyNotices.json`;

process.exitCode = values.check ? check() : generate();

function generate(): number {
  const packages = new ShippedPackages();
  addRustPackages(rustTargets, repoRoot, packages);
  addNpmPackages(javaScriptBundles, repoRoot, packages);
  const data = buildNoticeData(packages.sorted(), readPackageTexts);
  const output = `${JSON.stringify(data)}\n`;
  writeFileSync(outputPath, output);
  writeRecordedInputs({
    inputs: hashFiles(repoRoot, listInputFiles(repoRoot)),
    output: hashText(output),
  });
  const counts = data.groups.map(
    (group) => `${group.packages.length} ${group.title}`,
  );
  console.log(`Wrote notices for ${counts.join(" and ")}.`);
  return reportOutliers(data, true) ? 1 : 0;
}

function check(): number {
  const recorded = readRecordedInputs();
  const output = readFileSync(outputPath, "utf-8");
  const problems = [
    ...(recorded?.inputs === hashFiles(repoRoot, listInputFiles(repoRoot))
      ? []
      : [
          "The manifests, lockfiles, or generator changed since the notices were generated.",
        ]),
    ...(recorded?.output === hashText(output)
      ? []
      : [
          "packages/licenses/src/generated/dependencyNotices.json was edited by hand.",
        ]),
  ];
  for (const problem of problems) console.error(problem);
  if (problems.length > 0) {
    console.error("Run `mise run license-notices` and commit the result.");
  }
  const outliersFailed = reportOutliers(JSON.parse(output), false);
  return problems.length > 0 || outliersFailed ? 1 : 0;
}

function readPackageTexts(found: ShippedPackage): PackageTexts {
  const files = readLicenseFiles(found.directory);
  if (files.length > 0) return { texts: files, usesStandardTexts: false };
  const identifiers = found.license ? licensesToQuote(found.license) : [];
  if (identifiers.length === 0) {
    throw new Error(
      `${found.name} ${found.version} ships no license file and declares no license`,
    );
  }
  const authors =
    found.authors.length > 0 ? found.authors.join(", ") : "its authors";
  const texts = readStandardTexts(identifiers).map(({ name, text }) => ({
    name,
    text: `Copyright holders: ${authors}\n\n${text}`,
  }));
  return { texts, usesStandardTexts: true };
}

/** Prints the outliers, all of them when asked, and reports whether any is not accepted. */
function reportOutliers(data: DependencyNoticeData, listAll: boolean): boolean {
  const outliers = findOutliers(data);
  const unaccepted = findUnacceptedOutliers(outliers, readAcceptedOutliers());
  if (listAll && outliers.length > 0) {
    console.log(
      "\nShipped packages whose license is outside the allowed list:",
    );
    for (const outlier of outliers)
      console.log(`  - ${describeOutlier(outlier)}`);
  }
  if (unaccepted.length === 0) return false;
  console.error(
    "\nThese licenses are outside the allowed list and not in accepted-outliers.json:",
  );
  for (const outlier of unaccepted)
    console.error(`  - ${describeOutlier(outlier)}`);
  return true;
}
