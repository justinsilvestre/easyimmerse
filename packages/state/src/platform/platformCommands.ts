import type { AppAction } from "../app/appAction.ts";

/** What the app asks of the platform it runs on without changing any state. */
export type PlatformEffect =
  | { type: "openExternalUrl"; url: string }
  | { type: "copyText"; text: string; what: string }
  /** Warns before the app closes while `isActive`, as while closing it would lose work. */
  | { type: "guardClose"; isActive: boolean };

/** Returns the effects of an action that asks the platform for something and changes no state. */
export function platformCommands(action: AppAction): PlatformEffect[] {
  switch (action.type) {
    case "externalLinkRequested":
      return [{ type: "openExternalUrl", url: action.url }];
    case "textCopyRequested":
      return [{ type: "copyText", text: action.text, what: action.what }];
    default:
      return [];
  }
}
