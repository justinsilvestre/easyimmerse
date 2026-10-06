import { cleanup, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useUnsavedCards } from "./SharedSavingContext.tsx";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("useUnsavedCards", () => {
  it("throws outside a SharedSavingProvider, where no list would be shown", () => {
    // React reports the thrown error to the console as well.
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    expect(() => renderHook(() => useUnsavedCards())).toThrow(
      "SharedSavingProvider",
    );
  });
});
