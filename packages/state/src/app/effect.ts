import type { PlatformEffect } from "../platform/platformCommands.ts";
import type { PreferencesEffect } from "../preferences/preferencesActions.ts";
import type { ScreenEffect } from "../screen/screenActions.ts";
import type { StoredPlacesEffect } from "../storedPlaces/storedPlacesActions.ts";
import type { UnsavedWorkEffect } from "../unsavedWork/unsavedWork.ts";

/** A description of a side effect to perform. Effects are plain data and contain no code. */
export type Effect =
  | ScreenEffect
  | PreferencesEffect
  | StoredPlacesEffect
  | UnsavedWorkEffect
  | PlatformEffect;
