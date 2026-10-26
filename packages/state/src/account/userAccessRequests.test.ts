import type { AccountRole, AccountUser } from "@easyimmerse/types";
import { describe, expect, it } from "vitest";
import { userAccessRequests } from "./userAccessRequests.ts";

const user = (role: AccountRole, managesLibrary = false): AccountUser => ({
  id: "u1",
  email: "someone@example.com",
  role,
  created_at_ms: 0,
  email_confirmed_at_ms: null,
  manages_library: managesLibrary,
});

const roleRequest = (role: AccountRole) => ({
  kind: "setUserRole",
  via: "self",
  userId: "u1",
  role,
});

const libraryRequest = (managesLibrary: boolean) => ({
  kind: "setLibraryManager",
  via: "self",
  userId: "u1",
  managesLibrary,
});

describe("userAccessRequests", () => {
  describe("for Server admin", () => {
    it("makes a learner a server admin", () => {
      expect(
        userAccessRequests("self", user("library_user"), "serverAdmin"),
      ).toEqual([roleRequest("administrator")]);
    });

    it("leaves a former server admin with full access and the library, as the menu showed", () => {
      expect(
        userAccessRequests("self", user("administrator"), "serverAdmin"),
      ).toEqual([roleRequest("privileged"), libraryRequest(true)]);
    });

    it("leaves the library permission alone when the server admin already had it", () => {
      expect(
        userAccessRequests("self", user("administrator", true), "serverAdmin"),
      ).toEqual([roleRequest("privileged")]);
    });
  });

  describe("for Full access", () => {
    it("gives a learner full access", () => {
      expect(
        userAccessRequests("self", user("library_user"), "fullAccess"),
      ).toEqual([roleRequest("privileged")]);
    });

    it("takes full access away", () => {
      expect(
        userAccessRequests("self", user("privileged"), "fullAccess"),
      ).toEqual([roleRequest("library_user")]);
    });

    it("changes nothing for a server admin, who always has it", () => {
      expect(
        userAccessRequests("self", user("administrator"), "fullAccess"),
      ).toEqual([]);
    });
  });

  describe("for Library admin", () => {
    it("lets a learner manage the library", () => {
      expect(
        userAccessRequests("self", user("library_user"), "libraryAdmin"),
      ).toEqual([libraryRequest(true)]);
    });

    it("stops a library admin managing the library", () => {
      expect(
        userAccessRequests("self", user("privileged", true), "libraryAdmin"),
      ).toEqual([libraryRequest(false)]);
    });

    it("changes nothing for a server admin, who always manages it", () => {
      expect(
        userAccessRequests("self", user("administrator"), "libraryAdmin"),
      ).toEqual([]);
    });
  });
});
