import { describe, expect, it } from "vitest";
import { chooseTheme, parseThemeChoice } from "./theme.ts";

describe("parseThemeChoice", () => {
  it("reads a stored dark choice", () => {
    expect(parseThemeChoice("dark")).toBe("dark");
  });

  it("follows the system when nothing is stored", () => {
    expect(parseThemeChoice(undefined)).toBe("system");
  });

  it("follows the system when the stored value is unknown", () => {
    expect(parseThemeChoice("sepia")).toBe("system");
  });
});

describe("chooseTheme", () => {
  it("returns the system theme when the choice follows the system", () => {
    expect(chooseTheme("system", "dark")).toBe("dark");
  });

  it("returns the chosen theme over the system theme", () => {
    expect(chooseTheme("light", "dark")).toBe("light");
  });
});
