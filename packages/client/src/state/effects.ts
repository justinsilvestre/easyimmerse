import type { AppAction } from "./appActions.ts";

/**
 * Creators of effects, which are descriptions of the side effects requested by state updates.
 * The side effects themselves are carried out by the effects runners of the current platform.
 */
export const effects = {
  /** Requests a lookup of the API server's address, to be reported in a `serverUrlResolved` action. */
  resolveServerUrl: () => ({ type: "resolveServerUrl" }) as const,
};

export type Effect = ReturnType<(typeof effects)[keyof typeof effects]>;

export type DispatchAppAction = (action: AppAction) => void;

/** The platform-specific functions carrying out each type of effect. */
export type EffectsRunners = {
  [SpecificEffect in Effect as SpecificEffect["type"]]: (
    effect: SpecificEffect,
    dispatch: DispatchAppAction,
  ) => void | Promise<void>;
};
