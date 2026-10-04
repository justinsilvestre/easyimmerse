import { describe, expect, it } from "vitest";
import type { Navigation } from "./navigation.ts";
import { initialNavigation, mainScreenOf, navigate } from "./navigation.ts";

const media: Navigation = { screen: "media", projectId: "p1" };

describe("navigate", () => {
  it("opens settings over the current screen", () => {
    expect(navigate(media, { type: "openSettings" })).toEqual({
      screen: "settings",
      beneath: media,
    });
  });

  it("keeps settings as they are when they are already open", () => {
    const settings = navigate(media, { type: "openSettings" });
    expect(navigate(settings, { type: "openSettings" })).toBe(settings);
  });

  it("returns to the screen beneath when settings close", () => {
    const settings = navigate(media, { type: "openSettings" });
    expect(navigate(settings, { type: "closeSettings" })).toEqual(media);
  });

  it("ignores closing settings when they are not open", () => {
    expect(navigate(media, { type: "closeSettings" })).toBe(media);
  });

  it("opens a project from home", () => {
    expect(
      navigate(initialNavigation, { type: "openProject", projectId: "p2" }),
    ).toEqual({ screen: "media", projectId: "p2" });
  });
});

describe("mainScreenOf", () => {
  it("returns the screen beneath settings", () => {
    expect(mainScreenOf({ screen: "settings", beneath: media })).toBe(media);
  });

  it("returns a main screen as it is", () => {
    expect(mainScreenOf(media)).toBe(media);
  });
});
