import { describe, expect, it } from "vitest";
import { type AppAction, actions } from "../../app/appAction.ts";
import type { Effect } from "../../app/effect.ts";
import { transientNotice } from "../../notices/transientNotice.ts";
import type {
  RequestFailure,
  ServerRequest,
} from "../../server/serverRequest.ts";
import {
  type LibraryLanguageForm,
  updateLibraryLanguageForm,
} from "./libraryLanguageForm.ts";

const putRequest = {
  kind: "putLibrarySettings",
  settings: { language: "fr" },
} satisfies ServerRequest;

const saved = actions.requestSettled("libraryLanguage/set", putRequest, {
  ok: true,
  data: { language: "fr" },
});

const failedWith = (error: RequestFailure) =>
  actions.requestSettled("libraryLanguage/set", putRequest, {
    ok: false,
    error,
  });

/** The form and the effects after each action in turn, from a closed form. */
function formAfter(...done: AppAction[]) {
  let form: LibraryLanguageForm = "closed";
  let effects: readonly Effect[] = [];
  for (const action of done)
    [form, effects] = updateLibraryLanguageForm(form, action);
  return { form, effects };
}

const submitting = [
  actions.libraryLanguageChangeAsked(true),
  actions.libraryLanguageSubmitted("fr"),
];

describe("updateLibraryLanguageForm", () => {
  it("opens when a change is asked for", () => {
    expect(formAfter(actions.libraryLanguageChangeAsked(true)).form).toBe(
      "open",
    );
  });

  it("closes when the change is taken back", () => {
    expect(
      formAfter(
        actions.libraryLanguageChangeAsked(true),
        actions.libraryLanguageChangeAsked(false),
      ).form,
    ).toBe("closed");
  });

  it("saves the chosen language", () => {
    expect(formAfter(...submitting).effects).toEqual([
      { type: "sendRequest", id: "libraryLanguage/set", request: putRequest },
    ]);
  });

  it("closes once the language is saved", () => {
    expect(formAfter(...submitting, saved).form).toBe("closed");
  });

  it("stays open when the language can't be saved", () => {
    const failed = failedWith({ status: 500, message: "" });
    expect(formAfter(...submitting, failed).form).toBe("open");
  });

  it("says why the language can't change once the library has items", () => {
    const failed = failedWith({
      status: 409,
      code: "library_has_items",
      message: "",
    });
    expect(formAfter(...submitting, failed).effects).toEqual([
      {
        type: "dispatch",
        action: actions.noticeRequested(
          transientNotice(
            "danger",
            "The library's language couldn't be changed, because the library has items now and their texts and words are in its current language. Delete every item first to choose another language.",
          ),
        ),
      },
    ]);
  });
});
