import { describe, expect, it } from "vitest";
import { lineStepOfKey, textStepOfKey } from "./cursorKeys.ts";

const press = (key: string, shiftKey = false) => ({
  key,
  altKey: false,
  ctrlKey: false,
  metaKey: false,
  shiftKey,
});

describe("textStepOfKey", () => {
  it("moves forward on the right arrow", () => {
    expect(textStepOfKey(press("ArrowRight"))).toBe("forward");
  });

  it("moves backward on the left arrow", () => {
    expect(textStepOfKey(press("ArrowLeft"))).toBe("backward");
  });

  it("leaves Shift with an arrow to text selection", () => {
    expect(textStepOfKey(press("ArrowRight", true))).toBeNull();
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
