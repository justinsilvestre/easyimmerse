import { describe, expect, it } from "vitest";
import { actions } from "../../../app/appAction.ts";
import { stateAfter } from "../../../app/stateAfter.ts";
import {
  applied,
  englishChecked,
  fetchForm,
  sourceFormSettled,
  sourceStepSettled,
} from "./exampleSourceMedia.ts";
import { selectSourceMedia } from "./selectSourceMedia.ts";

const showingForm = [
  actions.openMediaFileRequested("p1", "m1"),
  actions.sourceMediaOpened(),
  sourceFormSettled({ ok: true, data: fetchForm }),
];
const applying = [
  ...showingForm,
  actions.sourceMediaStepTaken("apply", englishChecked),
];

describe("selectSourceMedia", () => {
  it("is null while the dialog is closed", () => {
    const app = stateAfter(actions.openMediaFileRequested("p1", "m1"));
    expect(selectSourceMedia({ app })).toBeNull();
  });

  it("gives the form the plugin asked for", () => {
    const app = stateAfter(...showingForm);
    expect(selectSourceMedia({ app })?.form).toBe(fetchForm);
  });

  it("is busy while a step is in flight", () => {
    const app = stateAfter(...applying);
    expect(selectSourceMedia({ app })?.isBusy).toBe(true);
  });

  it("is busy when opened again while a step from an earlier opening is in flight", () => {
    const app = stateAfter(
      ...applying,
      actions.sourceMediaClosed(),
      actions.sourceMediaOpened(),
    );
    expect(selectSourceMedia({ app })?.isBusy).toBe(true);
  });

  it("is not busy once that step has settled", () => {
    const app = stateAfter(
      ...applying,
      actions.sourceMediaClosed(),
      actions.sourceMediaOpened(),
      sourceStepSettled({ ok: true, data: applied() }),
    );
    expect(selectSourceMedia({ app })?.isBusy).toBe(false);
  });
});
