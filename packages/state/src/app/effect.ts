import type { FlashcardsEffect } from "../flashcards/flashcardsEffect.ts";
import type { NoticesEffect } from "../notices/noticesEffect.ts";
import type { FailedRequestsEffect } from "../operations/failedRequests.ts";
import type { FreeIdRequestEffect } from "../operations/freeIdRequests.ts";
import type { JobsEffect } from "../operations/jobsEffect.ts";
import type { PlatformEffect } from "../platform/platformCommands.ts";
import type { PreferencesEffect } from "../preferences/preferencesEffect.ts";
import type { ScreenEffect } from "../screen/screenEffect.ts";
import type { ServerEffect } from "../server/serverEffect.ts";
import type { StoredPlacesEffect } from "../storedPlaces/storedPlacesEffect.ts";
import type { TimerEffect } from "../timers/timerEffect.ts";
import type { DispatchEffect } from "./dispatchEffect.ts";

/** A description of a side effect to perform. Effects are plain data and contain no code. */
export type Effect =
  | ScreenEffect
  | PreferencesEffect
  | StoredPlacesEffect
  | FlashcardsEffect
  | NoticesEffect
  | PlatformEffect
  | TimerEffect
  | ServerEffect
  | JobsEffect
  | DispatchEffect
  | FailedRequestsEffect
  | FreeIdRequestEffect;

/** An effect that the middleware performs: every effect except those the root update translates into others. */
export type PerformedEffect = Exclude<
  Effect,
  JobsEffect | FailedRequestsEffect | FreeIdRequestEffect
>;
