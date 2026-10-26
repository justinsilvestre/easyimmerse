import type { EffectRunners } from "../app/runEffect.ts";
import type { RouteEffect } from "./routeEffect.ts";

/** Performs the route's effects through the platform. */
export const routeEffectRunners = {
  writeLocation: (effect, { effects }) =>
    effects.writeLocation(effect.path, effect.write),
} satisfies EffectRunners<RouteEffect>;
