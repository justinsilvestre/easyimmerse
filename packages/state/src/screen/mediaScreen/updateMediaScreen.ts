import type { AppState } from "../../app/appState.ts";
import { combineUpdates } from "../../app/combineUpdates.ts";
import { updated } from "../../app/updated.ts";
import { updateFlashcardForm } from "../../flashcards/updateFlashcardForm.ts";
import type { MediaRoute } from "../../route/route.ts";
import { updateLookup } from "../lookup/updateLookup.ts";
import { updateReaderScreen } from "../readerScreen/updateReaderScreen.ts";
import type { MediaScreenState } from "../screenState.ts";
import { updateMediaPanels } from "./mediaPanels.ts";
import { updateSourceMedia } from "./sourceMedia/updateSourceMedia.ts";
import { updatePathPlayback } from "./updatePathPlayback.ts";
import { updatePlaying } from "./updatePlaying.ts";
import { updateSubtitles } from "./updateSubtitles.ts";
import { updateWaveform } from "./updateWaveform.ts";

/**
 * Updates each part of the media screen with its own update, all from the state before the action, which `app` is.
 */
export const updateMediaScreen = combineUpdates<
  MediaScreenState,
  [AppState, MediaRoute]
>({
  playing: updatePlaying,
  flashcardForm: updateFlashcardForm,
  waveform: updateWaveform,
  panels: updateMediaPanels,
  cuePanelSpan: (span, action) =>
    updated(action.type === "cuePanelSpanMeasured" ? action.span : span),
  reader: (reader, action) => updated(updateReaderScreen(reader, action)),
  lookup: updateLookup,
  sourceMedia: updateSourceMedia,
  pendingSubtitleFile: updateSubtitles,
  playback: updatePathPlayback,
});
