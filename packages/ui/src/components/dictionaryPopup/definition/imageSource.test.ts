import { describe, expect, it } from "vitest";
import { imageSource } from "./imageSource.ts";

describe("imageSource", () => {
  it("reads a relative path as dictionary media", () => {
    expect(imageSource("img/a.png")).toEqual({
      kind: "media",
      path: "img/a.png",
    });
  });

  it("strips a leading slash and a file scheme", () => {
    expect(imageSource("file:///images/a.png")).toEqual({
      kind: "media",
      path: "images/a.png",
    });
  });

  it("refuses a path that climbs out of the dictionary", () => {
    expect(imageSource("../secret.png")).toBeNull();
  });

  it("refuses a remote image", () => {
    expect(imageSource("https://example.com/track.gif")).toBeNull();
  });

  it("refuses a protocol-relative remote image", () => {
    expect(imageSource("//example.com/track.gif")).toBeNull();
  });

  it("refuses a path with a drive letter", () => {
    expect(imageSource("C:\\images\\a.png")).toBeNull();
  });

  it("keeps an embedded image as it is", () => {
    expect(imageSource("data:image/png;base64,AAAA")).toEqual({
      kind: "embedded",
      url: "data:image/png;base64,AAAA",
    });
  });
});
