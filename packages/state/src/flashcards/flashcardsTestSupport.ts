import type { Flashcard } from "@easyimmerse/types";
import type { AppAction } from "../app/appAction.ts";
import { actions } from "../app/appAction.ts";
import type { AppState } from "../app/appState.ts";
import type { Effect } from "../app/effect.ts";
import { stateAfter, updatedAsDispatched } from "../app/stateAfter.ts";
import { update } from "../app/update.ts";
import { mainScreenOf } from "../route/route.ts";
import type { RequestFailure } from "../server/serverRequest.ts";
import {
  exampleListedFlashcard,
  exampleNewFlashcard,
} from "./exampleFlashcards.ts";
import { flashcardCommands } from "./flashcardCommands.ts";
import type { FlashcardForm } from "./flashcardForm.ts";
import { formOf } from "./flashcardsOnScreen.ts";
import { updateFlashcardForm } from "./updateFlashcardForm.ts";

export const openM1 = actions.openMediaFileRequested("p1", "m1");

/** Opens a new flashcard for the word in the form, under the id given. */
export const startNew = (id: string, word = id) =>
  actions.flashcardStarted(exampleNewFlashcard(id, word), "editor");

/** Saves a new flashcard for the word at once, under the id given. */
export const createNew = (id: string, word = id) =>
  actions.flashcardStarted(exampleNewFlashcard(id, word), "save");

/** Types a word into the open card's word field. */
export const typeWord = (value: string) =>
  actions.flashcardEdited({ type: "textChanged", key: "word", value });

/** The cached flashcard "Hund" of p1, listed with id h. */
export const hund: Flashcard = exampleListedFlashcard("h", "Hund");

/** The app state after the actions, on m1's media screen. */
export const appAfter = (...done: AppAction[]): AppState =>
  stateAfter(openM1, ...done);

/** Applies more actions to an app state through the root update. */
export function applied(app: AppState, ...done: AppAction[]): AppState {
  return done.reduce(updatedAsDispatched, app);
}

/** The settle of the recorded request with this id: a success with `data`, or a failure. */
export function settle(
  app: AppState,
  id: string,
  outcome: { data: unknown } | { error: RequestFailure },
): AppAction {
  const record = app.operations.requests.find((each) => each.id === id);
  if (!record) throw new Error(`No request ${id} is recorded.`);
  const settled =
    "data" in outcome
      ? { ok: true, data: outcome.data }
      : { ok: false, error: outcome.error };
  return actions.requestSettled(
    id,
    record.request,
    settled as never,
  ) as AppAction;
}

/** The ids of the pending requests of a flashcard, in the order they were asked for. */
export const requestIdsOf = (app: AppState, flashcardId: string) =>
  app.operations.requests.flatMap(({ id, request }) =>
    "flashcardId" in request && request.flashcardId === flashcardId ? [id] : [],
  );

/** A failure of the given status. */
export const failure = (status: RequestFailure["status"]) => ({
  error: { status, message: "The request failed." },
});

/** A save landing with the given flashcard. */
export const landed = (flashcard: Flashcard) => ({ data: flashcard });

/** The form the app has after an action, with the effects its update returns. */
export function formUpdate(app: AppState, action: AppAction) {
  const route = mainScreenOf(app.route);
  if (route.screen !== "media") throw new Error("No media screen is open.");
  const [form, effects] = updateFlashcardForm(formOf(app), action, app, route);
  return { form, effects };
}

/** The form after the actions. */
export const formAfter = (app: AppState): FlashcardForm | null => formOf(app);

/** The effects the form and the flashcard commands return for an action, before the root update holds back scoped requests. */
export function flashcardEffects(
  app: AppState,
  action: AppAction,
): readonly Effect[] {
  const route = mainScreenOf(app.route);
  const formEffects =
    route.screen === "media" ? formUpdate(app, action).effects : [];
  return [...formEffects, ...flashcardCommands(action, app)];
}

/** The flashcard requests the flashcards feature asks for on an action, with their ids and scopes. */
export function requestsAsked(app: AppState, action: AppAction) {
  return flashcardEffects(app, action).flatMap((effect) => {
    if (effect.type !== "sendRequest") return [];
    const { id, scope, request } = effect;
    return request.kind === "saveFlashcard" ||
      request.kind === "deleteFlashcard"
      ? [{ id, scope, request }]
      : [];
  });
}

/** The notices the flashcards feature asks to show on an action. */
export function noticesShown(app: AppState, action: AppAction) {
  return flashcardEffects(app, action).flatMap((effect) =>
    effect.type === "showNotice" ? [effect.content] : [],
  );
}

/** The flashcard ids of the saves held for their word's lookup. */
export function heldCardIds(app: AppState): string[] {
  return app.operations.requests.flatMap(({ request, heldFor }) =>
    heldFor !== undefined && request.kind === "saveFlashcard"
      ? [request.flashcardId]
      : [],
  );
}
