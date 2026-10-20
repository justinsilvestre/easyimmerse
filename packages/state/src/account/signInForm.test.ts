import { describe, expect, it } from "vitest";
import {
  canSubmitSignIn,
  initialSignInForm,
  type SignInForm,
  serverOfferOf,
  signInServerUrlOf,
} from "./signInForm.ts";

const cloudUrl = "https://cloud.example.com";

const filled: SignInForm = {
  ...initialSignInForm,
  serverChoice: "own",
  ownServerUrl: " https://books.example.org ",
  email: "someone@example.com",
  password: "correct horse",
};

const knowing = (accounts: boolean, openSignup: boolean): SignInForm => ({
  ...filled,
  serverAuthInfo: {
    serverUrl: "https://books.example.org",
    info: { accounts, open_signup: openSignup },
  },
});

describe("signInServerUrlOf", () => {
  it("names the official server when it is chosen", () => {
    expect(
      signInServerUrlOf({ ...filled, serverChoice: "official" }, cloudUrl),
    ).toBe(cloudUrl);
  });

  it("names the own server, trimmed, when there is no official one", () => {
    expect(
      signInServerUrlOf({ ...filled, serverChoice: "official" }, null),
    ).toBe("https://books.example.org");
  });

  it("names no server for an address without a scheme", () => {
    expect(
      signInServerUrlOf({ ...filled, ownServerUrl: "books.example.org" }, null),
    ).toBeNull();
  });
});

describe("serverOfferOf", () => {
  it("is unknown until the server has answered", () => {
    expect(serverOfferOf(filled, "https://books.example.org")).toBe("unknown");
  });

  it("is unknown when the answer came from another address", () => {
    expect(serverOfferOf(knowing(true, true), "https://other.example")).toBe(
      "unknown",
    );
  });

  it("tells a server without accounts", () => {
    expect(
      serverOfferOf(knowing(false, false), "https://books.example.org"),
    ).toBe("noAccounts");
  });

  it("tells a server whose sign-up is closed", () => {
    expect(
      serverOfferOf(knowing(true, false), "https://books.example.org"),
    ).toBe("signupClosed");
  });

  it("tells a server open to sign-up", () => {
    expect(
      serverOfferOf(knowing(true, true), "https://books.example.org"),
    ).toBe("open");
  });
});

describe("canSubmitSignIn", () => {
  it("lets a filled-in form be sent", () => {
    expect(canSubmitSignIn(filled, null)).toBe(true);
  });

  it("holds back a form without a password", () => {
    expect(canSubmitSignIn({ ...filled, password: "" }, null)).toBe(false);
  });

  it("holds back a form whose email is only spaces", () => {
    expect(canSubmitSignIn({ ...filled, email: "  " }, null)).toBe(false);
  });

  it("holds back a form without a valid address", () => {
    expect(canSubmitSignIn({ ...filled, ownServerUrl: "" }, null)).toBe(false);
  });

  it("holds back a form while it is being sent", () => {
    expect(
      canSubmitSignIn({ ...filled, status: { kind: "submitting" } }, null),
    ).toBe(false);
  });

  it("lets a failed form be sent again", () => {
    expect(
      canSubmitSignIn(
        {
          ...filled,
          status: { kind: "failed", failure: { status: 500, message: "" } },
        },
        null,
      ),
    ).toBe(true);
  });

  it("holds back a sign-up on a server whose sign-up is closed", () => {
    expect(
      canSubmitSignIn({ ...knowing(true, false), mode: "signup" }, null),
    ).toBe(false);
  });

  it("lets a log-in through on a server whose sign-up is closed", () => {
    expect(canSubmitSignIn(knowing(true, false), null)).toBe(true);
  });

  it("holds back a log-in on a server without accounts", () => {
    expect(canSubmitSignIn(knowing(false, false), null)).toBe(false);
  });
});
