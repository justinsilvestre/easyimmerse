import { skipToken, useLookupQuery } from "@easyimmerse/backend";
import { actions, selectPlayer } from "@easyimmerse/state";
import type { Cue, LookupResponse } from "@easyimmerse/types";
import { useRef, useState } from "react";
import { useAppDispatch } from "../../hooks/useAppDispatch.ts";
import { useAppSelector } from "../../hooks/useAppSelector.ts";
import type { LookupState } from "../../lookup/lookupState.ts";

/** The word the pop-up looks up, and the cue it was found in. */
type LookupRequest = {
  mode: "hover" | "search";
  term: string | null;
  cue: Cue | null;
};

/**
 * Opens the dictionary pop-up on a word in the subtitles, or with a search field, and looks the word up
 * in the dictionaries of the language. Playback pauses while the pop-up is open and resumes when it closes.
 */
export function useLookupPopup(language: string) {
  const dispatch = useAppDispatch();
  const isPlaying = useAppSelector(selectPlayer).isPlaying;
  const [request, setRequest] = useState<LookupRequest | null>(null);
  const pausedPlayback = useRef(false);
  const term = request?.term ?? null;
  const { data, isError } = useLookupQuery(
    term === null ? skipToken : { language, term },
  );
  const open = (next: LookupRequest) => {
    if (request === null && isPlaying) {
      pausedPlayback.current = true;
      dispatch(actions.pauseRequested());
    }
    setRequest(next);
  };
  return {
    request,
    state: lookupStateOf(term, language, data, isError),
    hover: (word: string, cue: Cue | null) =>
      open({ mode: "hover", term: word, cue }),
    search: () => open({ mode: "search", term: null, cue: null }),
    submit: (word: string) =>
      request && setRequest({ ...request, term: word.trim() || null }),
    close: () => {
      setRequest(null);
      if (pausedPlayback.current) dispatch(actions.playRequested());
      pausedPlayback.current = false;
    },
    /** Closes the pop-up and leaves playback paused, as when a flashcard is made from it. */
    closeWithoutResuming: () => {
      setRequest(null);
      pausedPlayback.current = false;
    },
  };
}

function lookupStateOf(
  term: string | null,
  language: string,
  response: LookupResponse | undefined,
  isError: boolean,
): LookupState | null {
  if (term === null) return null;
  if (isError) return { kind: "notFound", term };
  if (response === undefined) return { kind: "loading", term };
  if (response.dictionary_count === 0)
    return { kind: "noDictionary", language };
  if (response.entries.length === 0) return { kind: "notFound", term };
  return { kind: "found", term, entries: response.entries };
}
