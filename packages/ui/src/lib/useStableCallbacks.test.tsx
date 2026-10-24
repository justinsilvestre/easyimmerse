import { cleanup, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { useStableCallbacks } from "./useStableCallbacks.ts";

afterEach(cleanup);

function renderCallbacks(initial: { onPress: (value: number) => string }) {
  return renderHook(({ callbacks }) => useStableCallbacks(callbacks), {
    initialProps: { callbacks: initial },
  });
}

describe("useStableCallbacks", () => {
  it("keeps the functions' identity across renders", () => {
    const { result, rerender } = renderCallbacks({ onPress: () => "first" });
    const first = result.current.onPress;
    rerender({ callbacks: { onPress: () => "second" } });
    expect(result.current.onPress).toBe(first);
  });

  it("calls the latest callback with the arguments given", () => {
    const { result, rerender } = renderCallbacks({ onPress: () => "first" });
    rerender({ callbacks: { onPress: (value) => `second ${value}` } });
    expect(result.current.onPress(2)).toBe("second 2");
  });
});
