import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { isLicenseFileName, licensesToQuote } from "./licenseTexts.ts";

describe("licensesToQuote", () => {
  it("quotes the preferred alternative of a choice", () => {
    assert.deepEqual(licensesToQuote("Zlib OR Apache-2.0 OR MIT"), ["MIT"]);
  });

  it("quotes a license with its exception", () => {
    assert.deepEqual(licensesToQuote("Apache-2.0 WITH LLVM-exception"), [
      "Apache-2.0",
      "LLVM-exception",
    ]);
  });

  it("quotes every license of a combination", () => {
    assert.deepEqual(licensesToQuote("MIT AND BSD-3-Clause"), [
      "MIT",
      "BSD-3-Clause",
    ]);
  });
});

describe("isLicenseFileName", () => {
  it("accepts a license file with a suffix", () => {
    assert.equal(isLicenseFileName("LICENSE-APACHE.md"), true);
  });

  it("accepts a copyright file", () => {
    assert.equal(isLicenseFileName("COPYRIGHT"), true);
  });

  it("rejects a machine-readable SPDX file", () => {
    assert.equal(isLicenseFileName("LICENSE.spdx"), false);
  });

  it("rejects a readme", () => {
    assert.equal(isLicenseFileName("README.md"), false);
  });
});
