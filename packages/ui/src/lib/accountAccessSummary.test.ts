import { describe, expect, it } from "vitest";
import { accountAccessSummary } from "./accountAccessSummary.ts";

describe("accountAccessSummary", () => {
  it("names a server admin by that alone", () => {
    expect(
      accountAccessSummary({ role: "administrator", manages_library: false }),
    ).toBe("Server admin");
  });

  it("names a learner with no other access a learner", () => {
    expect(
      accountAccessSummary({ role: "library_user", manages_library: false }),
    ).toBe("Learner");
  });

  it("names a learner's full access", () => {
    expect(
      accountAccessSummary({ role: "privileged", manages_library: false }),
    ).toBe("Full access");
  });

  it("names a library admin with full access by both", () => {
    expect(
      accountAccessSummary({ role: "privileged", manages_library: true }),
    ).toBe("Library admin · Full access");
  });
});
