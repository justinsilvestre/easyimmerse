import { afterEach, describe, expect, it, vi } from "vitest";
import { renderStartupFailure } from "./renderStartupFailure.ts";

describe("renderStartupFailure", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("shows the error message on the page", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    renderStartupFailure(new Error("wasm failed to load"));
    expect(document.body.textContent).toBe(
      "easyImmerse could not start: wasm failed to load",
    );
  });

  it("marks the message as an alert", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    renderStartupFailure("boom");
    expect(document.querySelector("[role=alert]")).not.toBeNull();
  });
});
