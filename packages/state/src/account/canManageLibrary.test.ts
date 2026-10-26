import type { AccountUser } from "@easyimmerse/types";
import { describe, expect, it } from "vitest";
import { canManageLibrary } from "./canManageLibrary.ts";

const user = (changes: Partial<AccountUser>): AccountUser => ({
  id: "u1",
  email: "someone@example.com",
  role: "library_user",
  created_at_ms: 0,
  email_confirmed_at_ms: null,
  manages_library: false,
  ...changes,
});

describe("canManageLibrary", () => {
  it("lets the server's owner manage the library", () => {
    expect(canManageLibrary({ kind: "launch" })).toBe(true);
  });

  it("lets an administrator manage the library", () => {
    expect(
      canManageLibrary({
        kind: "account",
        user: user({ role: "administrator" }),
      }),
    ).toBe(true);
  });

  it("lets an account manage the library once it is let", () => {
    expect(
      canManageLibrary({
        kind: "account",
        user: user({ manages_library: true }),
      }),
    ).toBe(true);
  });

  it("keeps any other account from managing the library", () => {
    expect(canManageLibrary({ kind: "account", user: user({}) })).toBe(false);
  });

  it("keeps the library unmanaged while the principal is unknown", () => {
    expect(canManageLibrary(undefined)).toBe(false);
  });
});
