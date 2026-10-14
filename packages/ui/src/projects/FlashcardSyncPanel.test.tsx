import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { exampleLanguages } from "../flashcards/exampleFlashcard.ts";
import {
  FlashcardSyncPanel,
  type FlashcardSyncState,
} from "./FlashcardSyncPanel.tsx";

afterEach(cleanup);

const sendingTo = (
  connection: "checking" | "connected" | "unreachable",
  isSyncing = false,
): FlashcardSyncState => ({
  kind: "ankiConnect",
  connection,
  unsentCount: 2,
  pendingDeletionCount: 0,
  nextCard: null,
  isSyncing,
});

const counting = (
  unsentCount: number,
  pendingDeletionCount: number,
): FlashcardSyncState => ({
  kind: "ankiConnect",
  connection: "connected",
  unsentCount,
  pendingDeletionCount,
  nextCard: null,
  isSyncing: false,
});

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
  });
});
