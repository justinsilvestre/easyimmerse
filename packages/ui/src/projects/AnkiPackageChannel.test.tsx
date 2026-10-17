import type { AnkiUpdatesQueue, PackageSync } from "@easyimmerse/state";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { AnkiPackageChannel } from "./AnkiPackageChannel.tsx";

afterEach(cleanup);

const noDeletions: PackageSync = {
  deletions: [],
  ankiSearch: "",
};

const flushedQueue = (
  newCount: number,
  changedCount: number,
): AnkiUpdatesQueue => ({ newCount, changedCount, hasBeenFlushed: true });

function renderChannel(
  queue: AnkiUpdatesQueue,
  sync = noDeletions,
  flashcardCount = 5,
) {
  const calls: string[] = [];
  render(
    <AnkiPackageChannel
      queue={queue}
      sync={sync}
      flashcardCount={flashcardCount}
      isMainChannel
      onExportPackage={() => calls.push("export")}
      onCopyAnkiSearch={() => calls.push("copy")}
      onMarkDeletionsDone={() => calls.push("done")}
    />,
  );
  return calls;
}

describe("AnkiPackageChannel", () => {
  it("opens the export", () => {
    const calls = renderChannel(flushedQueue(1, 0));
    fireEvent.click(
      screen.getByRole("button", { name: "Export an Anki deck" }),
    );
    expect(calls).toEqual(["export"]);
  });

  it("counts the new and the changed cards in the Anki updates queue", () => {
    renderChannel(flushedQueue(3, 1));
    expect(
      screen.getByText(
        "3 new and 1 changed flashcards in the Anki updates queue.",
      ),
    ).toBeDefined();
  });

  it("says the queue holds no card when none is new or changed", () => {
    renderChannel(flushedQueue(0, 0));
    expect(
      screen.getByText(
        "No new or changed flashcards in the Anki updates queue.",
      ),
    ).toBeDefined();
  });

  it("says what a package is before the first export", () => {
    renderChannel({ newCount: 5, changedCount: 0, hasBeenFlushed: false });
    expect(
      screen.getByText("Save a package to import into Anki."),
    ).toBeDefined();
  });

  it("lists the deleted flashcards still in Anki", () => {
    renderChannel(flushedQueue(0, 0), {
      ...noDeletions,
      deletions: [
        {
          flashcard_id: "f9",
          word: "Katze",
          requested_at_ms: 1,
        },
      ],
    });
    expect(screen.getByText("Katze")).toBeDefined();
  });

  it("lists nothing while no deleted flashcard is still in Anki", () => {
    renderChannel(flushedQueue(0, 0));
    expect(screen.queryByRole("list")).toBeNull();
  });

  it("says there are no cards yet when the project has none", () => {
    renderChannel(
      { newCount: 0, changedCount: 0, hasBeenFlushed: false },
      noDeletions,
      0,
    );
    expect(screen.getByText("No flashcards yet.")).toBeDefined();
  });
});
