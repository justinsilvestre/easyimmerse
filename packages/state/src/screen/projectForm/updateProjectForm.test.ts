import { describe, expect, it } from "vitest";
import { actions } from "../../app/appAction.ts";
import type { OperationsState } from "../../operations/operations.ts";
import { exampleProjectSettings as korean } from "../../server/exampleProject.ts";
import { updateProjectForm } from "./updateProjectForm.ts";

const idle: OperationsState = { requests: [], jobs: {}, lookupRequestsSent: 0 };

const creating: OperationsState = {
  ...idle,
  requests: [
    {
      id: "newProject/create",
      request: { kind: "createProject", settings: korean },
      isWaiting: false,
    },
  ],
};

const submitted = actions.projectFormSubmitted(korean);

describe("updateProjectForm", () => {
  it("creates a project from the new project form", () => {
    const effects = updateProjectForm(
      { screen: "newProject" },
      submitted,
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
    const effects = updateProjectForm(
      { screen: "newProject" },
      submitted,
      creating,
    );
    expect(effects).toEqual([]);
  });

  it("sends nothing for another action", () => {
    const effects = updateProjectForm(
      { screen: "newProject" },
      actions.playRequested(),
      idle,
    );
    expect(effects).toEqual([]);
  });

  it("saves the settings of the project the settings form belongs to", () => {
    const effects = updateProjectForm(
      { screen: "projectSettings", projectId: "p1" },
      submitted,
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
