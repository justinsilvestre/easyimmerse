import { describe, expect, it } from "vitest";
import { actions } from "../../../app/appAction.ts";
import type { AppState } from "../../../app/appState.ts";
import { stateAfter } from "../../../app/stateAfter.ts";
import { initialAppState } from "../../../app/update.ts";
import type { PluginFormWizard } from "../../pluginForm/pluginFormWizard.ts";
import {
  applied,
  applyingFetchForm,
  englishChecked,
  fetchForm,
  sourceMediaRoute as route,
  showingFetchForm,
  sourceFormSettled,
  sourceStepSettled,
} from "./exampleSourceMedia.ts";
import { updateSourceMedia } from "./updateSourceMedia.ts";

const apply = (
  wizard: PluginFormWizard | null,
  action: Parameters<typeof updateSourceMedia>[1],
  app: AppState = initialAppState,
) => updateSourceMedia(wizard, action, route, app);

const failure = (message: string) =>
  ({ ok: false, error: { status: 502, message } }) as const;

/** The app while Apply on m1's source dialog is in flight. */
const applyingApp = () =>
  stateAfter(
    actions.openMediaFileRequested("p1", "m1"),
    actions.sourceMediaOpened(),
    sourceFormSettled({ ok: true, data: fetchForm }),
    actions.sourceMediaStepTaken("apply", englishChecked),
  );

describe("updateSourceMedia", () => {
  it("asks the plugin for its form when the dialog opens", () => {
    const [, effects] = apply(null, actions.sourceMediaOpened());
    expect(effects).toEqual([
      {
        type: "sendRequest",
        id: "media/m1/sourceMedia/form",
        request: { kind: "getSourceForm", projectId: "p1", mediaFileId: "m1" },
      },
    ]);
  });

  it("shows no form from an earlier opening while asking again", () => {
    const [wizard] = apply(showingFetchForm, actions.sourceMediaOpened());
    expect(wizard?.form).toBeNull();
  });

  it("shows the form that arrives", () => {
    const [wizard] = apply(
      { ...showingFetchForm, form: null },
      sourceFormSettled({ ok: true, data: fetchForm }),
    );
    expect(wizard?.form).toBe(fetchForm);
  });

  it("tells why the plugin's form could not load", () => {
    const [wizard] = apply(
      { ...showingFetchForm, form: null },
      sourceFormSettled(failure("The plugin stopped.")),
    );
    expect(wizard?.error).toBe("The plugin stopped.");
  });

  it("says the form could not load when the failure gives no reason", () => {
    const [wizard] = apply(
      { ...showingFetchForm, form: null },
      sourceFormSettled(failure("")),
    );
    expect(wizard?.error).toBe("The form could not load.");
  });

  it("sends the pressed action with what the user entered", () => {
    const [, effects] = apply(
      showingFetchForm,
      actions.sourceMediaStepTaken("apply", englishChecked),
    );
    expect(effects).toEqual([
      {
        type: "sendRequest",
        id: "media/m1/sourceMedia/step",
        request: {
          kind: "submitSourceStep",
          projectId: "p1",
          mediaFileId: "m1",
          request: { action: "apply", input: englishChecked },
          form: fetchForm,
        },
      },
    ]);
  });

  it("sends nothing while a step is in flight", () => {
    const [, effects] = apply(
      showingFetchForm,
      actions.sourceMediaStepTaken("apply", englishChecked),
      applyingApp(),
    );
    expect(effects).toEqual([]);
  });

  it("closes once the plugin's changes are applied", () => {
    const [wizard] = apply(
      applyingFetchForm,
      sourceStepSettled({ ok: true, data: applied() }),
    );
    expect(wizard).toBeNull();
  });

  it("stays open when changes sent before it was closed and opened again are applied", () => {
    const [wizard] = apply(
      showingFetchForm,
      sourceStepSettled({ ok: true, data: applied() }),
    );
    expect(wizard).toBe(showingFetchForm);
  });

  it("shows the next form the plugin answers with", () => {
    const next = { ...fetchForm, title: "Confirm the changes" };
    const [wizard] = apply(
      applyingFetchForm,
      sourceStepSettled({ ok: true, data: { kind: "form", form: next } }),
    );
    expect(wizard?.form).toBe(next);
  });

  it("says the changes could not be made when a step fails without a reason", () => {
    const [wizard] = apply(applyingFetchForm, sourceStepSettled(failure("")));
    expect(wizard?.error).toBe("The changes could not be made.");
  });

  it("aborts only the form request when the dialog closes", () => {
    const [, effects] = apply(applyingFetchForm, actions.sourceMediaClosed());
    expect(effects).toEqual([
      { type: "abortRequest", id: "media/m1/sourceMedia/form" },
    ]);
  });
});
