import { cleanup, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { exampleLibraryItem } from "../../testSupport/exampleLibrary.ts";
import { renderWithAppStore } from "../../testSupport/renderWithAppStore.tsx";
import { LibraryPublication } from "./LibraryPublication.tsx";

afterEach(cleanup);

const ignore = () => undefined;

describe("LibraryPublication", () => {
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
