import type {
  AnkiConnectionStatus,
  AnkiConnectSync,
  AnkiUpdatesQueue,
} from "@easyimmerse/state";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { AnkiConnectChannel } from "./AnkiConnectChannel.tsx";

afterEach(cleanup);

const syncOf = (changes: Partial<AnkiConnectSync> = {}): AnkiConnectSync => ({
  connection: "connected",
  deniedOrigin: null,
  pendingDeletionCount: 0,
  isSyncing: false,
  hasSyncFailed: false,
  ...changes,
});

const queueOf = (newCount: number, changedCount = 0): AnkiUpdatesQueue => ({
  newCount,
  changedCount,
  hasBeenFlushed: true,
});

const connectedAs = (connection: AnkiConnectionStatus) =>
  syncOf({ connection });

const listedSteps = () =>
  screen.getAllByRole("listitem").map((item) => item.textContent);

const hasParagraph = (text: string) =>
  screen
    .queryAllByRole("paragraph")
    .some((paragraph) => paragraph.textContent === text);

const buttonNames = () =>
  screen.getAllByRole("button").map((button) => button.textContent);

function renderChannel(
  sync: AnkiConnectSync,
  queue = queueOf(2),
  flashcardCount = 3,
) {
  const calls: string[] = [];
  const call = (name: string) => () => calls.push(name);
  render(
    <AnkiConnectChannel
      sync={sync}
      queue={queue}
      flashcardCount={flashcardCount}
      preview={null}
      onCheckConnection={call("check")}
      onTryAgain={call("tryAgain")}
      onSetUpAnkiConnect={call("setUp")}
      onTurnOff={call("turnOff")}
    />,
  );
  return calls;
}

describe("AnkiConnectChannel", () => {
  it("offers no button to send to Anki", () => {
    renderChannel(syncOf());
    expect(screen.queryByRole("button", { name: /Send/ })).toBeNull();
  });

  it("says a send is under way", () => {
    renderChannel(syncOf({ isSyncing: true }));
    expect(screen.getByText("Sending…")).toBeDefined();
  });

  it("offers no button while a send is under way", () => {
    renderChannel(syncOf({ isSyncing: true }));
    expect(screen.queryAllByRole("button")).toEqual([]);
  });

  it("groups the switch and the connection under the AnkiConnect status label", () => {
    renderChannel(syncOf(), queueOf(0));
    expect(
      screen.getByRole("group", { name: "AnkiConnect status" }).textContent,
    ).toBe("AnkiConnect statusOnAnki connected");
  });

  it("labels the switch On without repeating AnkiConnect", () => {
    renderChannel(syncOf());
    expect(screen.getByRole("switch").textContent).toBe("On");
  });

  it("shows AnkiConnect switched on", () => {
    renderChannel(syncOf());
    expect(
      screen
        .getByRole("switch", { name: "AnkiConnect on for this project" })
        .getAttribute("aria-checked"),
    ).toBe("true");
  });

  it("turns AnkiConnect off with the switch", () => {
    const calls = renderChannel(syncOf());
    fireEvent.click(
      screen.getByRole("switch", { name: "AnkiConnect on for this project" }),
    );
    expect(calls).toEqual(["turnOff"]);
  });

  it("offers no button while flashcards wait for a connected Anki and no sync failed", () => {
    renderChannel(syncOf());
    expect(screen.queryAllByRole("button")).toEqual([]);
  });

  describe("when the last sync failed while Anki stays connected", () => {
    const failed = () => syncOf({ hasSyncFailed: true });

    it("says the sync failed", () => {
      renderChannel(failed());
      expect(screen.getByText("Sync failed")).toBeDefined();
    });

    it("tries the sync again", () => {
      const calls = renderChannel(failed());
      fireEvent.click(screen.getByRole("button", { name: "Try again" }));
      expect(calls).toEqual(["tryAgain"]);
    });

    it("offers only trying again", () => {
      renderChannel(failed());
      expect(buttonNames()).toEqual(["Try again"]);
    });

    it("offers trying again within the AnkiConnect status", () => {
      renderChannel(failed());
      expect(
        screen
          .getByRole("group", { name: "AnkiConnect status" })
          .contains(screen.getByRole("button", { name: "Try again" })),
      ).toBe(true);
    });

    it("counts the flashcards that could not be sent", () => {
      renderChannel(failed(), queueOf(3));
      expect(hasParagraph("3 new flashcards could not be sent to Anki.")).toBe(
        true,
      );
    });

    it("counts the notes still to delete beside the flashcards that could not be sent", () => {
      renderChannel(syncOf({ hasSyncFailed: true, pendingDeletionCount: 1 }));
      expect(
        hasParagraph(
          "2 new flashcards could not be sent to Anki, with 1 note still to delete.",
        ),
      ).toBe(true);
    });

    it("counts the notes that could not be deleted when every card is in Anki", () => {
      renderChannel(
        syncOf({ hasSyncFailed: true, pendingDeletionCount: 2 }),
        queueOf(0),
      );
      expect(screen.getByRole("paragraph").textContent).toBe(
        "2 notes could not be deleted from Anki.",
      );
    });

    it("says Anki is connected once nothing waits", () => {
      renderChannel(failed(), queueOf(0));
      expect(screen.getByText("Anki connected")).toBeDefined();
    });
  });

  it("says the connection is being checked", () => {
    renderChannel(connectedAs("checking"));
    expect(screen.getByText("Checking Anki…")).toBeDefined();
  });

  it("offers no button while the connection is being checked", () => {
    renderChannel(connectedAs("checking"));
    expect(screen.queryAllByRole("button")).toEqual([]);
  });

  describe("when Anki was unreachable", () => {
    it("checks the connection again", () => {
      const calls = renderChannel(connectedAs("unreachable"));
      fireEvent.click(screen.getByRole("button", { name: "Check again" }));
      expect(calls).toEqual(["check"]);
    });

    it("offers checking again and the setup steps", () => {
      renderChannel(connectedAs("unreachable"));
      expect(buttonNames()).toEqual(["Check again", "Show the setup steps"]);
    });

    it("opens the setup steps from the hint", () => {
      const calls = renderChannel(connectedAs("unreachable"));
      fireEvent.click(
        screen.getByRole("button", { name: "Show the setup steps" }),
      );
      expect(calls).toEqual(["setUp"]);
    });

    it("tells how to make Anki reachable", () => {
      renderChannel(connectedAs("unreachable"));
      expect(
        screen.getByText(
          "Start Anki with the AnkiConnect add-on installed, then check again.",
        ),
      ).toBeDefined();
    });
  });

  describe("when Anki refused easyImmerse", () => {
    it("says so", () => {
      renderChannel(connectedAs("denied"));
      expect(screen.getByText("Anki refused easyImmerse")).toBeDefined();
    });

    it("lists the steps to allow easyImmerse again, naming the origin Anki refused", () => {
      renderChannel(
        syncOf({ connection: "denied", deniedOrigin: "tauri://localhost" }),
      );
      expect(listedSteps()).toEqual([
        "Check again and choose Yes when Anki asks.",
        "If Anki does not ask, open Tools > Add-ons in Anki, select AnkiConnect, and choose Config.",
        "Remove tauri://localhost from ignoreOriginList.",
        "Check again.",
      ]);
    });

    it("tells to empty the list when the origin Anki refused is not known", () => {
      renderChannel(connectedAs("denied"));
      expect(listedSteps()[2]).toBe("Empty ignoreOriginList.");
    });

    it("offers checking again and the setup steps", () => {
      renderChannel(connectedAs("denied"));
      expect(buttonNames()).toEqual(["Check again", "Show the setup steps"]);
    });
  });

  describe("counting what waits", () => {
    it("counts the new cards that will be sent", () => {
      renderChannel(connectedAs("unreachable"), queueOf(3));
      expect(
        hasParagraph(
          "3 new flashcards will be sent the next time easyImmerse connects to Anki.",
        ),
      ).toBe(true);
    });

    it("counts the changed cards that will be sent beside the new ones", () => {
      renderChannel(connectedAs("unreachable"), queueOf(3, 1));
      expect(
        hasParagraph(
          "3 new and 1 changed flashcards will be sent the next time easyImmerse connects to Anki.",
        ),
      ).toBe(true);
    });

    it("says what still waits for a connected Anki", () => {
      renderChannel(syncOf({ pendingDeletionCount: 1 }), queueOf(3));
      expect(
        hasParagraph("3 new flashcards and 1 note to delete waiting for Anki."),
      ).toBe(true);
    });

    it("offers no button when only changed cards wait for a connected Anki", () => {
      renderChannel(syncOf(), queueOf(0, 1));
      expect(screen.queryAllByRole("button")).toEqual([]);
    });

    it("counts the notes that will be deleted beside the cards to send", () => {
      renderChannel(
        syncOf({ connection: "unreachable", pendingDeletionCount: 1 }),
        queueOf(3),
      );
      expect(
        hasParagraph(
          "3 new flashcards will be sent and 1 note deleted the next time easyImmerse connects to Anki.",
        ),
      ).toBe(true);
    });

    it("counts only the notes waiting to be deleted when every card is in Anki", () => {
      renderChannel(syncOf({ pendingDeletionCount: 2 }), queueOf(0));
      expect(screen.getByRole("paragraph").textContent).toBe(
        "2 notes waiting to be deleted from Anki.",
      );
    });

    it("offers no button when only notes wait to be deleted by a connected Anki", () => {
      renderChannel(syncOf({ pendingDeletionCount: 2 }), queueOf(0));
      expect(screen.queryAllByRole("button")).toEqual([]);
    });

    it("sets the count in bold", () => {
      renderChannel(syncOf(), queueOf(3));
      expect(screen.getByText("3 new flashcards").tagName).toBe("STRONG");
    });

    it("offers no button when nothing waits", () => {
      renderChannel(syncOf(), queueOf(0));
      expect(screen.queryAllByRole("button")).toEqual([]);
    });

    it("counts the flashcards exported to Anki when nothing waits", () => {
      renderChannel(syncOf(), queueOf(0));
      expect(hasParagraph("3 flashcards exported to Anki so far.")).toBe(true);
    });

    it("counts a single flashcard exported to Anki in the singular", () => {
      renderChannel(syncOf(), queueOf(0), 1);
      expect(hasParagraph("1 flashcard exported to Anki so far.")).toBe(true);
    });

    it("says flashcards will be sent once made when the project has none", () => {
      renderChannel(syncOf(), queueOf(0), 0);
      expect(
        hasParagraph(
          "Once you've made some flashcards from media, they will be sent automatically to Anki.",
        ),
      ).toBe(true);
    });

    it("offers no button when the project has no flashcards", () => {
      renderChannel(syncOf(), queueOf(0), 0);
      expect(screen.queryAllByRole("button")).toEqual([]);
    });
  });
});
