import type { AppAction } from "../../app/appAction.ts";
import type { AppState } from "../../app/appState.ts";
import type { Effect } from "../../app/effect.ts";
import type { MediaRoute } from "../../route/route.ts";
import { updateLookup } from "../lookup/updateLookup.ts";
import type { MediaScreenState } from "../screenState.ts";
import { updateMediaPanels } from "./mediaPanels.ts";
import { updateClipLoop } from "./updateClipLoop.ts";
import { updateClipPlayback } from "./updateClipPlayback.ts";
import { updatePathPlayback } from "./updatePathPlayback.ts";
import { updatePlayer } from "./updatePlayer.ts";
import { updateResume } from "./updateResume.ts";
import { updateSubtitlePick } from "./updateSubtitlePick.ts";
import { updateWaveform } from "./updateWaveform.ts";

type MediaScreenUpdate = (
  screen: MediaScreenState,
  action: AppAction,
  route: MediaRoute,
  app: AppState,
) => readonly [MediaScreenState, readonly Effect[]];

/** The parts of the media screen's update, in the order each sees an action. The loop comes after the player has recorded a time, and the clip Play after the loop has moved it. */
const mediaScreenUpdates: readonly MediaScreenUpdate[] = [
  (screen, action, route) => {
    const [waveform, effects] = updateWaveform(screen.waveform, action, route);
    return [
      waveform === screen.waveform ? screen : { ...screen, waveform },
      effects,
    ];
  },
  (screen, action) => {
    const panels = updateMediaPanels(screen.panels, action);
    return [panels === screen.panels ? screen : { ...screen, panels }, []];
  },
  updatePlayer,
  (screen, action, _route, app) => {
    const [lookup, effects] = updateLookup(
      screen.lookup,
      action,
      screen.player,
      app,
    );
    return [lookup === screen.lookup ? screen : { ...screen, lookup }, effects];
  },
  updateSubtitlePick,
  updateClipLoop,
  updateClipPlayback,
  updateResume,
  updatePathPlayback,
];

/**
 * Updates the media screen: its player, the dictionary pop-up, the clip loop, the clip Play, the resume seek, how a file on the server's disk plays,
 * the subtitles file picked for it, its waveform, and the panels around its stage.
 * `app` is the state before the action.
 */
export function updateMediaScreen(
  screen: MediaScreenState,
  action: AppAction,
  route: MediaRoute,
  app: AppState,
): readonly [MediaScreenState, readonly Effect[]] {
  let next = screen;
  const effects: Effect[] = [];
  for (const update of mediaScreenUpdates) {
    const [updated, partEffects] = update(next, action, route, app);
    next = updated;
    effects.push(...partEffects);
  }
  return [next, effects];
}
