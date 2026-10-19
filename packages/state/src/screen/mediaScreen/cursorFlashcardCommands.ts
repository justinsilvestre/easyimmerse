import type { FlashcardDraft } from "@easyimmerse/types";
import type { AppAction } from "../../app/appAction.ts";
import type { Effect } from "../../app/effect.ts";
import type { ReadableState } from "../../app/feature.ts";
import { draftFromCue } from "../../flashcards/draftFromCue.ts";
import type { FlashcardStart } from "../../flashcards/flashcardsEffect.ts";
import type { ChosenWord } from "../lookup/lookupState.ts";
import {
  type CueFlashcardSources,
  cachedCueFlashcardSources,
} from "./cueFlashcardSources.ts";
import { findTranslationOf } from "./findCue.ts";
import { selectMediaScreen } from "./mediaScreenSelectors.ts";
import type { PlayerState } from "./playerState.ts";
import { shownCueOf } from "./selectShownCue.ts";

type CursorFlashcardApp = Pick<
  ReadableState,
  "route" | "screen" | "server" | "backend"
>;

/**
 * Returns the flashcard that the C or E key asks for on the open media screen:
 * one for the lookup cursor's word from its cue, to be filled from the word's lookup,
 * or, when there is no cursor, one for no word from the cue shown now.
 * Its draft is built from the server cache as `draftFromCue` describes, and it gets its id as the effect runs.
 * Nothing is asked for while the cache lacks the file's record or the project's settings.
 */
export function cursorFlashcardCommands(
  action: AppAction,
  app: CursorFlashcardApp,
) {
  if (action.type !== "lookupCursorFlashcardRequested") return [];
  const open = selectMediaScreen(app);
  if (open === null) return [];
  const sources = cachedCueFlashcardSources(app, open.route);
  if (sources === null) return [];
  const chosen = open.screen.lookup.cursor?.chosen ?? null;
  const draft = cursorDraft(sources, chosen, open.screen.playing.player);
  const start: FlashcardStart = {
    destination: action.destination,
    draft,
    lookup: chosen && { chosen, context: sources.context },
  };
  return [{ type: "startFlashcardWithNewId", start }] satisfies Effect[];
}

/** The draft for the cursor's word from its cue, or for no word from the cue shown at the player's time. */
function cursorDraft(
  sources: CueFlashcardSources,
  chosen: ChosenWord | null,
  player: PlayerState,
): FlashcardDraft {
  const source = chosen?.source ?? null;
  const cue =
    source?.kind === "cue" ? source.cue : shownCueOf(player, sources.cues);
  return draftFromCue({
    word: chosen?.word.term ?? "",
    wordStart: chosen?.occurrence?.start ?? null,
    cue,
    translationCue: cue && findTranslationOf(cue, sources.translationCues),
    mediaFile: sources.mediaFile,
    settings: sources.settings,
    hasScreenshots: sources.hasScreenshots,
  });
}
