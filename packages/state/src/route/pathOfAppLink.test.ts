import { describe, expect, it } from "vitest";
import { pathOfAppLink } from "./pathOfAppLink.ts";

describe("pathOfAppLink", () => {
  it("reads the path and query of a link to a screen", () => {
    expect(
      pathOfAppLink("easyimmerse://projects/p1/media/m1?settings=general"),
    ).toBe("/projects/p1/media/m1?settings=general");
  });

  it("reads a link whose path has one segment", () => {
    expect(pathOfAppLink("easyimmerse://library")).toBe("/library");
  });

  it("reads a link with three slashes after the scheme", () => {
    expect(pathOfAppLink("easyimmerse:///projects/p1")).toBe("/projects/p1");
  });

  it("reads a link without a path as the home screen's", () => {
    expect(pathOfAppLink("easyimmerse://")).toBe("/");
  });

  it("reads a link without a path but with a query", () => {
    expect(pathOfAppLink("easyimmerse://?settings=general")).toBe(
      "/?settings=general",
    );
  });

  it("reads a scheme written in capitals", () => {
    expect(pathOfAppLink("EasyImmerse://library")).toBe("/library");
  });

  it("drops the fragment", () => {
    expect(pathOfAppLink("easyimmerse://library#top")).toBe("/library");
  });

  it("refuses a link of another scheme", () => {
    expect(pathOfAppLink("https://easyimmerse.com/library")).toBeNull();
  });

  it("refuses a scheme that only starts with the app's", () => {
    expect(pathOfAppLink("easyimmerse-dev://library")).toBeNull();
  });
});
