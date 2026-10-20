import { describe, expect, it } from "vitest";
import { signInFailureMessage } from "./signInFailureMessage.ts";

const serverUrl = "https://books.example.org";

describe("signInFailureMessage", () => {
  it("tells of a wrong email or password", () => {
    expect(
      signInFailureMessage(
        { status: 401, code: "invalid_credentials", message: "" },
        serverUrl,
      ),
    ).toBe("The email address or the password is wrong.");
  });

  it("tells of an email address already taken", () => {
    expect(
      signInFailureMessage(
        { status: 409, code: "email_taken", message: "" },
        serverUrl,
      ),
    ).toBe(
      "An account with this email address already exists. Log in instead.",
    );
  });

  it("tells of a password too short", () => {
    expect(
      signInFailureMessage(
        { status: 400, code: "password_too_short", message: "" },
        serverUrl,
      ),
    ).toBe("The password must be at least 8 characters long.");
  });

  it("tells of an invalid email address", () => {
    expect(
      signInFailureMessage(
        { status: 400, code: "invalid_email", message: "" },
        serverUrl,
      ),
    ).toBe("This email address is not valid.");
  });

  it("names the address of a server it could not reach", () => {
    expect(
      signInFailureMessage({ status: "NETWORK", message: "" }, serverUrl),
    ).toBe(
      "Couldn't reach a server at https://books.example.org. Check the address and your connection.",
    );
  });

  it("tells of an answer that is not an easyImmerse server's", () => {
    expect(
      signInFailureMessage({ status: "NO_DATA", message: "" }, serverUrl),
    ).toBe(
      "The server at https://books.example.org did not answer as an easyImmerse server does. Check the address.",
    );
  });

  it("tells how many minutes to wait after too many attempts", () => {
    expect(
      signInFailureMessage(
        {
          status: 429,
          code: "too_many_attempts",
          message: "",
          retryAfterSeconds: 290,
        },
        serverUrl,
      ),
    ).toBe("Too many attempts. Try again in 5 minutes.");
  });

  it("asks to wait a minute when the server asks for less", () => {
    expect(
      signInFailureMessage(
        {
          status: 429,
          code: "too_many_attempts",
          message: "",
          retryAfterSeconds: 20,
        },
        serverUrl,
      ),
    ).toBe("Too many attempts. Try again in a minute.");
  });

  it("asks to wait a few minutes when the server does not say how long", () => {
    expect(
      signInFailureMessage(
        { status: 429, code: "too_many_attempts", message: "" },
        serverUrl,
      ),
    ).toBe("Too many attempts. Try again in a few minutes.");
  });

  it("passes on the server's own message for another failure", () => {
    expect(
      signInFailureMessage(
        { status: 500, code: "internal", message: "The database is locked." },
        serverUrl,
      ),
    ).toBe("The server could not sign you in: The database is locked.");
  });
});
