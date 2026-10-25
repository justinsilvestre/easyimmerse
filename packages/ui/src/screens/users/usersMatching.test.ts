import type { AccountUser } from "@easyimmerse/types";
import { describe, expect, it } from "vitest";
import { usersMatching } from "./usersMatching.ts";

const user = (email: string): AccountUser => ({
  id: email,
  email,
  role: "library_user",
  created_at_ms: 0,
  email_confirmed_at_ms: null,
  manages_library: false,
});

const users = [user("admin@example.com"), user("Reader@books.org")];

describe("usersMatching", () => {
  it("keeps every account for an empty search", () => {
    expect(usersMatching(users, "  ")).toEqual(users);
  });

  it("keeps the accounts whose email contains the search, whatever its case", () => {
    expect(usersMatching(users, "READER")).toEqual([users[1]]);
  });

  it("ignores spaces around the search", () => {
    expect(usersMatching(users, " books ")).toEqual([users[1]]);
  });
});
