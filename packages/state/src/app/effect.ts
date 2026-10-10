import type { PlatformEffect } from "../platform/platformCommands.ts";
import type { PreferencesEffect } from "../preferences/preferencesEffect.ts";
import type { ScreenEffect } from "../screen/screenEffect.ts";
import type { StoredPlacesEffect } from "../storedPlaces/storedPlacesEffect.ts";
import type { TimerEffect } from "../timers/timerEffect.ts";
import type { UnsavedWorkEffect } from "../unsavedWork/unsavedWork.ts";

/** A description of a side effect to perform. Effects are plain data and contain no code. */
export type Effect =
  | ScreenEffect
  | PreferencesEffect
  | StoredPlacesEffect
  | UnsavedWorkEffect
  | PlatformEffect
  | TimerEffect;
