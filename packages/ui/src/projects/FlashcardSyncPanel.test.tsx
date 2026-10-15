import type { FlashcardSync } from "@easyimmerse/state";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { exampleLanguages } from "../flashcards/exampleFlashcard.ts";
import { FlashcardSyncPanel } from "./FlashcardSyncPanel.tsx";

afterEach(cleanup);

const exportingOnly: FlashcardSync = {
  flashcardCount: 3,
  package: { sinceLastExport: null },
  ankiConnect: null,
  nextCard: null,
};

const usingAnkiConnect: FlashcardSync = {
  ...exportingOnly,
  ankiConnect: {
    connection: "connected",
    deniedOrigin: null,
    unsentCount: 0,
    changedCount: 0,
    pendingDeletionCount: 0,
    isSyncing: false,
  },
};

function renderPanel(sync: FlashcardSync) {
  const calls: string[] = [];
  const call = (name: string) => () => calls.push(name);
  render(
    <FlashcardSyncPanel
      sync={sync}
      includedFields={["word"]}
      frontFields={[]}
      languages={exampleLanguages}
      onExportPackage={call("export")}
      onSetUpAnkiConnect={call("setUp")}
      onTurnOffAnkiConnect={call("turnOff")}
      onStartReview={call("review")}
      onSendToAnki={call("send")}
      onCheckConnection={call("check")}
    />,
  );
  return calls;
}

describe("FlashcardSyncPanel", () => {
  describe("while AnkiConnect is off", () => {
    it("offers to set up AnkiConnect", () => {
      const calls = renderPanel(exportingOnly);
      fireEvent.click(
        screen.getByRole("button", { name: /Set up AnkiConnect/ }),
      );
      expect(calls).toEqual(["setUp"]);
    });

    it("says beside the channels that no card waits to be exported", () => {
      renderPanel(exportingOnly);
      expect(
        screen.getByText("No flashcards waiting to be exported."),
      ).toBeDefined();
    });
  });

  describe("while AnkiConnect is on", () => {
    it("still offers the export", () => {
      const calls = renderPanel(usingAnkiConnect);
      fireEvent.click(
        screen.getByRole("button", { name: "Export an Anki deck" }),
      );
      expect(calls).toEqual(["export"]);
    });

    it("turns AnkiConnect off", () => {
      const calls = renderPanel(usingAnkiConnect);
      fireEvent.click(screen.getByRole("button", { name: "Turn off" }));
      expect(calls).toEqual(["turnOff"]);
    });

    it("says beside the channels that no card waits to be sent", () => {
      renderPanel(usingAnkiConnect);
      expect(
        screen.getByText("No flashcards waiting to be sent."),
      ).toBeDefined();
    });
  });

  it("marks the review as coming soon", () => {
    renderPanel(exportingOnly);
    expect(screen.getByText("Coming soon")).toBeDefined();
  });

  it("explains the review when it is chosen", () => {
    const calls = renderPanel(exportingOnly);
    fireEvent.click(
      screen.getByRole("button", { name: /Review in easyImmerse/ }),
    );
    expect(calls).toEqual(["review"]);
  });
});
