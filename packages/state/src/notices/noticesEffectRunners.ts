import { actions } from "../app/appAction.ts";
import type { EffectRunners } from "../app/runEffect.ts";
import type { NoticesEffect } from "./noticesEffect.ts";

/** Performs the notices' effects: a notice asked for by another feature is requested, or withdrawn, at once. */
export const noticesEffectRunners = {
  showNotice: (effect, { dispatch }) =>
    dispatch(actions.noticeRequested(effect.content)),
  withdrawNotice: (effect, { dispatch }) =>
    dispatch(actions.noticeWithdrawn(effect.key)),
} satisfies EffectRunners<NoticesEffect>;
