import type { AppState } from "../../app/appState.ts";
import { combineUpdates } from "../../app/combineUpdates.ts";
import { updated } from "../../app/updated.ts";
import { updateFlashcardForm } from "../../flashcards/updateFlashcardForm.ts";
import { updateLookup } from "../lookup/updateLookup.ts";
import { updateReaderScreen } from "../readerScreen/updateReaderScreen.ts";
import type { MediaScreenState } from "../screenState.ts";
import { updateMediaPanels } from "./mediaPanels.ts";
import { selectShownMediaScreen } from "./mediaScreenSelectors.ts";
import { updateSourceMedia } from "./sourceMedia/updateSourceMedia.ts";
import { updatePathPlayback } from "./updatePathPlayback.ts";
import { updatePlaying } from "./updatePlaying.ts";
import { updateSubtitles } from "./updateSubtitles.ts";
import { updateWaveform } from "./updateWaveform.ts";

/** Updates the media screen. Each part has its own update, which sees the app as it was before the action. */
export const updateMediaScreen = combineUpdates<MediaScreenState, [AppState]>({
  playing: updatePlaying,
  flashcardForm: updateFlashcardForm,
  waveform: updateWaveform,
  panels: updateMediaPanels,
  cuePanelSpan: (span, action) =>
    updated(action.type === "cuePanelSpanMeasured" ? action.span : span),
  reader: (reader, action) => updated(updateReaderScreen(reader, action)),
  lookup: (lookup, action, app) =>
    updateLookup(lookup, action, selectShownMediaScreen(app).playing.player),
  sourceMedia: updateSourceMedia,
  pendingSubtitleFile: updateSubtitles,
  playback: updatePathPlayback,
});
