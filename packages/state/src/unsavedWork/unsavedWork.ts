import type { Feature } from "../app/feature.ts";
import type { EffectRunners } from "../app/runEffect.ts";

/** How many pieces of work closing the app would lose, such as flashcard saves under way or unsaved changes in the editor. */
export type UnsavedWorkState = { count: number };

/** The action creators that count the work closing the app would lose. */
export const unsavedWorkActions = {
  /** Work that closing the app would lose has begun; the app warns before closing until all of it ends. */
  unsavedWorkBegan: () => ({ type: "unsavedWorkBegan" }) as const,
  /** A piece of work that closing the app would lose has ended, by being saved or given up. */
  unsavedWorkEnded: () => ({ type: "unsavedWorkEnded" }) as const,
};

/** An action of the unsaved work. */
export type UnsavedWorkAction = ReturnType<
  (typeof unsavedWorkActions)[keyof typeof unsavedWorkActions]
>;

/** The side effect of the unsaved work: guarding the app's closing, or no longer guarding it. */
export type UnsavedWorkEffect = { type: "guardClose"; isActive: boolean };

/** The unsaved work as a feature: a count that guards the app's closing while it is above zero. */
export const unsavedWorkFeature: Feature<UnsavedWorkState> = {
  initialState: { count: 0 },
  update: (work, action) => {
    switch (action.type) {
      case "unsavedWorkBegan":
        return [
          { count: work.count + 1 },
          work.count === 0 ? [{ type: "guardClose", isActive: true }] : [],
        ];
      case "unsavedWorkEnded": {
        const count = Math.max(work.count - 1, 0);
        return [
          { count },
          work.count > 0 && count === 0
            ? [{ type: "guardClose", isActive: false }]
            : [],
        ];
      }
      default:
        return [work, []];
    }
  },
};

/** Performs the unsaved work's effect. */
export const unsavedWorkEffectRunners = {
  guardClose: (effect, effects) => effects.guardClose(effect.isActive),
} satisfies EffectRunners<UnsavedWorkEffect>;
