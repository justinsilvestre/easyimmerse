import type { AnkiConnectSync, FlashcardSync } from "@easyimmerse/state";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import {
  exampleFlashcard,
  exampleLanguages,
} from "../flashcards/exampleFlashcard.ts";
import { ProjectFlashcardsPanel } from "./ProjectFlashcardsPanel.tsx";

afterEach(cleanup);

const ankiConnectOff: AnkiConnectSync = {
  isOn: false,
  connection: "connected",
  deniedOrigin: null,
  pendingDeletionCount: 0,
  isSyncing: false,
  hasSyncFailed: false,
};

const neverDelivered: FlashcardSync = {
  flashcardCount: 3,
  queue: {
    newCount: 3,
    changedCount: 0,
    hasBeenSent: false,
    hasBeenExported: false,
  },
  package: {
    deletions: [],
    ankiSearch: "",
  },
  ankiConnect: ankiConnectOff,
  nextCard: null,
};

const exportedBefore: FlashcardSync = {
  ...neverDelivered,
  queue: { ...neverDelivered.queue, newCount: 0, hasBeenExported: true },
};

const usingAnkiConnect: FlashcardSync = {
  ...exportedBefore,
  ankiConnect: { ...ankiConnectOff, isOn: true },
};

/** AnkiConnect turned off after it sent flashcards, with two new flashcards waiting. */
const offAfterSending: FlashcardSync = {
  ...neverDelivered,
  queue: { ...neverDelivered.queue, newCount: 2, hasBeenSent: true },
  nextCard: exampleFlashcard,
};

function renderPanel(sync: FlashcardSync) {
  const calls: string[] = [];
  const call = (name: string) => () => calls.push(name);
  render(
    <ProjectFlashcardsPanel
      sync={sync}
      includedFields={["word"]}
      frontFields={[]}
      languages={exampleLanguages}
      onExportPackage={call("export")}
      onSetUpAnkiConnect={call("setUp")}
      onTurnOffAnkiConnect={call("turnOff")}
      onStartReview={call("review")}
      onCheckConnection={call("check")}
      onTryAnkiSyncAgain={call("tryAgain")}
      onCopyAnkiSearch={call("copy")}
      onMarkDeletionsDone={call("done")}
    />,
  );
  return calls;
}

const openMoreOptions = () =>
  fireEvent.click(screen.getByRole("button", { name: "More options" }));

/** Reads the caption of the figure that holds the card preview. */
const figureCaption = () =>
  screen.getByRole("figure").querySelector("figcaption")?.textContent;

const menuItemNames = () =>
  screen.getAllByRole("menuitem").map((item) => item.textContent);

describe("ProjectFlashcardsPanel", () => {
  describe("heading", () => {
    it("is plain before any way is in use", () => {
      renderPanel(neverDelivered);
      expect(screen.getByRole("heading").textContent).toBe("Flashcards");
    });

    it("names the package export once flashcards have reached Anki", () => {
      renderPanel(exportedBefore);
      expect(screen.getByRole("heading").textContent).toBe(
        "Export flashcards in an Anki deck package",
      );
    });

    it("names AnkiConnect while it is on", () => {
      renderPanel(usingAnkiConnect);
      expect(screen.getByRole("heading").textContent).toBe(
        "Making flashcards with AnkiConnect",
      );
    });
  });

  describe("left column", () => {
    it("captions the next card as a preview before any way is in use", () => {
      renderPanel({ ...neverDelivered, nextCard: exampleFlashcard });
      expect(figureCaption()).toBe("Preview");
    });

    it("captions the next card with what waits to be exported", () => {
      renderPanel({
        ...exportedBefore,
        queue: { ...exportedBefore.queue, newCount: 5, changedCount: 2 },
        nextCard: exampleFlashcard,
      });
      expect(figureCaption()).toBe(
        "5 new and 2 changed flashcards waiting to be exported.",
      );
    });

    it("captions the next card with what will be sent through AnkiConnect", () => {
      renderPanel({
        ...usingAnkiConnect,
        queue: { ...usingAnkiConnect.queue, newCount: 3 },
        nextCard: exampleFlashcard,
      });
      expect(figureCaption()).toBe("3 new flashcards waiting for Anki.");
    });

    it("says that no flashcard waits to be exported when the queue is empty", () => {
      renderPanel(exportedBefore);
      expect(
        screen.getByText("No flashcards waiting to be exported."),
      ).toBeDefined();
    });

    it("is left out while the project has no flashcards", () => {
      renderPanel({
        ...neverDelivered,
        flashcardCount: 0,
        queue: { ...neverDelivered.queue, newCount: 0 },
      });
      expect(screen.queryByText("Preview")).toBeNull();
    });
  });

  describe("before any flashcard has reached Anki, while AnkiConnect is off", () => {
    it("offers the three ways to use the flashcards", () => {
      renderPanel(neverDelivered);
      expect(
        screen.getAllByRole("button").map((button) => button.textContent),
      ).toEqual([
        "Review in easyImmerseStudy the flashcards here, with spaced repetition.Coming soon",
        "Set up AnkiConnectSend flashcards to Anki as you make them.",
        "Export an Anki deck packageSave a file to import into Anki.",
      ]);
    });

    it("opens the export from the package option", () => {
      const calls = renderPanel(neverDelivered);
      fireEvent.click(
        screen.getByRole("button", { name: /^Export an Anki deck package/ }),
      );
      expect(calls).toEqual(["export"]);
    });

    it("offers to set up AnkiConnect", () => {
      const calls = renderPanel(neverDelivered);
      fireEvent.click(
        screen.getByRole("button", { name: /Set up AnkiConnect/ }),
      );
      expect(calls).toEqual(["setUp"]);
    });

    it("explains the review when it is chosen", () => {
      const calls = renderPanel(neverDelivered);
      fireEvent.click(
        screen.getByRole("button", { name: /Review in easyImmerse/ }),
      );
      expect(calls).toEqual(["review"]);
    });
  });

  describe("once flashcards have reached Anki, while AnkiConnect is off", () => {
    it("opens the export", () => {
      const calls = renderPanel(exportedBefore);
      fireEvent.click(
        screen.getByRole("button", { name: "Export .apkg file" }),
      );
      expect(calls).toEqual(["export"]);
    });

    it("keeps the export when every flashcard has been exported", () => {
      renderPanel(exportedBefore);
      expect(
        screen.getByRole("button", { name: "Export .apkg file" }),
      ).toBeDefined();
    });

    it("lists the deleted flashcards still in Anki", () => {
      renderPanel({
        ...neverDelivered,
        package: {
          deletions: [
            { flashcard_id: "f9", word: "Katze", requested_at_ms: 1 },
          ],
          ankiSearch: '"easyImmerse id:f9"',
        },
      });
      expect(screen.getByText("Katze")).toBeDefined();
    });

    it("keeps the other ways in the More options menu", () => {
      renderPanel(exportedBefore);
      openMoreOptions();
      expect(menuItemNames()).toEqual([
        "Set up AnkiConnect",
        "Review in easyImmerse (coming soon)",
      ]);
    });

    it("sets up AnkiConnect from the menu", () => {
      const calls = renderPanel(exportedBefore);
      openMoreOptions();
      fireEvent.click(
        screen.getByRole("menuitem", { name: "Set up AnkiConnect" }),
      );
      expect(calls).toEqual(["setUp"]);
    });

    it("explains the review when it is chosen from the menu", () => {
      const calls = renderPanel(exportedBefore);
      openMoreOptions();
      fireEvent.click(
        screen.getByRole("menuitem", { name: /Review in easyImmerse/ }),
      );
      expect(calls).toEqual(["review"]);
    });
  });

  describe("while AnkiConnect is on", () => {
    it("turns AnkiConnect off", () => {
      const calls = renderPanel(usingAnkiConnect);
      fireEvent.click(
        screen.getByRole("switch", { name: "AnkiConnect on for this project" }),
      );
      expect(calls).toEqual(["turnOff"]);
    });

    it("shows no button to export outside the menu", () => {
      renderPanel(usingAnkiConnect);
      expect(
        screen.queryByRole("button", { name: /Anki deck package|\.apkg/ }),
      ).toBeNull();
    });

    it("keeps the other ways in the More options menu", () => {
      renderPanel(usingAnkiConnect);
      openMoreOptions();
      expect(menuItemNames()).toEqual([
        "Export an Anki deck package",
        "Review in easyImmerse (coming soon)",
      ]);
    });

    it("opens the export from the menu", () => {
      const calls = renderPanel(usingAnkiConnect);
      openMoreOptions();
      fireEvent.click(
        screen.getByRole("menuitem", { name: "Export an Anki deck package" }),
      );
      expect(calls).toEqual(["export"]);
    });
  });

  describe("while AnkiConnect is off after it sent flashcards", () => {
    it("names AnkiConnect", () => {
      renderPanel(offAfterSending);
      expect(screen.getByRole("heading").textContent).toBe(
        "Making flashcards with AnkiConnect",
      );
    });

    it("shows AnkiConnect switched off", () => {
      renderPanel(offAfterSending);
      expect(
        screen
          .getByRole("switch", { name: "AnkiConnect on for this project" })
          .getAttribute("aria-checked"),
      ).toBe("false");
    });

    it("opens the setup with the switch", () => {
      const calls = renderPanel(offAfterSending);
      fireEvent.click(
        screen.getByRole("switch", { name: "AnkiConnect on for this project" }),
      );
      expect(calls).toEqual(["setUp"]);
    });

    it("says whether Anki is connected", () => {
      renderPanel(offAfterSending);
      expect(screen.getByText("Anki connected")).toBeDefined();
    });

    it("captions the next card with what waits until AnkiConnect is turned on", () => {
      renderPanel(offAfterSending);
      expect(figureCaption()).toBe(
        "2 new flashcards waiting until AnkiConnect is turned on.",
      );
    });

    it("keeps the other ways in the More options menu", () => {
      renderPanel(offAfterSending);
      openMoreOptions();
      expect(menuItemNames()).toEqual([
        "Export an Anki deck package",
        "Review in easyImmerse (coming soon)",
      ]);
    });

    it("offers no button to send, try again or check again", () => {
      renderPanel({
        ...offAfterSending,
        ankiConnect: { ...ankiConnectOff, connection: "unreachable" },
      });
      expect(screen.queryAllByRole("button", { name: /Send|again/ })).toEqual(
        [],
      );
    });

    it("gives no troubleshooting hint while Anki is unreachable", () => {
      renderPanel({
        ...offAfterSending,
        ankiConnect: { ...ankiConnectOff, connection: "unreachable" },
      });
      expect(screen.queryByText(/Start Anki/)).toBeNull();
    });

    it("lists the deleted flashcards still in Anki", () => {
      renderPanel({
        ...offAfterSending,
        package: {
          deletions: [
            { flashcard_id: "f9", word: "Katze", requested_at_ms: 1 },
          ],
          ankiSearch: '"easyImmerse id:f9"',
        },
      });
      expect(screen.getByText("Katze")).toBeDefined();
    });
  });
});
