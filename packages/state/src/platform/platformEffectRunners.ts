import type { EffectRunners } from "../app/runEffect.ts";
import type { PlatformEffect } from "./platformCommands.ts";

/** Performs the platform commands' effects. */
export const platformEffectRunners = {
  openExternalUrl: (effect, { effects }) => effects.openExternalUrl(effect.url),
} satisfies EffectRunners<PlatformEffect>;
