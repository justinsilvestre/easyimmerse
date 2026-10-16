import type { AnkiExportScope } from "@easyimmerse/state";
import { cleanup, fireEvent, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { renderWithAppStore } from "../testSupport/renderWithAppStore.tsx";
import { AnkiExportDialog } from "./AnkiExportDialog.tsx";

afterEach(cleanup);

function renderDialog(
  props: Partial<Parameters<typeof AnkiExportDialog>[0]> = {},
) {
  const calls: string[] = [];
  renderWithAppStore(
    <AnkiExportDialog
      mediaFiles={[
        { id: "m1", name: "pilot.mkv", kind: "video", flashcardCount: 3 },
        { id: "m2", name: "episode.mkv", kind: "video", flashcardCount: 1 },
      ]}
      chosenMediaFileIds={null}
      scope="newAndChanged"
      newAndChangedCount={2}
      allCount={4}
      marksExported
      duplicateCount={0}
      markCount={0}
      isBusy={false}
      onScopeChange={(scope: AnkiExportScope) => calls.push(`scope ${scope}`)}
      onMarkingChange={(marksExported) =>
        calls.push(`marking ${marksExported}`)
      }
      onMediaToggle={(mediaFileId) => calls.push(`toggle ${mediaFileId}`)}
      onExport={() => calls.push("export")}
      onClose={() => calls.push("close")}
      {...props}
    />,
  );
  return calls;
}

const exportButton = () => screen.getByRole("button", { name: /^Export/ });

const isDisabled = (element: HTMLElement) =>
  (element as HTMLButtonElement).disabled;

describe("AnkiExportDialog", () => {
  it("offers the new and changed cards with their count", () => {
    renderDialog();
    expect(
      screen.getByRole("radio", { name: "New and changed (2)" }),
    ).toBeDefined();
  });

  it("chooses all cards", () => {
    const calls = renderDialog();
    fireEvent.click(screen.getByRole("radio", { name: "All cards (4)" }));
    expect(calls).toEqual(["scope all"]);
  });

  it("names how many cards Export writes", () => {
    renderDialog({ scope: "all" });
    expect(exportButton().textContent).toBe("Export 4 cards");
  });

  it("exports when Export is pressed", () => {
    const calls = renderDialog();
    fireEvent.click(exportButton());
    expect(calls).toEqual(["export"]);
  });

  it("offers no export while the choices hold no card", () => {
    renderDialog({ newAndChangedCount: 0 });
    expect(isDisabled(exportButton())).toBe(true);
  });

  it("offers no second export while one is under way", () => {
    renderDialog({ isBusy: true });
    expect(isDisabled(exportButton())).toBe(true);
  });

  it("shows whether the cards are marked as exported", () => {
    renderDialog({ marksExported: false });
    expect(
      (
        screen.getByRole("checkbox", {
          name: /Mark these cards as exported/,
        }) as HTMLInputElement
      ).checked,
    ).toBe(false);
  });

  it("says that cards left unmarked are a copy not meant for the Anki the project sends to", () => {
    renderDialog();
    expect(
      screen.getByText(/does not track.*not meant for importing into the Anki/),
    ).toBeDefined();
  });

  it("chooses not to mark the cards as exported", () => {
    const calls = renderDialog();
    fireEvent.click(
      screen.getByRole("checkbox", { name: /Mark these cards as exported/ }),
    );
    expect(calls).toEqual(["marking false"]);
  });

  it("warns that importing would duplicate the cards AnkiConnect sent", () => {
    renderDialog({ duplicateCount: 2 });
    expect(
      screen.getByText(
        "2 of these cards were sent to Anki through AnkiConnect. Importing this package into that Anki would give you two of each.",
      ),
    ).toBeDefined();
  });

  it("names a single card AnkiConnect sent in its warning", () => {
    renderDialog({ duplicateCount: 1 });
    expect(
      screen.getByText(
        "1 of these cards was sent to Anki through AnkiConnect. Importing this package into that Anki would give you two of that card.",
      ),
    ).toBeDefined();
  });

  it("does not warn of duplicates while the cards are not marked as exported", () => {
    renderDialog({ duplicateCount: 2, marksExported: false });
    expect(screen.queryByRole("note")).toBeNull();
  });

  it("tells how many deleted flashcards the package marks for deletion", () => {
    renderDialog({ markCount: 2 });
    expect(
      screen.getByText(
        "The package also marks 2 deleted flashcards for deletion in Anki.",
      ),
    ).toBeDefined();
  });

  it("marks no deletion while the cards are not marked as exported", () => {
    renderDialog({ markCount: 2, marksExported: false });
    expect(screen.queryByText(/for deletion in Anki/)).toBeNull();
  });

  it("exports a package that holds only marks for deletion", () => {
    const calls = renderDialog({ newAndChangedCount: 0, markCount: 1 });
    fireEvent.click(screen.getByRole("button", { name: "Export package" }));
    expect(calls).toEqual(["export"]);
  });

  it("ticks every media file while none is chosen", () => {
    renderDialog();
    expect(
      screen
        .getAllByRole("checkbox", { name: /\.mkv/ })
        .map((box) => (box as HTMLInputElement).checked),
    ).toEqual([true, true]);
  });

  it("clears a media file left out of the chosen ones", () => {
    renderDialog({ chosenMediaFileIds: ["m1"] });
    expect(
      (screen.getByRole("checkbox", { name: /episode/ }) as HTMLInputElement)
        .checked,
    ).toBe(false);
  });

  it("toggles a media file", () => {
    const calls = renderDialog();
    fireEvent.click(screen.getByRole("checkbox", { name: /episode/ }));
    expect(calls).toEqual(["toggle m2"]);
  });

  it("closes on Cancel", () => {
    const calls = renderDialog();
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(calls).toEqual(["close"]);
  });
});
