import { describe, expect, it } from "vitest";
import { exampleImportForm } from "./examplePluginForms.ts";
import {
  closedPluginFormSession,
  type PluginFormSession,
  type PluginFormSessionEvent,
  pluginFormSessionReducer,
} from "./pluginFormSessionReducer.ts";

const subject = "video-site";

const stateAfter = (...events: PluginFormSessionEvent<string, string>[]) =>
  events.reduce<PluginFormSession<string, string>>(
    pluginFormSessionReducer,
    closedPluginFormSession,
  );

describe("pluginFormSessionReducer", () => {
  it("ignores a form answering an earlier opening of the dialog", () => {
    const state = stateAfter(
      { type: "opened", subject },
      { type: "closed" },
      { type: "opened", subject },
      { type: "formArrived", opening: 1, form: exampleImportForm },
    );
    expect(state.form).toBeNull();
  });

  it("takes a form answering the current opening of the dialog", () => {
    const state = stateAfter(
      { type: "opened", subject },
      { type: "formArrived", opening: 1, form: exampleImportForm },
    );
    expect(state.form).toBe(exampleImportForm);
  });

  it("awaits an answer once an action is sent", () => {
    const state = stateAfter({ type: "opened", subject }, { type: "stepSent" });
    expect(state.isAwaitingAnswer).toBe(true);
  });

  it("stops awaiting an answer once the action finishes", () => {
    const state = stateAfter(
      { type: "opened", subject },
      { type: "stepSent" },
      { type: "finished", opening: 1, outcome: "j1" },
    );
    expect(state.isAwaitingAnswer).toBe(false);
  });

  it("ignores an action finishing that was sent during an earlier opening", () => {
    const state = stateAfter(
      { type: "opened", subject },
      { type: "stepSent" },
      { type: "closed" },
      { type: "opened", subject },
      { type: "finished", opening: 1, outcome: "j1" },
    );
    expect(state.outcome).toBeNull();
  });

  it("clears the last outcome once another action is sent", () => {
    const state = stateAfter(
      { type: "opened", subject },
      { type: "finished", opening: 1, outcome: "j1" },
      { type: "stepSent" },
    );
    expect(state.outcome).toBeNull();
  });

  it("keeps counting openings after it closes", () => {
    const state = stateAfter({ type: "opened", subject }, { type: "closed" });
    expect(state.opening).toBe(1);
  });
});
