import { describe, expect, it } from "vitest";
import { userManagementFailureMessage } from "./userManagementFailureMessage.ts";

const failure = (status: number, code: string) => ({
  status,
  code,
  message: "",
});

describe("userManagementFailureMessage", () => {
  it("tells that the only server admin cannot be deleted", () => {
    expect(
      userManagementFailureMessage(
        failure(409, "last_administrator"),
        "deleteUser",
      ),
    ).toBe(
      "You can't delete the server's only server admin. Make another account a server admin first.",
    );
  });

  it("tells that only a server admin may manage accounts", () => {
    expect(
      userManagementFailureMessage(failure(403, "forbidden"), "setUserRole"),
    ).toBe("Only a server admin may manage this server's accounts.");
  });

  it("tells of a password too short", () => {
    expect(
      userManagementFailureMessage(
        failure(400, "password_too_short"),
        "createUser",
      ),
    ).toBe("The password must be at least 8 characters long.");
  });

  it("tells of a password too long", () => {
    expect(
      userManagementFailureMessage(
        failure(400, "password_too_long"),
        "createUser",
      ),
    ).toBe("The password is too long.");
  });

  it("tells of an invalid email address", () => {
    expect(
      userManagementFailureMessage(failure(400, "invalid_email"), "createUser"),
    ).toBe("This email address is not valid.");
  });

  it("tells of a server that could not be reached", () => {
    expect(
      userManagementFailureMessage(
        { status: "NETWORK", message: "Failed to fetch" },
        "deleteUser",
      ),
    ).toBe(
      "The account could not be deleted, because the server could not be reached. Check your connection.",
    );
  });

  it("passes on the server's own message for another failure", () => {
    expect(
      userManagementFailureMessage(
        { status: 500, code: "internal", message: "The database is locked." },
        "createUser",
      ),
    ).toBe("The account could not be created: The database is locked.");
  });
});
