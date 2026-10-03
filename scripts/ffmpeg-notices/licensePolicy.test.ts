import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { assessFeatures, isAllowedLicense } from "./licensePolicy.ts";

describe("isAllowedLicense", () => {
  it("accepts an allowed license", () => {
    assert.equal(isAllowedLicense("BSD-3-Clause"), true);
  });

  it("rejects MPL-2.0", () => {
    assert.equal(isAllowedLicense("MPL-2.0"), false);
  });

  it("accepts a choice with one allowed option", () => {
    assert.equal(isAllowedLicense("LGPL-2.1-only OR MPL-1.1"), true);
  });

  it("rejects a combination with one disallowed term", () => {
    assert.equal(isAllowedLicense("MIT AND GPL-2.0-only"), false);
  });

  it("judges a license with an exception by its base license", () => {
    assert.equal(isAllowedLicense("BSD-3-Clause WITH PCRE2-exception"), true);
  });
});

describe("assessFeatures", () => {
  it("lists the libraries of each feature with their dependencies", () => {
    const { libraryKeys } = assessFeatures(["libvorbis"]);
    assert.deepEqual(libraryKeys, ["ogg", "vorbis"]);
  });

  it("lists no libraries for features that link none", () => {
    assert.deepEqual(assessFeatures(["version3", "static"]), {
      libraryKeys: [],
      problems: [],
    });
  });

  it("reports a library under a disallowed license", () => {
    const { problems } = assessFeatures(["libzmq"]);
    assert.deepEqual(problems, ["ZeroMQ (libzmq) is MPL-2.0"]);
  });

  it("reports a feature missing from the table", () => {
    const { problems } = assessFeatures(["libunknown"]);
    assert.deepEqual(problems, [
      'no license information for feature "libunknown"',
    ]);
  });

  it("reports a GPL build", () => {
    const { problems } = assessFeatures(["gpl"]);
    assert.deepEqual(problems, ["--enable-gpl is not allowed"]);
  });
});
