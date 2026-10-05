import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { licenseExpression } from "./npmPackages.ts";

describe("licenseExpression", () => {
  it("reads a license string", () => {
    assert.equal(licenseExpression({ license: "MIT" }), "MIT");
  });

  it("joins a deprecated list of licenses as a choice", () => {
    const licenses = [{ type: "MIT" }, { type: "Apache-2.0" }];
    assert.equal(licenseExpression({ licenses }), "MIT OR Apache-2.0");
  });

  it("reads nothing from a package that declares no license", () => {
    assert.equal(licenseExpression({}), null);
  });
});
