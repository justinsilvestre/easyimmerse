import type { AnkiConnectionStatus } from "@easyimmerse/state";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { exampleLanguages } from "../flashcards/exampleFlashcard.ts";
import {
  FlashcardSyncPanel,
  type FlashcardSyncState,
} from "./FlashcardSyncPanel.tsx";

afterEach(cleanup);

const sendingTo = (
  connection: AnkiConnectionStatus,
  isSyncing = false,
): FlashcardSyncState => ({
  kind: "ankiConnect",
  connection,
  deniedOrigin: null,
  flashcardCount: 2,
  unsentCount: 2,
  pendingDeletionCount: 0,
  nextCard: null,
  isSyncing,
});

const counting = (
  unsentCount: number,
  pendingDeletionCount: number,
  flashcardCount = 3,
): FlashcardSyncState => ({
  kind: "ankiConnect",
  connection: "connected",
  deniedOrigin: null,
  flashcardCount,
  unsentCount,
  pendingDeletionCount,
  nextCard: null,
  isSyncing: false,
});

/** Finds the paragraph whose text, across its inline elements, is exactly `text`. */
const paragraphWithText = (text: string) =>
  screen.getByText(
    (_, element) => element?.tagName === "P" && element.textContent === text,
  );

function renderPanel(state: FlashcardSyncState) {
  const calls: string[] = [];
  const call = (name: string) => () => calls.push(name);
  render(
    <FlashcardSyncPanel
      state={state}
      includedFields={["word"]}
      frontFields={[]}
      languages={exampleLanguages}
      onExportPackage={call("export")}
      onSetUpAnkiConnect={call("setUp")}
      onStartReview={call("review")}
      onSendToAnki={call("send")}
      onCheckConnection={call("check")}
      onChangeDestination={call("change")}
    />,
  );
  return calls;
}

describe("FlashcardSyncPanel", () => {
  it("opens the export from the destinations offered at first", () => {
    const calls = renderPanel({ kind: "notStarted" });
    fireEvent.click(
      screen.getByRole("button", { name: /Export an Anki deck/ }),
    );
    expect(calls).toEqual(["export"]);
  });

  it("sends the waiting cards to Anki", () => {
    const calls = renderPanel(sendingTo("connected"));
    fireEvent.click(screen.getByRole("button", { name: "Send to Anki" }));
    expect(calls).toEqual(["send"]);
  });

  it("offers no second send while one is under way", () => {
    renderPanel(sendingTo("connected", true));
    expect(
      (screen.getByRole("button", { name: "Sending…" }) as HTMLButtonElement)
        .disabled,
    ).toBe(true);
  });

  it("says the connection is being checked", () => {
    renderPanel(sendingTo("checking"));
    expect(screen.getByText("Checking Anki…")).toBeDefined();
  });

  it("checks the connection again when Anki was unreachable", () => {
    const calls = renderPanel(sendingTo("unreachable"));
    fireEvent.click(screen.getByRole("button", { name: "Check again" }));
    expect(calls).toEqual(["check"]);
  });

  it("tells how to make Anki reachable", () => {
    renderPanel(sendingTo("unreachable"));
    expect(
      screen.getByText(
        "Start Anki with the AnkiConnect add-on installed, then check again.",
      ),
    ).toBeDefined();
  });

  describe("when Anki refused easyImmerse", () => {
    it("says so", () => {
      renderPanel(sendingTo("denied"));
      expect(screen.getByText("Anki refused easyImmerse")).toBeDefined();
    });

    it("tells how to allow easyImmerse again, naming the origin Anki refused", () => {
      renderPanel({
        ...sendingTo("denied"),
        deniedOrigin: "tauri://localhost",
      });
      expect(
        paragraphWithText(
          "Check again and choose Yes when Anki asks. If it does not ask, choose Tools, then Add-ons in Anki, select AnkiConnect, choose Config, remove tauri://localhost from ignoreOriginList, and check again.",
        ),
      ).toBeDefined();
    });

    it("tells how to allow easyImmerse again when the origin Anki refused is not known", () => {
      renderPanel(sendingTo("denied"));
      expect(
        paragraphWithText(
          "Check again and choose Yes when Anki asks. If it does not ask, choose Tools, then Add-ons in Anki, select AnkiConnect, choose Config, empty ignoreOriginList, and check again.",
        ),
      ).toBeDefined();
    });

    it("checks the connection again", () => {
      const calls = renderPanel(sendingTo("denied"));
      fireEvent.click(screen.getByRole("button", { name: "Check again" }));
      expect(calls).toEqual(["check"]);
    });
  });

  it("lets the user choose another destination", () => {
    const calls = renderPanel(sendingTo("connected"));
    fireEvent.click(screen.getByRole("button", { name: "Change destination" }));
    expect(calls).toEqual(["change"]);
  });

  describe("when the cards go to Anki through AnkiConnect", () => {
    it("counts the cards waiting to be sent", () => {
      renderPanel(counting(3, 0));
      expect(
        screen.getByText("3 flashcards waiting to be sent."),
      ).toBeDefined();
    });

    it("counts the notes waiting to be deleted beside the cards to send", () => {
      renderPanel(counting(3, 1));
      expect(
        screen.getByText("3 flashcards waiting to be sent, 1 note to delete."),
      ).toBeDefined();
    });

    it("counts the notes waiting to be deleted when every card is in Anki", () => {
      renderPanel(counting(0, 2));
      expect(
        screen.getByText("2 notes waiting to be deleted from Anki."),
      ).toBeDefined();
    });

    it("sends to Anki when only notes wait to be deleted", () => {
      const calls = renderPanel(counting(0, 2));
      fireEvent.click(screen.getByRole("button", { name: "Send to Anki" }));
      expect(calls).toEqual(["send"]);
    });

    it("offers no send when nothing waits", () => {
      renderPanel(counting(0, 0));
      expect(
        (
          screen.getByRole("button", {
            name: "Send to Anki",
          }) as HTMLButtonElement
        ).disabled,
      ).toBe(true);
    });

    it("says every card is in Anki when nothing waits", () => {
      renderPanel(counting(0, 0));
      expect(screen.getByText("Every flashcard is in Anki.")).toBeDefined();
    });

    it("says there are no cards yet when the project has none", () => {
      renderPanel(counting(0, 0, 0));
      expect(screen.getByText("No flashcards yet.")).toBeDefined();
    });

    it("says beside the summary that no card waits to be sent", () => {
      renderPanel(counting(0, 2));
      expect(
        screen.getByText("No flashcards waiting to be sent."),
      ).toBeDefined();
    });
  });

  describe("when the cards are exported as Anki packages", () => {
    const exporting = (
      unexportedCount: number,
      flashcardCount = 3,
    ): FlashcardSyncState => ({
      kind: "ankiPackage",
      flashcardCount,
      unexportedCount,
      nextCard: null,
    });

    it("says every card has been exported when none is new", () => {
      renderPanel(exporting(0));
      expect(
        screen.getByText("Every flashcard has been exported."),
      ).toBeDefined();
    });

    it("says there are no cards yet when the project has none", () => {
      renderPanel(exporting(0, 0));
      expect(screen.getByText("No flashcards yet.")).toBeDefined();
    });

    it("says beside the summary that no card waits to be exported", () => {
      renderPanel(exporting(0));
      expect(
        screen.getByText("No flashcards waiting to be exported."),
      ).toBeDefined();
    });
  });

  it("says beside the summary that no card is due for review", () => {
    renderPanel({ kind: "review", dueCount: 0, nextCard: null });
    expect(screen.getByText("No flashcards due for review.")).toBeDefined();
  });
});
