import type { AppAction } from "../../app/appAction.ts";
import type { AppState } from "../../app/appState.ts";
import type { Effect } from "../../app/effect.ts";
import type { Update } from "../../app/update.ts";
import { updated } from "../../app/updated.ts";
import type { MediaRoute } from "../../route/route.ts";
import { updateLookup } from "../lookup/updateLookup.ts";
import { updateReaderScreen } from "../readerScreen/updateReaderScreen.ts";
import type { MediaScreenState } from "../screenState.ts";
import { updateMediaPanels } from "./mediaPanels.ts";
import { picturesProbeOf } from "./picturesProbe.ts";
import { updateSourceMedia } from "./sourceMedia/updateSourceMedia.ts";
import { updateClipLoop } from "./updateClipLoop.ts";
import { updateClipPlayback } from "./updateClipPlayback.ts";
import { updateFlashcardForm } from "./updateFlashcardForm.ts";
import { updatePathPlayback } from "./updatePathPlayback.ts";
import { updatePlayer } from "./updatePlayer.ts";
import { updateResume } from "./updateResume.ts";
import { updateSubtitlePick } from "./updateSubtitlePick.ts";
import { updateSubtitleSelection } from "./updateSubtitleSelection.ts";
import { updateWaveform } from "./updateWaveform.ts";

type MediaScreenUpdate = (
  screen: MediaScreenState,
  action: AppAction,
  route: MediaRoute,
  app: AppState,
) => Update<MediaScreenState, Effect>;

/** The parts of the media screen's update, in the order each sees an action. The loop comes after the player has recorded a time, and the clip Play after the loop has moved it. */
const mediaScreenUpdates: readonly MediaScreenUpdate[] = [
  (screen, action, route) => {
    const [waveform, effects] = updateWaveform(screen.waveform, action, route);
    return updated(
      waveform === screen.waveform ? screen : { ...screen, waveform },
      ...effects,
    );
  },
  (screen, action) => {
    // The form takes the side panel while a card is open, so the subtitles panel cannot be toggled meanwhile.
    if (action.type === "cuePanelToggled" && screen.flashcardForm !== null)
      return updated(screen);
    const panels = updateMediaPanels(screen.panels, action);
    return updated(panels === screen.panels ? screen : { ...screen, panels });
  },
  (screen, action) =>
    action.type === "cuePanelSpanMeasured"
      ? updated({ ...screen, cuePanelSpan: action.span })
      : updated(screen),
  (screen, action) => {
    const reader = updateReaderScreen(screen.reader, action);
    return updated(reader === screen.reader ? screen : { ...screen, reader });
  },
  updatePlayer,
  (screen, action, _route, app) => {
    const [lookup, effects] = updateLookup(
      screen.lookup,
      action,
      screen.player,
      app,
    );
    return updated(
      lookup === screen.lookup ? screen : { ...screen, lookup },
      ...effects,
    );
  },
  (screen, action, route, app) => {
    const [sourceMedia, effects] = updateSourceMedia(
      screen.sourceMedia,
      action,
      route,
      app,
    );
    return updated(
      sourceMedia === screen.sourceMedia ? screen : { ...screen, sourceMedia },
      ...effects,
    );
  },
  updateSubtitlePick,
  updateSubtitleSelection,
  (screen, action, _route, app) => updateFlashcardForm(screen, action, app),
  (screen, action, route) => updated(screen, ...picturesProbeOf(action, route)),
  updateClipLoop,
  updateClipPlayback,
  updateResume,
  updatePathPlayback,
];

/**
 * Updates the media screen: its player, the dictionary pop-up, the plugin source dialog, the flashcard form, the clip loop, the clip Play, the resume seek, how a file on the server's disk plays,
 * the subtitles file picked for it and the tracks chosen to show, its waveform, the panels around its stage, and the reader's own state while the file is a book.
 * `app` is the state before the action.
 */
export function updateMediaScreen(
  screen: MediaScreenState,
  action: AppAction,
  route: MediaRoute,
  app: AppState,
) {
  let next = screen;
  const effects: Effect[] = [];
  for (const update of mediaScreenUpdates) {
    const [partScreen, partEffects] = update(next, action, route, app);
    next = partScreen;
    effects.push(...partEffects);
  }
  return updated(next, ...effects);
}
