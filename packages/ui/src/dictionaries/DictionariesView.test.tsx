import { cleanup, fireEvent, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { renderWithAppStore } from "../testSupport/renderWithAppStore.tsx";
import { DictionariesView } from "./DictionariesView.tsx";
import { exampleDictionaries } from "./exampleDictionaries.ts";

afterEach(cleanup);

const progress = {
  entries: 123_456,
  term_meta: 0,
  kanji: 0,
  kanji_meta: 0,
  tags: 0,
  media: 0,
};

function renderView(props: Partial<Parameters<typeof DictionariesView>[0]>) {
  const dismissals: string[] = [];
  renderWithAppStore(
    <DictionariesView
      dictionaries={exampleDictionaries}
      unsupportedFile={null}
      pendingTable={null}
      onBack={() => undefined}
      onAddFromFile={() => undefined}
      onRemove={() => undefined}
      onConfirmRemoval={() => undefined}
      onCancelRemoval={() => undefined}
      onDismissUnsupportedFile={() => undefined}
      onDismissImportFailure={() => dismissals.push("importFailure")}
      onTableColumnRoleChosen={() => undefined}
      onTableHeaderRowToggled={() => undefined}
      onImportTable={() => undefined}
      onCancelTable={() => undefined}
      {...props}
    />,
  );
  return { dismissals };
}

describe("DictionariesView", () => {
  describe("while a file is being added", () => {
    it("shows a progress bar named after the file", () => {
      renderView({ addingFile: "jmdict.zip" });
      expect(
        screen.getByRole("progressbar", { name: "Adding jmdict.zip…" }),
      ).toBeDefined();
    });

    it("leaves the bar indeterminate, since the dictionary's size is unknown", () => {
      renderView({ addingFile: "jmdict.zip" });
      expect(
        screen.getByRole("progressbar").getAttribute("aria-valuenow"),
      ).toBeNull();
    });

    it("counts the entries stored so far in the user's locale", () => {
      renderView({ addingFile: "jmdict.zip", importProgress: progress });
      expect(
        screen.getByText(`${(123_456).toLocaleString()} entries so far`),
      ).toBeDefined();
    });

    it("counts nothing before the server reports progress", () => {
      renderView({ addingFile: "jmdict.zip" });
      expect(screen.queryByText(/so far/)).toBeNull();
    });

    it("disables adding another file", () => {
      renderView({ addingFile: "jmdict.zip" });
      expect(
        screen.getByRole<HTMLButtonElement>("button", {
          name: "Add from a file",
        }).disabled,
      ).toBe(true);
    });
  });

  describe("after an import has failed", () => {
    it("shows why as an alert", () => {
      renderView({ importFailure: "jmdict.zip could not be added: broken" });
      expect(screen.getByRole("alert").textContent).toContain(
        "jmdict.zip could not be added: broken",
      );
    });

    it("lets the alert be dismissed", () => {
      const { dismissals } = renderView({
        importFailure: "jmdict.zip could not be added: broken",
      });
      fireEvent.click(screen.getByRole("button", { name: "Dismiss" }));
      expect(dismissals).toEqual(["importFailure"]);
    });
  });

  describe("while asking whether to remove a dictionary", () => {
    const askAboutWiktionary = () =>
      renderView({ confirmingRemovalOf: exampleDictionaries[0] });

    it("names the dictionary", () => {
      askAboutWiktionary();
      expect(
        screen.getByRole("dialog", {
          name: "Remove German-English Wiktionary?",
        }),
      ).toBeDefined();
    });

    it("says that the removal cannot be undone", () => {
      askAboutWiktionary();
      expect(screen.getByRole("dialog").textContent).toContain(
        "cannot be undone",
      );
    });

    it("does not say where the dictionary is kept, which differs between the apps", () => {
      askAboutWiktionary();
      expect(screen.getByRole("dialog").textContent).not.toContain("device");
    });

    it("focuses Cancel", () => {
      askAboutWiktionary();
      expect(document.activeElement).toBe(
        screen.getByRole("button", { name: "Cancel" }),
      );
    });
  });
});
