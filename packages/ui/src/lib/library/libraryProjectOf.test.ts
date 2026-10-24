import { describe, expect, it } from "vitest";
import { fixtureProject } from "../../testSupport/fixtureResponses.ts";
import { libraryProjectOf } from "./libraryProjectOf.ts";

const named = (id: string, name: string, language = "de") => ({
  ...fixtureProject,
  id,
  settings: { ...fixtureProject.settings, name, target_language: language },
});

describe("libraryProjectOf", () => {
  it("finds the library project of the library's language", () => {
    const projects = [named("p1", "Alpha"), named("p2", "Library")];
    expect(libraryProjectOf(projects, "de")).toBe("p2");
  });

  it("passes over a project of that name in another language", () => {
    const projects = [named("p2", "Library", "ja")];
    expect(libraryProjectOf(projects, "de")).toBeNull();
  });

  it("finds none among the learner's own projects", () => {
    expect(libraryProjectOf([named("p1", "Alpha")], "de")).toBeNull();
  });
});
