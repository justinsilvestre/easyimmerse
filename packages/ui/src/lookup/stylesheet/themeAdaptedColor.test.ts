import { describe, expect, it } from "vitest";
import {
  themeAdaptedColor,
  themeAdaptedInlineColor,
} from "./themeAdaptedColor.ts";

describe("themeAdaptedColor", () => {
  it("keeps a text color in light schemes and lightens it in dark ones", () => {
    expect(themeAdaptedColor("#a33", "foreground")).toBe(
      "light-dark(#a33, oklch(from #a33 max(l, 0.75) c h))",
    );
  });

  it("keeps a background in light schemes and darkens it in dark ones", () => {
    expect(themeAdaptedColor("#fee", "background")).toBe(
      "light-dark(#fee, oklch(from #fee min(l, 0.35) c h))",
    );
  });
});

describe("themeAdaptedInlineColor", () => {
  it("returns a keyword that names no color as it is", () => {
    expect(themeAdaptedInlineColor("inherit", "foreground")).toBe("inherit");
  });

  it("returns a color as it is where the browser rejects the adapted form", () => {
    expect(themeAdaptedInlineColor("red", "foreground")).toBe("red");
  });
});
