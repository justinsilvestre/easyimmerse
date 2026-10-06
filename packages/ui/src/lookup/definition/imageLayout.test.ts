import { describe, expect, it } from "vitest";
import { imageLayout } from "./imageLayout.ts";

describe("imageLayout", () => {
  it("gives the aspect ratio of an image that gives both its width and height", () => {
    expect(imageLayout({ path: "a.png", width: 40, height: 10 })).toEqual({
      width: "40px",
      height: "10px",
      aspectRatio: 0.25,
    });
  });

  it("uses em when the image asks for it", () => {
    expect(
      imageLayout({ path: "a.png", width: 2, sizeUnits: "em" }).width,
    ).toBe("2em");
  });

  it("gives no aspect ratio for an image that gives only one dimension", () => {
    expect(
      imageLayout({ path: "a.png", height: 10 }).aspectRatio,
    ).toBeUndefined();
  });

  it("ignores a size that is not positive", () => {
    expect(imageLayout({ path: "a.png", width: -1 }).width).toBeUndefined();
  });

  it("makes a monochrome image without a size one em square", () => {
    expect(imageLayout({ path: "a.svg", appearance: "monochrome" })).toEqual({
      width: "1em",
      height: "1em",
      aspectRatio: 1,
    });
  });
});
