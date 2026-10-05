import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  isAllowedLicense,
  normalizeLicenseExpression,
} from "./licensePolicy.ts";

describe("isAllowedLicense", () => {
  it("allows a choice that includes an allowed license", () => {
    assert.equal(isAllowedLicense("GPL-3.0-only OR MIT"), true);
  });

  it("allows the slash-separated form of a choice", () => {
    assert.equal(isAllowedLicense("MIT/Apache-2.0"), true);
  });

  it("allows an allowed license with an exception", () => {
    assert.equal(isAllowedLicense("Apache-2.0 WITH LLVM-exception"), true);
  });

  it("rejects a combination that includes a license outside the list", () => {
    assert.equal(isAllowedLicense("MIT AND GPL-3.0-only"), false);
  });

  it("rejects a missing license", () => {
    assert.equal(isAllowedLicense(null), false);
  });

  it("rejects a malformed expression", () => {
    assert.equal(isAllowedLicense("Apache 2.0"), false);
  });
});

describe("normalizeLicenseExpression", () => {
  it("spells a slash as OR", () => {
    assert.equal(
      normalizeLicenseExpression("Apache-2.0 / MIT"),
      "Apache-2.0 OR MIT",
    );
  });
});
