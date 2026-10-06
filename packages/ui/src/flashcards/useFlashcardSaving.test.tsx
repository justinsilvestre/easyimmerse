import type { BackendRequest } from "@easyimmerse/backend";
import { resetBackend } from "@easyimmerse/backend";
import type { Flashcard, FlashcardDraft } from "@easyimmerse/types";
import { act, cleanup, renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AppStoreProviders } from "../testSupport/AppStoreProviders.tsx";
import { createFakeBackendClient } from "../testSupport/createFakeBackendClient.ts";
import { createTestAppStore } from "../testSupport/createTestAppStore.ts";
import { fixtureResponses } from "../testSupport/fixtureResponses.ts";
import { savedFlashcard } from "../testSupport/renderMediaScreen.tsx";
import { createCardSession, createFlashcardId } from "./editedFlashcard.ts";
import { exampleFlashcard } from "./exampleFlashcard.ts";
import { useEditedFlashcard } from "./useEditedFlashcard.ts";
import { useFlashcardSaving } from "./useFlashcardSaving.ts";

afterEach(() => {
  cleanup();
  resetBackend();
});

const draft: FlashcardDraft = {
  media_file_id: "m1",
  cue_index: 1,
  content: { ...exampleFlashcard, word: "Hund" },
  included_fields: ["word"],
};

/** Renders the hook with saves that settle when the test says so. */
function renderSaving() {
  const finishes: ((saved: Flashcard) => void)[] = [];
  const backend = createFakeBackendClient(fixtureResponses);
  const client = {
    send: <T,>(request: BackendRequest) =>
      request.method === "POST"
        ? new Promise<{ data: T }>((resolve) => {
            finishes.push((saved) => resolve({ data: saved as T }));
          })
        : backend.send<T>(request),
  };
  const { store, playerRegistry } = createTestAppStore(client);
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
        "p1",
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
    await vi.waitFor(() => expect(finishes).toHaveLength(1));
    withoutActEnvironment(() => {
      result.current.dispatchEdited(start());
      finishes[0]?.(savedFlashcard);
    });
    await act(() => new Promise((resolve) => setTimeout(resolve, 0)));
    expect(result.current.saving.isSaved).toBe(false);
  });
});
