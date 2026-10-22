import { describe, expect, it } from "vitest";
import { connectionNotKeptCode } from "../account/signInAttempt.ts";
import { pairingFailureMessage } from "./pairingFailureMessage.ts";

const serverUrl = "http://192.168.1.5:8787";

describe("pairingFailureMessage", () => {
  it("tells of a wrong or expired code", () => {
    expect(
      pairingFailureMessage(
        { status: 404, code: "pairing_code_invalid", message: "" },
        serverUrl,
      ),
    ).toBe(
      "This code is wrong or has expired. Enter the code that the desktop app shows now.",
    );
  });

  it("tells how many minutes to wait after too many wrong codes", () => {
    expect(
      pairingFailureMessage(
        {
          status: 429,
          code: "too_many_attempts",
          message: "",
          retryAfterSeconds: 600,
        },
        serverUrl,
      ),
    ).toBe("Too many wrong codes were entered. Try again in 10 minutes.");
  });

  it("tells of a server it could not reach", () => {
    expect(
      pairingFailureMessage({ status: "NETWORK", message: "" }, serverUrl),
    ).toBe(
      "Couldn't reach easyImmerse at http://192.168.1.5:8787. Check the address, and that both devices are on the same network.",
    );
  });

  it("tells of an address that leads to something else", () => {
    expect(pairingFailureMessage({ status: 404, message: "" }, serverUrl)).toBe(
      "The address http://192.168.1.5:8787 does not lead to an easyImmerse server. Check the address.",
    );
  });

  it("tells of a connection the device could not keep", () => {
    expect(
      pairingFailureMessage(
        { status: "NO_DATA", code: connectionNotKeptCode, message: "" },
        serverUrl,
      ),
    ).toBe(
      "The connection to the desktop app could not be saved on this device.",
    );
  });

  it("passes on the server's message otherwise", () => {
    expect(
      pairingFailureMessage({ status: 500, message: "disk full" }, serverUrl),
    ).toBe("The server could not pair this device: disk full");
  });
});
