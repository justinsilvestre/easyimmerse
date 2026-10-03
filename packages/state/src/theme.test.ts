import { describe, expect, it } from "vitest";
import { chooseTheme, followSystemTheme, toggleTheme } from "./theme.ts";

describe("chooseTheme", () => {
  it("returns the system theme without an override", () => {
    expect(chooseTheme({ system: "dark", override: null })).toBe("dark");
  });

  it("returns the override when there is one", () => {
    expect(chooseTheme({ system: "light", override: "dark" })).toBe("dark");
  });
});

describe("followSystemTheme", () => {
  it("stores the new system theme", () => {
    const state = followSystemTheme(
      { system: "light", override: null },
      "dark",
    );
    expect(state.system).toBe("dark");
  });

  it("drops the override when the system theme changes", () => {
    const state = followSystemTheme(
      { system: "light", override: "dark" },
      "dark",
    );
    expect(state.override).toBeNull();
  });

  it("keeps the override when the system theme repeats", () => {
    const state = followSystemTheme(
      { system: "light", override: "dark" },
      "light",
    );
    expect(state.override).toBe("dark");
  });
});

describe("toggleTheme", () => {
  it("overrides the system theme with the other theme", () => {
    expect(toggleTheme({ system: "light", override: null }).override).toBe(
      "dark",
    );
  });

  it("drops an override that switches back to the system theme", () => {
    expect(
      toggleTheme({ system: "light", override: "dark" }).override,
    ).toBeNull();
  });
});
