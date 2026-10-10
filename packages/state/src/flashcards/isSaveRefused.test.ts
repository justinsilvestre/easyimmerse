import { describe, expect, it } from "vitest";
import type { RequestFailure } from "../server/serverRequest.ts";
import { isSaveRefused } from "./isSaveRefused.ts";

const failure = (status: RequestFailure["status"]): RequestFailure => ({
  status,
  message: "The save failed.",
});

describe("isSaveRefused", () => {
  it("counts a request the server cannot process as refused", () => {
    expect(isSaveRefused(failure(422))).toBe(true);
  });

  it.each([401, 403, 408, 429])(
    "counts status %i as an ordinary failure, which a retry may cure",
    (status) => {
      expect(isSaveRefused(failure(status))).toBe(false);
    },
  );

  it("counts a server error as an ordinary failure", () => {
    expect(isSaveRefused(failure(500))).toBe(false);
  });

  it("counts a lost connection as an ordinary failure", () => {
    expect(isSaveRefused(failure("NETWORK"))).toBe(false);
  });

  it("counts an aborted request as an ordinary failure", () => {
    expect(isSaveRefused(failure("ABORTED"))).toBe(false);
  });
});
