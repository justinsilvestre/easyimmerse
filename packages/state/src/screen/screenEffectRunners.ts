import { actions } from "../app/appAction.ts";
import type { EffectRunners } from "../app/runEffect.ts";
import type { ScreenEffect } from "./screenEffect.ts";

/** Performs the screens' effects. A file pick that fails counts as cancelled. */
export const screenEffectRunners = {
  seekPlayer: (effect, effects) => effects.seekPlayer(effect.seconds),
  togglePlayer: (_, effects) => effects.togglePlayer(),
  playPlayer: (_, effects) => effects.playPlayer(),
  pausePlayer: (_, effects) => effects.pausePlayer(),
  pickFile: (effect, effects, dispatch) => {
    effects
      .pickFile(effect.accept)
      .then((file) =>
        dispatch(file ? actions.fileChosen(file) : actions.filePickCancelled()),
      )
      .catch(() => dispatch(actions.filePickCancelled()));
  },
  pickMediaFile: (effect, effects, dispatch) => {
    effects
      .pickMediaFile(effect.accept)
      .then((file) =>
        dispatch(
          file
            ? actions.mediaFileChosen(file)
            : actions.mediaFilePickCancelled(),
        ),
      )
      .catch(() => dispatch(actions.mediaFilePickCancelled()));
  },
  pickDictionaryFile: (effect, effects, dispatch) => {
    effects
      .pickDictionaryFile(effect.accept)
      .then((file) =>
        dispatch(
          file
            ? actions.dictionaryFileChosen(file)
            : actions.dictionaryFilePickCancelled(),
        ),
      )
      .catch(() => dispatch(actions.dictionaryFilePickCancelled()));
  },
} satisfies EffectRunners<ScreenEffect>;
