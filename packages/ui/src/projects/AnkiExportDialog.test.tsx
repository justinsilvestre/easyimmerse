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
      scope="new"
      newCount={2}
      allCount={4}
      isBusy={false}
      onScopeChange={(scope: AnkiExportScope) => calls.push(`scope ${scope}`)}
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
  it("offers the new cards with their count", () => {
    renderDialog();
    expect(
      screen.getByRole("radio", { name: "New cards only (2)" }),
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
    renderDialog({ newCount: 0 });
    expect(isDisabled(exportButton())).toBe(true);
  });

  it("offers no second export while one is under way", () => {
    renderDialog({ isBusy: true });
    expect(isDisabled(exportButton())).toBe(true);
  });

  it("ticks every media file while none is chosen", () => {
    renderDialog();
    expect(
      screen
        .getAllByRole("checkbox")
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
