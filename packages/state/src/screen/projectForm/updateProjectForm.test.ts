import { describe, expect, it } from "vitest";
import { actions } from "../../app/appAction.ts";
import { stateAfter } from "../../app/stateAfter.ts";
import { exampleProjectSettings as korean } from "../../server/exampleProject.ts";
import type { MainScreenState } from "../screenState.ts";
import { updateProjectForm } from "./updateProjectForm.ts";

const submitted = actions.projectFormSubmitted(korean);

const idle = stateAfter();

/** The form screens keep no state of their own. */
const formScreen: MainScreenState = { kind: "newProject" };

const creating = stateAfter(
  actions.navigated({ type: "createProject" }),
  submitted,
);

describe("updateProjectForm", () => {
  it("creates a project from the new project form", () => {
    const [, effects] = updateProjectForm(
      formScreen,
      submitted,
      { screen: "newProject" },
      idle,
    );
    expect(effects).toEqual([
      {
        type: "sendRequest",
        id: "newProject/create",
        request: { kind: "createProject", settings: korean },
      },
    ]);
  });

  it("sends nothing while the last submission is in flight", () => {
    const [, effects] = updateProjectForm(
      formScreen,
      submitted,
      { screen: "newProject" },
      creating,
    );
    expect(effects).toEqual([]);
  });

  it("sends nothing for another action", () => {
    const [, effects] = updateProjectForm(
      formScreen,
      actions.playRequested(),
      { screen: "newProject" },
      idle,
    );
    expect(effects).toEqual([]);
  });

  it("saves the settings of the project the settings form belongs to", () => {
    const [, effects] = updateProjectForm(
      formScreen,
      submitted,
      { screen: "projectSettings", projectId: "p1" },
      idle,
    );
    expect(effects).toEqual([
      {
        type: "sendRequest",
        id: "projectSettings/p1/save",
        request: { kind: "updateProject", projectId: "p1", settings: korean },
      },
    ]);
  });
});
