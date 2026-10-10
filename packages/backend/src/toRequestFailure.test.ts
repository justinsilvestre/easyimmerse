import { describe, expect, it } from "vitest";
import { toRequestFailure } from "./toRequestFailure.ts";

describe("toRequestFailure", () => {
  it("keeps the client's own error", () => {
    const error = { status: 409, code: "duplicate", message: "Taken" };
    expect(toRequestFailure(error)).toEqual(error);
  });

  it("keeps a client error that never reached a server", () => {
    const error = { status: "OFFLINE", message: "No connection" };
    expect(toRequestFailure(error)).toEqual(error);
  });

  it("reports an aborted request as aborted", () => {
    const error = { name: "AbortError", message: "Aborted" };
    expect(toRequestFailure(error).status).toBe("ABORTED");
  });

  it("reports anything else as a network failure with its message", () => {
    expect(toRequestFailure(new Error("Socket closed"))).toEqual({
      status: "NETWORK",
      message: "Socket closed",
    });
  });

  it("reports a thrown value without a message as a network failure", () => {
    expect(toRequestFailure(undefined).status).toBe("NETWORK");
  });
});
