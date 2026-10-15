import type { AnkiConnectionStatus, AnkiConnectSync } from "@easyimmerse/state";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { AnkiConnectChannel } from "./AnkiConnectChannel.tsx";

afterEach(cleanup);

const syncOf = (changes: Partial<AnkiConnectSync> = {}): AnkiConnectSync => ({
  connection: "connected",
  deniedOrigin: null,
  unsentCount: 2,
  changedCount: 0,
  pendingDeletionCount: 0,
  isSyncing: false,
  ...changes,
});

const connectedAs = (connection: AnkiConnectionStatus) =>
  syncOf({ connection });

/** Finds the paragraph whose text, across its inline elements, is exactly `text`. */
const paragraphWithText = (text: string) =>
  screen.getByText(
    (_, element) => element?.tagName === "P" && element.textContent === text,
  );

const isDisabled = (name: string) =>
  (screen.getByRole("button", { name }) as HTMLButtonElement).disabled;

function renderChannel(sync: AnkiConnectSync, flashcardCount = 3) {
  const calls: string[] = [];
  const call = (name: string) => () => calls.push(name);
  render(
    <AnkiConnectChannel
      sync={sync}
      flashcardCount={flashcardCount}
      onSendToAnki={call("send")}
      onCheckConnection={call("check")}
      onSetUpAnkiConnect={call("setUp")}
      onTurnOff={call("turnOff")}
    />,
  );
  return calls;
}

describe("AnkiConnectChannel", () => {
  it("sends the waiting cards to Anki", () => {
    const calls = renderChannel(syncOf());
    fireEvent.click(screen.getByRole("button", { name: "Send to Anki" }));
    expect(calls).toEqual(["send"]);
  });

  it("offers no second send while one is under way", () => {
    renderChannel(syncOf({ isSyncing: true }));
    expect(isDisabled("Sending…")).toBe(true);
  });

  it("turns AnkiConnect off", () => {
    const calls = renderChannel(syncOf());
    fireEvent.click(screen.getByRole("button", { name: "Turn off" }));
    expect(calls).toEqual(["turnOff"]);
  });

  it("says the connection is being checked", () => {
    renderChannel(connectedAs("checking"));
    expect(screen.getByText("Checking Anki…")).toBeDefined();
  });

  it("checks the connection again when Anki was unreachable", () => {
    const calls = renderChannel(connectedAs("unreachable"));
    fireEvent.click(screen.getByRole("button", { name: "Check again" }));
    expect(calls).toEqual(["check"]);
  });

  it("tells how to make Anki reachable", () => {
    renderChannel(connectedAs("unreachable"));
    expect(
      screen.getByText(
        "Start Anki with the AnkiConnect add-on installed, then check again.",
      ),
    ).toBeDefined();
  });

  describe("when Anki refused easyImmerse", () => {
    it("says so", () => {
      renderChannel(connectedAs("denied"));
      expect(screen.getByText("Anki refused easyImmerse")).toBeDefined();
    });

    it("tells how to allow easyImmerse again, naming the origin Anki refused", () => {
      renderChannel(
        syncOf({ connection: "denied", deniedOrigin: "tauri://localhost" }),
      );
      expect(
        paragraphWithText(
          "Check again and choose Yes when Anki asks. If it does not ask, choose Tools, then Add-ons in Anki, select AnkiConnect, choose Config, remove tauri://localhost from ignoreOriginList, and check again.",
        ),
      ).toBeDefined();
    });

    it("tells how to allow easyImmerse again when the origin Anki refused is not known", () => {
      renderChannel(connectedAs("denied"));
      expect(
        paragraphWithText(
          "Check again and choose Yes when Anki asks. If it does not ask, choose Tools, then Add-ons in Anki, select AnkiConnect, choose Config, empty ignoreOriginList, and check again.",
        ),
      ).toBeDefined();
    });

    it("checks the connection again", () => {
      const calls = renderChannel(connectedAs("denied"));
      fireEvent.click(screen.getByRole("button", { name: "Check again" }));
      expect(calls).toEqual(["check"]);
    });
  });

  describe("counting what waits", () => {
    it("counts the new cards waiting to be sent", () => {
      renderChannel(syncOf({ unsentCount: 3 }));
      expect(
        screen.getByText("3 new flashcards waiting to be sent."),
      ).toBeDefined();
    });

    it("counts the changed cards waiting to be sent beside the new ones", () => {
      renderChannel(syncOf({ unsentCount: 3, changedCount: 1 }));
      expect(
        screen.getByText("3 new and 1 changed flashcards waiting to be sent."),
      ).toBeDefined();
    });

    it("sends to Anki when only changed cards wait", () => {
      const calls = renderChannel(syncOf({ unsentCount: 0, changedCount: 1 }));
      fireEvent.click(screen.getByRole("button", { name: "Send to Anki" }));
      expect(calls).toEqual(["send"]);
    });

    it("counts the notes waiting to be deleted beside the cards to send", () => {
      renderChannel(syncOf({ unsentCount: 3, pendingDeletionCount: 1 }));
      expect(
        screen.getByText(
          "3 new flashcards waiting to be sent, 1 note to delete.",
        ),
      ).toBeDefined();
    });

    it("counts the notes waiting to be deleted when every card is in Anki", () => {
      renderChannel(syncOf({ unsentCount: 0, pendingDeletionCount: 2 }));
      expect(
        screen.getByText("2 notes waiting to be deleted from Anki."),
      ).toBeDefined();
    });

    it("sends to Anki when only notes wait to be deleted", () => {
      const calls = renderChannel(
        syncOf({ unsentCount: 0, pendingDeletionCount: 2 }),
      );
      fireEvent.click(screen.getByRole("button", { name: "Send to Anki" }));
      expect(calls).toEqual(["send"]);
    });

    it("offers no send when nothing waits", () => {
      renderChannel(syncOf({ unsentCount: 0 }));
      expect(isDisabled("Send to Anki")).toBe(true);
    });

    it("says every card is in Anki when nothing waits", () => {
      renderChannel(syncOf({ unsentCount: 0 }));
      expect(screen.getByText("Every flashcard is in Anki.")).toBeDefined();
    });

    it("says there are no cards yet when the project has none", () => {
      renderChannel(syncOf({ unsentCount: 0 }), 0);
      expect(screen.getByText("No flashcards yet.")).toBeDefined();
    });
  });
});
