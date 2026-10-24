import { describe, expect, it } from "vitest";
import { reduceProjectForm } from "./editProject.ts";
import { fieldsOfPreset, frontFieldsOfPreset } from "./flashcardPresets.ts";
import { defaultProjectSettings } from "./newProjectSettings.ts";

describe("reduceProjectForm", () => {
  describe("for presetChosen", () => {
    it("sets the preset's fields", () => {
      const state = reduceProjectForm(defaultProjectSettings, {
        type: "presetChosen",
        preset: "advanced",
      });
      expect(state.flashcard_fields).toEqual(fieldsOfPreset("advanced"));
    });

    it("sets the preset's front fields", () => {
      const state = reduceProjectForm(defaultProjectSettings, {
        type: "presetChosen",
        preset: "advanced",
      });
      expect(state.flashcard_front_fields).toEqual(
        frontFieldsOfPreset("advanced"),
      );
    });
  });

  describe("for frontFieldToggled", () => {
    it("moves a field on the back to the front", () => {
      const state = reduceProjectForm(defaultProjectSettings, {
        type: "frontFieldToggled",
        key: "word",
      });
      expect(state.flashcard_front_fields).toContain("word");
    });

    it("moves a field on the front to the back", () => {
      const state = reduceProjectForm(defaultProjectSettings, {
        type: "frontFieldToggled",
        key: "screenshot",
      });
      expect(state.flashcard_front_fields).not.toContain("screenshot");
    });
  });

  describe("for fieldToggled", () => {
    it("leaves the front fields as they are when a front field is left off", () => {
      const state = reduceProjectForm(defaultProjectSettings, {
        type: "fieldToggled",
        key: "screenshot",
      });
      expect(state.flashcard_front_fields).toEqual(
        defaultProjectSettings.flashcard_front_fields,
      );
    });
  });
});
