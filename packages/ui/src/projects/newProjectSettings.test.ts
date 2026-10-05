import { describe, expect, it } from "vitest";
import { exampleProjects } from "./exampleProjects.ts";
import {
  defaultProjectSettings,
  newProjectSettings,
} from "./newProjectSettings.ts";

describe("newProjectSettings", () => {
  it("starts from the defaults when there is no project", () => {
    expect(newProjectSettings([])).toEqual(defaultProjectSettings);
  });

  it("takes the language of the last created project", () => {
    expect(newProjectSettings(exampleProjects).target_language).toBe("ja");
  });

  it("leaves the name empty", () => {
    expect(newProjectSettings(exampleProjects).name).toBe("");
  });
});
