import { type AppAction, actions } from "../../app/appAction.ts";
import type { AppRoot } from "../../app/createAppStore.ts";
import { dispatch } from "../../app/dispatchEffect.ts";
import type { Effect } from "../../app/effect.ts";
import { updated } from "../../app/updated.ts";
import { transientNotice } from "../../notices/transientNotice.ts";
import { isSettled } from "../../server/isSettled.ts";
import type { RequestFailure } from "../../server/serverRequest.ts";
import { libraryFailureMessage } from "../libraryEdit/libraryFailureMessage.ts";

/**
 * Where a library manager is with changing the library's language: not changing it, choosing another, or saving the one chosen.
 * The form to choose one shows anyway while the library has no language.
 */
export type LibraryLanguageForm = "closed" | "open" | "saving";

const requestId = "libraryLanguage/set";

/** Opens and closes the form that changes the library's language, and saves the language chosen there. */
export function updateLibraryLanguageForm(
  form: LibraryLanguageForm,
  action: AppAction,
) {
  if (action.type === "libraryLanguageChangeAsked")
    return updated(
      (action.asks ? "open" : "closed") satisfies LibraryLanguageForm,
    );
  if (action.type === "libraryLanguageSubmitted")
    return updated(
      "saving" satisfies LibraryLanguageForm,
      {
        type: "sendRequest",
        id: requestId,
        request: {
          kind: "putLibrarySettings",
          settings: { language: action.language },
        },
      } satisfies Effect,
    );
  if (form === "saving" && isSettled(action, requestId, "putLibrarySettings"))
    return action.outcome.ok
      ? updated("closed" satisfies LibraryLanguageForm)
      : updated(
          "open" satisfies LibraryLanguageForm,
          failureNotice(action.outcome.error),
        );
  return updated(form);
}

function failureNotice(error: RequestFailure) {
  const message =
    error.code === "library_has_items"
      ? "The library's language couldn't be changed, because the library has items now and their texts and words are in its current language. Delete every item first to choose another language."
      : libraryFailureMessage(
          error,
          "The library's language couldn't be set. Try again in a moment.",
          "the library",
        );
  return dispatch(actions.noticeRequested(transientNotice("danger", message)));
}

/** Returns where the library manager is with changing the library's language, or "closed" away from the library management screen. */
export function selectLibraryLanguageForm(root: AppRoot): LibraryLanguageForm {
  const main = root.app.screen.main;
  return main.kind === "libraryManage" ? main.languageForm : "closed";
}
