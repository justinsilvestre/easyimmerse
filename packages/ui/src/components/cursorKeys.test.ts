import { describe, expect, it } from "vitest";
import { lineStepOfKey, textStepOfKey } from "./cursorKeys.ts";

const press = (
  key: string,
  modifiers: { shiftKey?: boolean; altKey?: boolean } = {},
) => ({
  key,
  altKey: false,
  ctrlKey: false,
  metaKey: false,
  shiftKey: false,
  ...modifiers,
});

describe("textStepOfKey", () => {
  it("moves a word forward on the right arrow", () => {
    expect(textStepOfKey(press("ArrowRight"))).toEqual({
      direction: "forward",
      unit: "word",
    });
  });

  it("moves a word backward on the left arrow", () => {
    expect(textStepOfKey(press("ArrowLeft"))).toEqual({
      direction: "backward",
      unit: "word",
    });
  });

  it("moves a character forward on Shift with the right arrow", () => {
    expect(textStepOfKey(press("ArrowRight", { shiftKey: true }))).toEqual({
      direction: "forward",
      unit: "character",
    });
  });

  it("leaves Alt with an arrow to the system", () => {
    expect(textStepOfKey(press("ArrowRight", { altKey: true }))).toBeNull();
  });

  it("ignores the up arrow", () => {
    expect(textStepOfKey(press("ArrowUp"))).toBeNull();
  });
});

describe("lineStepOfKey", () => {
  it("moves to the previous line on the up arrow", () => {
    expect(lineStepOfKey(press("ArrowUp"))).toBe("previous");
  });

  it("moves to the next line on the down arrow", () => {
    expect(lineStepOfKey(press("ArrowDown"))).toBe("next");
  });

  it("ignores the right arrow", () => {
    expect(lineStepOfKey(press("ArrowRight"))).toBeNull();
  });
});
