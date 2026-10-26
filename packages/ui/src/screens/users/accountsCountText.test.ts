import type { AccountUser, UsersPage } from "@easyimmerse/types";
import { describe, expect, it } from "vitest";
import { accountsCountText } from "./accountsCountText.ts";

const user = (index: number): AccountUser => ({
  id: `u${index}`,
  email: `user${index}@example.com`,
  role: "library_user",
  created_at_ms: 0,
  email_confirmed_at_ms: null,
  manages_library: false,
});

/** A page of `count` accounts out of `total`. */
const listedPage = (count: number, total: number): UsersPage => ({
  users: Array.from({ length: count }, (_, index) => user(index)),
  total,
});

describe("accountsCountText", () => {
  describe("while the search is blank", () => {
    it("counts the accounts when they fit on one page", () => {
      expect(accountsCountText(listedPage(3, 3), 0, "")).toBe("3 accounts");
    });

    it("counts a single account in the singular", () => {
      expect(accountsCountText(listedPage(1, 1), 0, "")).toBe("1 account");
    });

    it("tells which accounts a later page shows", () => {
      expect(accountsCountText(listedPage(20, 120), 2, "")).toBe(
        "Accounts 101–120 of 120.",
      );
    });

    it("tells when a page past the last account is empty", () => {
      expect(accountsCountText(listedPage(0, 50), 1, "")).toBe(
        "This page has no accounts left.",
      );
    });
  });

  describe("while searching", () => {
    it("counts the matching accounts when they fit on one page", () => {
      expect(accountsCountText(listedPage(2, 2), 0, "user")).toBe(
        "2 accounts match.",
      );
    });

    it("counts a single match in the singular", () => {
      expect(accountsCountText(listedPage(1, 1), 0, "user")).toBe(
        "1 account matches.",
      );
    });

    it("tells which matching accounts the page shows", () => {
      expect(accountsCountText(listedPage(50, 75), 0, "user")).toBe(
        "Matching accounts 1–50 of 75.",
      );
    });

    it("tells when no account matches", () => {
      expect(accountsCountText(listedPage(0, 0), 0, "nobody")).toBe(
        "No account's email address contains “nobody”.",
      );
    });
  });
});
