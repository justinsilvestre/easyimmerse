import { describe, expect, it } from "vitest";
import { remToPx } from "./remToPx.ts";

describe("remToPx", () => {
  it("rewrites a length in rem as pixels", () => {
    expect(remToPx(".a{width:2rem}", 16)).toBe(".a{width:32px}");
  });

  it("rewrites a length in rem inside a function", () => {
    expect(remToPx(".a{width:min(32rem,100vw - 1rem)}", 16)).toBe(
      ".a{width:min(512px,100vw - 16px)}",
    );
  });

  it("rewrites a length in rem in a custom property", () => {
    expect(remToPx(":host{--spacing:.25rem}", 16)).toBe(":host{--spacing:4px}");
  });

  it("leaves a class name that holds rem alone", () => {
    expect(remToPx(".w-\\[2rem\\]{width:2rem}", 16)).toBe(
      ".w-\\[2rem\\]{width:32px}",
    );
  });

  it("leaves lengths in other units alone", () => {
    expect(remToPx(".a{margin:1em 2px}", 16)).toBe(".a{margin:1em 2px}");
  });
});
