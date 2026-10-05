import type { Flashcard, FlashcardDraft } from "@easyimmerse/types";
import { act, cleanup, renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it } from "vitest";
import { AppStoreProviders } from "../testSupport/AppStoreProviders.tsx";
import { createTestAppStore } from "../testSupport/createTestAppStore.ts";
import { savedFlashcard } from "../testSupport/renderMediaScreen.tsx";
import { createCardSession, createFlashcardId } from "./editedFlashcard.ts";
import { exampleFlashcard } from "./exampleFlashcard.ts";
import { useEditedFlashcard } from "./useEditedFlashcard.ts";
import type { useFlashcardRequests } from "./useFlashcardRequests.ts";
import { useFlashcardSaving } from "./useFlashcardSaving.ts";

afterEach(cleanup);

const draft: FlashcardDraft = {
  media_file_id: "m1",
  cue_index: 1,
  content: { ...exampleFlashcard, word: "Hund" },
  included_fields: ["word"],
};

/** Renders the hook with saves that settle when the test says so. */
function renderSaving() {
  const finishes: ((saved: Flashcard) => void)[] = [];
  const requests = {
    send: () =>
      new Promise<Flashcard>((resolve) => {
        finishes.push(resolve);
      }),
  } as unknown as ReturnType<typeof useFlashcardRequests>;
  const { store, playerRegistry } = createTestAppStore();
  const wrapper = ({ children }: { children: ReactNode }) => (
    <AppStoreProviders store={store} playerRegistry={playerRegistry}>
      {children}
    </AppStoreProviders>
  );
  const rendered = renderHook(
    () => {
      const editor = useEditedFlashcard();
      const saving = useFlashcardSaving(
        editor.edited,
        editor.dispatchEdited,
        requests,
        editor.openSession,
      );
      return { ...editor, saving };
    },
    { wrapper },
  );
  return { ...rendered, finishes };
}

/** Runs `work` as the app would run it, with React scheduling its renders itself instead of within the test's act scope. */
function withoutActEnvironment(work: () => void) {
  const environment = globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean };
  const wasActEnvironment = environment.IS_REACT_ACT_ENVIRONMENT;
  environment.IS_REACT_ACT_ENVIRONMENT = false;
  try {
    work();
  } finally {
    environment.IS_REACT_ACT_ENVIRONMENT = wasActEnvironment;
  }
}

const start = () =>
  ({
    type: "started",
    draft,
    flashcardId: createFlashcardId(),
    session: createCardSession(),
  }) as const;

describe("useFlashcardSaving", () => {
  it("says nothing of a save that finishes after another card was started but before React rendered it", async () => {
    const { result, finishes } = renderSaving();
    act(() => result.current.dispatchEdited(start()));
    act(() => result.current.dispatchEdited({ type: "saveRequested" }));
    await act(() => Promise.resolve());
    if (finishes.length !== 1) throw new Error("The save was not sent.");
    withoutActEnvironment(() => {
      result.current.dispatchEdited(start());
      finishes[0]?.(savedFlashcard);
    });
    await act(() => new Promise((resolve) => setTimeout(resolve, 0)));
    expect(result.current.saving.isSaved).toBe(false);
  });
});
