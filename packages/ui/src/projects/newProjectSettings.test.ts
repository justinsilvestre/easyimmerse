import { describe, expect, it } from "vitest";
import {
  fieldsOfPreset,
  frontFieldsOfPreset,
} from "../flashcards/flashcardPresets.ts";
import { exampleProjects } from "./exampleProjects.ts";
import {
  defaultProjectSettings,
  newProjectSettings,
} from "./newProjectSettings.ts";

describe("newProjectSettings", () => {
  it("starts from the defaults when there is no project", () => {
    expect(newProjectSettings([])).toEqual(defaultProjectSettings);
  });

  it("starts a first project with the beginner preset's fields", () => {
    expect(newProjectSettings([]).flashcard_fields).toEqual(
      fieldsOfPreset("beginner"),
    );
  });

  it("starts a first project with the beginner preset's front", () => {
    expect(newProjectSettings([]).flashcard_front_fields).toEqual(
      frontFieldsOfPreset("beginner"),
    );
  });

  it("takes the language of the last created project", () => {
    expect(newProjectSettings(exampleProjects).target_language).toBe("ja");
  });

  it("leaves the name empty", () => {
    expect(newProjectSettings(exampleProjects).name).toBe("");
  });
});
