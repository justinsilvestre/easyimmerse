import type { AppState } from "../appState.ts";
import { loopPlayer } from "../player/withPlayer.ts";
import type { UpdateHandlers, UpdateResult } from "../updateHandlers.ts";
import type { LookupState } from "./lookupState.ts";
import { closedLookup, willResumeOnClose } from "./lookupState.ts";

type OpenLookup = Extract<LookupState, { kind: "open" }>;

/** The fields of an open lookup that the action supplies. */
type LookupRequest = Pick<OpenLookup, "term" | "context" | "clip" | "typed">;

export const lookupHandlers = {
  wordHovered: (state, { word, context, clip }) =>
    openLookup(state, { term: word, context, clip, typed: false }),
  lookupOpenedForTyping: (state) =>
    openLookup(state, { term: "", context: null, clip: null, typed: true }),
  lookupTermTyped: (state, { term }) => [
    state.lookup.kind === "open"
      ? { ...state, lookup: { ...state.lookup, term } }
      : state,
    [],
  ],
  lookupClosed: closeLookup,
} satisfies Partial<UpdateHandlers>;

/**
 * Opens the pop-up in place of any open one.
 * While media plays, the player repeats the clip when there is one and pauses otherwise.
 */
function openLookup(state: AppState, request: LookupRequest): UpdateResult {
  const { playing } = state.player;
  const resumePlaybackOnClose = playing || willResumeOnClose(state.lookup);
  const lookup: LookupState = {
    kind: "open",
    ...request,
    resumePlaybackOnClose,
  };
  const opened = { ...state, lookup };
  if (!playing) return [opened, []];
  if (request.clip === null) return [opened, [{ type: "pausePlayer" }]];
  return loopPlayer(opened, request.clip);
}

/**
 * Closes the pop-up and resumes playback if the pop-up interrupted it.
 * When the flashcard editor is open underneath, the editor's loop comes back instead,
 * and the editor resumes playback once it closes in turn.
 */
function closeLookup(state: AppState): UpdateResult {
  if (state.lookup.kind === "closed") return [state, []];
  const resume = willResumeOnClose(state.lookup);
  const closed = { ...state, lookup: closedLookup };
  const editor = state.flashcardEditor;
  if (editor.kind === "editing") {
    const resumePlaybackOnClose = editor.resumePlaybackOnClose || resume;
    const flashcardEditor = { ...editor, resumePlaybackOnClose };
    return loopPlayer({ ...closed, flashcardEditor }, editor.card.clip);
  }
  const [unlooped, effects] = loopPlayer(closed, null);
  return [unlooped, resume ? [...effects, { type: "playPlayer" }] : effects];
}
