import type { AppAction } from "../../app/appAction.ts";
import { combineUpdates } from "../../app/combineUpdates.ts";
import type { Effect } from "../../app/effect.ts";
import type { Update } from "../../app/update.ts";
import { updated } from "../../app/updated.ts";
import { updateFlashcardForm } from "../../flashcards/updateFlashcardForm.ts";
import { updateLookup } from "../lookup/updateLookup.ts";
import { updateReaderScreen } from "../readerScreen/updateReaderScreen.ts";
import type { ScreenApp } from "../screenApp.ts";
import type { MediaScreenState } from "../screenState.ts";
import { updateMediaPanels } from "./mediaPanels.ts";
import {
  selectFlashcardForm,
  selectShownMediaScreen,
} from "./mediaScreenSelectors.ts";
import { updateSourceMedia } from "./sourceMedia/updateSourceMedia.ts";
import { updatePathPlayback } from "./updatePathPlayback.ts";
import { updatePlaying } from "./updatePlaying.ts";
import { updateSubtitles } from "./updateSubtitles.ts";
import { updateWaveform } from "./updateWaveform.ts";

/**
 * Updates the media screen. Each part has its own update, which sees the app as it was before the action.
 * The waveform comes last, since the stretch of the file it loads follows the screen's other parts as they are after the action.
 */
export function updateMediaScreen(
  screen: MediaScreenState,
  action: AppAction,
  app: ScreenApp,
): Update<MediaScreenState, Effect> {
  const [next, effects] = updateOtherParts(screen, action, app);
  const [waveform, waveformEffects] = updateWaveform(next, action, app);
  return updated(
    waveform === next.waveform ? next : { ...next, waveform },
    ...effects,
    ...waveformEffects,
  );
}

const updateOtherParts = combineUpdates<MediaScreenState, [ScreenApp]>({
  playing: updatePlaying,
  flashcardForm: updateFlashcardForm,
  panels: (panels, action, app) =>
    updated(
      updateMediaPanels(panels, action, selectFlashcardForm(app) !== null),
    ),
  cuePanelSpan: (span, action) =>
    updated(action.type === "cuePanelSpanMeasured" ? action.span : span),
  reader: (reader, action) => updated(updateReaderScreen(reader, action)),
  lookup: (lookup, action, app) =>
    updateLookup(lookup, action, selectShownMediaScreen(app).playing.player),
  sourceMedia: updateSourceMedia,
  pendingSubtitleFile: updateSubtitles,
  playback: updatePathPlayback,
});
