import type { EffectRunners } from "../app/runEffect.ts";
import { platformActions } from "./platformActions.ts";
import type { PlatformEffect } from "./platformCommands.ts";

/** Performs the platform commands' effects. A copy reports whether the platform made it. */
export const platformEffectRunners = {
  openExternalUrl: (effect, { effects }) => effects.openExternalUrl(effect.url),
  guardClose: (effect, { effects }) => effects.guardClose(effect.isActive),
  copyText: (effect, { effects, dispatch }) =>
    void effects.copyText(effect.text).then(
      () => dispatch(platformActions.textCopied(effect.what)),
      () => dispatch(platformActions.textCopyFailed(effect.what)),
    ),
} satisfies EffectRunners<PlatformEffect>;
