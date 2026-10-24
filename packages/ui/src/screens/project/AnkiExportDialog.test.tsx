import type { AnkiExportScope } from "@easyimmerse/state";
import { cleanup, fireEvent, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { renderWithAppStore } from "../../testSupport/renderWithAppStore.tsx";
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

const queueAnswer = (name: "Yes" | "No") =>
  screen.getByRole("radio", { name }) as HTMLInputElement;

const isDisabled = (element: HTMLElement) =>
  (element as HTMLButtonElement).disabled;

describe("AnkiExportDialog", () => {
  it("offers the cards in the Anki updates queue with their count", () => {
    renderDialog();
    expect(
      screen.getByRole("radio", { name: "Queued cards (2)" }),
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

  it("answers No to flushing the queue while the cards are not marked as exported", () => {
    renderDialog({ marksExported: false });
    expect(queueAnswer("No").checked).toBe(true);
  });

  it("says beside keeping the cards in the queue that it suits a backup or a shared copy", () => {
    renderDialog();
    expect(queueAnswer("No").getAttribute("aria-describedby")).toBe(
      screen.getByText(/as a backup/).closest("[id]")?.id,
    );
  });

  it("says beside flushing the queue that it suits updating your own collection", () => {
    renderDialog();
    expect(queueAnswer("Yes").getAttribute("aria-describedby")).toBe(
      screen.getByText("update your own Anki collection").closest("[id]")?.id,
    );
  });

  it("keeps the cards in the queue by not marking them as exported", () => {
    const calls = renderDialog();
    fireEvent.click(queueAnswer("No"));
    expect(calls).toEqual(["marking false"]);
  });

  it("flushes the queue by marking the cards as exported", () => {
    const calls = renderDialog({ marksExported: false });
    fireEvent.click(queueAnswer("Yes"));
    expect(calls).toEqual(["marking true"]);
  });

  it("warns that importing would duplicate the cards AnkiConnect sent", () => {
    renderDialog({ duplicateCount: 2 });
    expect(screen.getByRole("note").textContent).toContain(
      "2 cards in this package have already been sent to Anki through AnkiConnect.",
    );
  });

  it("names a single card AnkiConnect sent in its warning", () => {
    renderDialog({ duplicateCount: 1 });
    expect(screen.getByRole("note").textContent).toContain(
      "1 card in this package has already been sent to Anki through AnkiConnect.",
    );
  });

  it("tells how to find the doubled notes in Anki", () => {
    renderDialog({ duplicateCount: 1 });
    expect(screen.getByRole("note").textContent).toContain(
      "Notes > Find Duplicates",
    );
  });

  it("warns of duplicates while the cards are kept in the queue", () => {
    renderDialog({ duplicateCount: 2, marksExported: false });
    expect(screen.queryByRole("note")).not.toBeNull();
  });

  it("does not warn of duplicates while no card was sent through AnkiConnect", () => {
    renderDialog({ duplicateCount: 0 });
    expect(screen.queryByRole("note")).toBeNull();
  });

  it("tells that a package cannot delete notes from Anki", () => {
    renderDialog();
    expect(
      screen.getByText(/an \.apkg import cannot delete notes from Anki/),
    ).toBeDefined();
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
