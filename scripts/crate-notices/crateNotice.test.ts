import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { isLicenseFileName, renderCrateNotice } from "./crateNotice.ts";

describe("renderCrateNotice", () => {
  const crate = {
    name: "encoding_rs",
    version: "0.8.42",
    license: "(Apache-2.0 OR MIT) AND BSD-3-Clause",
    repository: "https://github.com/hsivonen/encoding_rs",
  };

  it("names the crate, its license, and its source before quoting each license file", () => {
    const notice = renderCrateNotice(crate, [
      { name: "LICENSE-MIT", text: "MIT text\n" },
      { name: "LICENSE-WHATWG", text: "BSD text\n" },
    ]);
    assert.equal(
      notice.text,
      "encoding_rs 0.8.42 is compiled into easyImmerse.\nLicense: (Apache-2.0 OR MIT) AND BSD-3-Clause\nSource code: https://github.com/hsivonen/encoding_rs\n\nLICENSE-MIT\n\nMIT text\n\nLICENSE-WHATWG\n\nBSD text",
    );
  });

  it("throws for a crate without a license file", () => {
    assert.throws(() => renderCrateNotice(crate, []));
  });
});

describe("isLicenseFileName", () => {
  it("accepts a license file with a suffix", () => {
    assert.equal(isLicenseFileName("LICENSE-APACHE.md"), true);
  });

  it("accepts a copyright file", () => {
    assert.equal(isLicenseFileName("COPYRIGHT"), true);
  });

  it("rejects a readme", () => {
    assert.equal(isLicenseFileName("README.md"), false);
  });
});
