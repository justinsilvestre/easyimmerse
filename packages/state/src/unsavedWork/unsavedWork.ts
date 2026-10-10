import type { Feature } from "../app/feature.ts";
import type { EffectRunners } from "../app/runEffect.ts";

/**
 * How many pieces of work closing the app would lose, such as flashcard saves under way or unsaved changes in the editor.
 * Once flashcard saving moves into the store, as a slice of failed saves and confirmed flashcards with the per-flashcard queues as scoped requests under `operations`, this count becomes a selector over them.
 */
export type UnsavedWorkState = { count: number };

export const unsavedWorkActions = {
  /** Work that closing the app would lose has begun; the app warns before closing until all of it ends. */
  unsavedWorkBegan: () => ({ type: "unsavedWorkBegan" }) as const,
  unsavedWorkEnded: () => ({ type: "unsavedWorkEnded" }) as const,
};

export type UnsavedWorkAction = ReturnType<
  (typeof unsavedWorkActions)[keyof typeof unsavedWorkActions]
>;

export type UnsavedWorkEffect = { type: "guardClose"; isActive: boolean };

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

export const unsavedWorkEffectRunners = {
  guardClose: (effect, effects) => effects.guardClose(effect.isActive),
} satisfies EffectRunners<UnsavedWorkEffect>;
