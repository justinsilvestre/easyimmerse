import type { AppAction } from "../app/appAction.ts";

/** What the app asks of the platform it runs on without changing any state. */
export type PlatformEffect = { type: "openExternalUrl"; url: string };

/** Returns the effects of an action that asks the platform for something and changes no state. */
export function platformCommands(action: AppAction): PlatformEffect[] {
  switch (action.type) {
    case "externalLinkRequested":
      return [{ type: "openExternalUrl", url: action.url }];
    default:
      return [];
  }
}
