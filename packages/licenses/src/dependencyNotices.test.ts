import { describe, expect, it } from "vitest";
import {
  type DependencyNoticeData,
  expandDependencyNotices,
  type PackageNoticeData,
} from "./dependencyNotices.ts";

function packageData(overrides: Partial<PackageNoticeData>): PackageNoticeData {
  return {
    name: "cat",
    version: "1.0.0",
    license: "MIT",
    usedIn: ["server", "web app"],
    source: "https://example.com/cat",
    usesStandardTexts: false,
    files: [{ name: "LICENSE", text: 0 }],
    ...overrides,
  };
}

function expandOne(overrides: Partial<PackageNoticeData>) {
  const data: DependencyNoticeData = {
    texts: ["MIT text", "Apache text"],
    groups: [{ title: "Rust crates", packages: [packageData(overrides)] }],
  };
  return expandDependencyNotices(data)[0]?.notices[0];
}

describe("expandDependencyNotices", () => {
  it("titles a notice with the package's name and version", () => {
    expect(expandOne({})?.title).toBe("cat 1.0.0");
  });

  it("names the license, the artifacts, and the source before quoting each file", () => {
    const files = [
      { name: "LICENSE-MIT", text: 0 },
      { name: "LICENSE-APACHE", text: 1 },
    ];
    expect(expandOne({ files })?.text).toBe(
      "License: MIT\nUsed in: server, web app\nSource: https://example.com/cat\n\nLICENSE-MIT\n\nMIT text\n\nLICENSE-APACHE\n\nApache text",
    );
  });

  it("says when standard texts stand in for the package's own", () => {
    expect(expandOne({ usesStandardTexts: true })?.text).toContain(
      "The package ships no license file",
    );
  });

  it("keeps the groups' titles", () => {
    const data: DependencyNoticeData = {
      texts: [],
      groups: [{ title: "JavaScript packages", packages: [] }],
    };
    expect(expandDependencyNotices(data)[0]?.title).toBe("JavaScript packages");
  });
});
