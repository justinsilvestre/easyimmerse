import { describe, expect, it } from "vitest";
import { mailedLinkFailureMessage } from "./mailedLinkFailureMessage.ts";

const serverUrl = "https://books.example.org";

const invalidLink = { status: 400, code: "invalid_link", message: "" };

describe("mailedLinkFailureMessage", () => {
  it("points an offline app to a new confirmation link after logging in", () => {
    expect(
      mailedLinkFailureMessage("confirmEmail", invalidLink, serverUrl, false),
    ).toBe(
      "This confirmation link is no longer valid. You can ask for a new one after logging in.",
    );
  });

  it("tells a connected app only that the confirmation link is no longer valid", () => {
    expect(
      mailedLinkFailureMessage("confirmEmail", invalidLink, serverUrl, true),
    ).toBe("This confirmation link is no longer valid.");
  });

  it("points to the login form for a new reset link", () => {
    expect(
      mailedLinkFailureMessage("resetPassword", invalidLink, serverUrl, false),
    ).toBe(
      "This link is no longer valid. Ask for a new one from the login form.",
    );
  });

  it("tells of a new password too short as signing up does", () => {
    expect(
      mailedLinkFailureMessage(
        "resetPassword",
        { status: 400, code: "password_too_short", message: "" },
        serverUrl,
        false,
      ),
    ).toBe("The password must be at least 8 characters long.");
  });

  it("names what the server could not do otherwise", () => {
    expect(
      mailedLinkFailureMessage(
        "confirmEmail",
        { status: 500, message: "Disk full." },
        serverUrl,
        false,
      ),
    ).toBe("The server could not confirm your email address: Disk full.");
  });
});
