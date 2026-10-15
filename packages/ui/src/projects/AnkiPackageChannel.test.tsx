import type { PackageSync } from "@easyimmerse/state";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { AnkiPackageChannel } from "./AnkiPackageChannel.tsx";

afterEach(cleanup);

const since = (newCount: number, changedCount: number): PackageSync => ({
  sinceLastExport: { newCount, changedCount },
  deletions: [],
  ankiSearch: "",
  markCount: 0,
});

function renderChannel(sync: PackageSync, flashcardCount = 5) {
  const calls: string[] = [];
  render(
    <AnkiPackageChannel
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
    const calls = renderChannel(since(1, 0));
    fireEvent.click(
      screen.getByRole("button", { name: "Export an Anki deck" }),
    );
    expect(calls).toEqual(["export"]);
  });

  it("counts the new and the changed cards since the last export", () => {
    renderChannel(since(3, 1));
    expect(
      screen.getByText("3 new and 1 changed flashcards since the last export."),
    ).toBeDefined();
  });

  it("says every card has been exported when none is new or changed", () => {
    renderChannel(since(0, 0));
    expect(
      screen.getByText("Every flashcard has been exported."),
    ).toBeDefined();
  });

  it("says what a package is before the first export", () => {
    renderChannel({ ...since(0, 0), sinceLastExport: null });
    expect(
      screen.getByText("Save a package to import into Anki."),
    ).toBeDefined();
  });

  it("lists the deleted flashcards still in Anki", () => {
    renderChannel({
      ...since(0, 0),
      deletions: [
        {
          flashcard_id: "f9",
          word: "Katze",
          requested_at_ms: 1,
          reached_by_package: true,
        },
      ],
    });
    expect(screen.getByText("Katze")).toBeDefined();
  });

  it("lists nothing while no deleted flashcard is still in Anki", () => {
    renderChannel(since(0, 0));
    expect(screen.queryByRole("list")).toBeNull();
  });

  it("says there are no cards yet when the project has none", () => {
    renderChannel({ ...since(0, 0), sinceLastExport: null }, 0);
    expect(screen.getByText("No flashcards yet.")).toBeDefined();
  });
});
