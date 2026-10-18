import { describe, expect, it } from "vitest";
import { actions } from "../../../app/appAction.ts";
import {
  applyToMediaScreen,
  applyToMediaScreenIn,
  mediaScreenAfter,
} from "../mediaScreenTestSupport.ts";
import {
  applied,
  englishChecked,
  fetchForm,
  sourceFormSettled,
  sourceStepSettled,
} from "./exampleSourceMedia.ts";

const failure = (message: string) =>
  ({ ok: false, error: { status: 502, message } }) as const;

const opened = actions.sourceMediaOpened();
const applyPressed = actions.sourceMediaStepTaken("apply", englishChecked);
/** The dialog of m1 showing the fetch form. */
const showing = [opened, sourceFormSettled({ ok: true, data: fetchForm })];
/** The dialog of m1 awaiting the plugin's answer to Apply. */
const applying = [...showing, applyPressed];

/** Applies an action to m1's media screen after the given earlier actions, and returns its source dialog with the effects. */
const apply = (...args: Parameters<typeof applyToMediaScreen>) => {
  const [screen, effects] = applyToMediaScreen(...args);
  return [screen.sourceMedia, effects] as const;
};

describe("updateMediaScreen", () => {
  describe("for the plugin source dialog", () => {
    it("asks the plugin for its form when the dialog opens", () => {
      const [, effects] = apply(opened);
      expect(effects).toEqual([
        {
          type: "sendRequest",
          id: "media/m1/sourceMedia/form",
          request: {
            kind: "getSourceForm",
            projectId: "p1",
            mediaFileId: "m1",
          },
        },
      ]);
    });

    it("shows no form from an earlier opening while asking again", () => {
      const [wizard] = apply(opened, ...showing);
      expect(wizard?.form).toBeNull();
    });

    it("shows the form that arrives", () => {
      const [wizard] = apply(
        sourceFormSettled({ ok: true, data: fetchForm }),
        opened,
      );
      expect(wizard?.form).toBe(fetchForm);
    });

    it("tells why the plugin's form could not load", () => {
      const [wizard] = apply(
        sourceFormSettled(failure("The plugin stopped.")),
        opened,
      );
      expect(wizard?.error).toBe("The plugin stopped.");
    });

    it("says the form could not load when the failure gives no reason", () => {
      const [wizard] = apply(sourceFormSettled(failure("")), opened);
      expect(wizard?.error).toBe("The form could not load.");
    });

    it("sends the pressed action with what the user entered", () => {
      const [, effects] = apply(applyPressed, ...showing);
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
      const [, effects] = apply(applyPressed, ...applying);
      expect(effects).toEqual([]);
    });

    it("closes once the plugin's changes are applied", () => {
      const [wizard] = apply(
        sourceStepSettled({ ok: true, data: applied() }),
        ...applying,
      );
      expect(wizard).toBeNull();
    });

    it("stays open when changes sent before it was closed and opened again are applied", () => {
      const before = mediaScreenAfter(
        ...applying,
        actions.sourceMediaClosed(),
        ...showing,
      );
      const [screen] = applyToMediaScreenIn(
        before,
        sourceStepSettled({ ok: true, data: applied() }),
      );
      expect(screen.sourceMedia).toBe(before.screen.sourceMedia);
    });

    it("shows the next form the plugin answers with", () => {
      const next = { ...fetchForm, title: "Confirm the changes" };
      const [wizard] = apply(
        sourceStepSettled({ ok: true, data: { kind: "form", form: next } }),
        ...applying,
      );
      expect(wizard?.form).toBe(next);
    });

    it("says the changes could not be made when a step fails without a reason", () => {
      const [wizard] = apply(sourceStepSettled(failure("")), ...applying);
      expect(wizard?.error).toBe("The changes could not be made.");
    });

    it("aborts only the form request when the dialog closes", () => {
      const [, effects] = apply(actions.sourceMediaClosed(), ...applying);
      expect(effects).toEqual([
        { type: "abortRequest", id: "media/m1/sourceMedia/form" },
      ]);
    });
  });
});
