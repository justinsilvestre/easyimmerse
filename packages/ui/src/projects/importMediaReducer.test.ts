import { describe, expect, it } from "vitest";
import { exampleImportForm } from "../plugins/examplePluginForms.ts";
import {
  type ImportMediaEvent,
  importMediaReducer,
  noImport,
} from "./importMediaReducer.ts";

const source = { name: "video-site", label: "Add from a video site" };

const stateAfter = (...events: ImportMediaEvent[]) =>
  events.reduce(importMediaReducer, noImport);

describe("importMediaReducer", () => {
  it("ignores a form answering an earlier opening of the dialog", () => {
    const state = stateAfter(
      { type: "opened", source },
      { type: "closed" },
      { type: "opened", source },
      { type: "formArrived", opening: 1, form: exampleImportForm },
    );
    expect(state.form).toBeNull();
  });

  it("takes a form answering the current opening of the dialog", () => {
    const state = stateAfter(
      { type: "opened", source },
      { type: "formArrived", opening: 1, form: exampleImportForm },
    );
    expect(state.form).toBe(exampleImportForm);
  });

  it("awaits an answer once an action is sent", () => {
    const state = stateAfter({ type: "opened", source }, { type: "stepSent" });
    expect(state.isAwaitingAnswer).toBe(true);
  });

  it("stops awaiting an answer once the fetch starts", () => {
    const state = stateAfter(
      { type: "opened", source },
      { type: "stepSent" },
      { type: "jobStarted", opening: 1, jobId: "j1" },
    );
    expect(state.isAwaitingAnswer).toBe(false);
  });
});
