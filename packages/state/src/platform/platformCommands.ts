import type { AppAction } from "../app/appAction.ts";
import type { EffectRunners } from "../app/runEffect.ts";

/** What the app asks of the platform it runs on without changing any state. */
export type PlatformEffect =
  | { type: "showNotification"; message: string }
  | { type: "openExternalUrl"; url: string };

/** Returns the effects of an action that asks the platform for something and changes no state. */
export function platformCommands(action: AppAction): PlatformEffect[] {
  switch (action.type) {
    case "notificationRequested":
      return [{ type: "showNotification", message: action.message }];
    case "externalLinkRequested":
      return [{ type: "openExternalUrl", url: action.url }];
    default:
      return [];
  }
}

export const platformEffectRunners = {
  showNotification: (effect, effects) =>
    effects.showNotification(effect.message),
  openExternalUrl: (effect, effects) => effects.openExternalUrl(effect.url),
} satisfies EffectRunners<PlatformEffect>;
