import type { LibraryItemStatus } from "@easyimmerse/types";
import { cleanup, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { exampleLibraryItem } from "../../testSupport/exampleLibrary.ts";
import { renderWithAppStore } from "../../testSupport/renderWithAppStore.tsx";
import { LibraryPublication } from "./LibraryPublication.tsx";

afterEach(cleanup);

const ignore = () => undefined;

/** Renders the publication of the example item in the status, with no deletion waiting. */
function renderInStatus(status: LibraryItemStatus) {
  renderWithAppStore(
    <LibraryPublication
      item={exampleLibraryItem({ status })}
      isBusy={false}
      onProposeWords={ignore}
      onPublish={ignore}
      onUnpublish={ignore}
      isConfirmingDelete={false}
      onAskDelete={ignore}
      onCancelDelete={ignore}
      onDelete={ignore}
    />,
  );
}

describe("LibraryPublication", () => {
  describe("for a published item", () => {
    it("offers to fill in words", () => {
      renderInStatus({ kind: "published" });
      expect(
        screen.getByRole("button", {
          name: "Fill in words from your dictionaries",
        }),
      ).toBeDefined();
    });

    it("offers no publishing", () => {
      renderInStatus({ kind: "published" });
      expect(screen.queryByRole("button", { name: "Publish" })).toBeNull();
    });
  });

  it("offers no filling in of words while the item is being prepared", () => {
    renderInStatus({ kind: "processing" });
    expect(
      screen.queryByRole("button", {
        name: "Fill in words from your dictionaries",
      }),
    ).toBeNull();
  });

  describe("while a deletion waits for confirmation", () => {
    it("asks in a dialog titled with the item's name", () => {
      renderWithAppStore(
        <LibraryPublication
          item={exampleLibraryItem()}
          isBusy={false}
          onProposeWords={ignore}
          onPublish={ignore}
          onUnpublish={ignore}
          isConfirmingDelete
          onAskDelete={ignore}
          onCancelDelete={ignore}
          onDelete={ignore}
        />,
      );
      expect(
        screen.getByRole("dialog", { name: "Delete “Im Park”?" }),
      ).toBeDefined();
    });
  });
});
