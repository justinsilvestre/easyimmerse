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
      preview={null}
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
    fireEvent.click(screen.getByRole("button", { name: "Export .apkg file" }));
    expect(calls).toEqual(["export"]);
  });

  it("counts the new and the changed cards in the Anki updates queue", () => {
    renderChannel(flushedQueue(3, 1));
    expect(screen.getByRole("paragraph").textContent).toBe(
      "3 new and 1 changed flashcards waiting to be exported.",
    );
  });

  it("says no flashcard waits to be exported when none is new or changed", () => {
    renderChannel(flushedQueue(0, 0));
    expect(
      screen.getByText("No flashcards waiting to be exported."),
    ).toBeDefined();
  });

  it("keeps the export when no flashcard waits", () => {
    renderChannel(flushedQueue(0, 0));
    expect(
      screen.getByRole("button", { name: "Export .apkg file" }),
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
