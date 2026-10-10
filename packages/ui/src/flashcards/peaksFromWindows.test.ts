import { describe, expect, it } from "vitest";
import { peaksFromWindows } from "./peaksFromWindows.ts";

describe("peaksFromWindows", () => {
  it("covers the whole file at twenty peaks a second", () => {
    expect(peaksFromWindows(new Map(), 2_000)).toHaveLength(40);
  });

  it("keeps the loudest of the source peaks that fall into one peak", () => {
    const windows = new Map([[0, [0, 51, 255, 0, 0]]]);
    expect(peaksFromWindows(windows, 1_000)[0]).toBe(1);
  });

  it("places a window at its start time", () => {
    const windows = new Map([[500, [255]]]);
    expect(peaksFromWindows(windows, 1_000).indexOf(1)).toBe(10);
  });
});
