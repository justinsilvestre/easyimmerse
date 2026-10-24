import {
  cleanup,
  fireEvent,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import {
  createFakeBackendClient,
  type FakeResponse,
  fakeFailure,
} from "../../testSupport/createFakeBackendClient.ts";
import {
  exampleLibraryItem,
  exampleLibraryVideoText,
} from "../../testSupport/exampleLibrary.ts";
import { fixtureResponses } from "../../testSupport/fixtureResponses.ts";
import { bodyOf, requestsTo } from "../../testSupport/renderMediaScreen.tsx";
import { renderWithAppStore } from "../../testSupport/renderWithAppStore.tsx";
import { LibraryEditScreen } from "./LibraryEditScreen.tsx";

afterEach(cleanup);

/** Renders the edit screen of the draft item i1, with a server that answers as given. */
function renderEditor(responses: Record<string, FakeResponse> = {}) {
  const client = createFakeBackendClient({
    ...fixtureResponses,
    "GET /dictionaries": { dictionaries: [] },
    "GET /library/items/i1": exampleLibraryItem({ status: { kind: "draft" } }),
    "GET /library/items/i1/text": exampleLibraryVideoText,
    ...responses,
  });
  renderWithAppStore(<LibraryEditScreen itemId="i1" />, client);
  return client;
}

/** Opens the entry of the first "Hund" of the text. */
async function openHund() {
  const segments = await screen.findByRole("list", { name: "Segments" });
  const [hund] = within(segments).getAllByRole("button", { name: "Hund" });
  fireEvent.click(hund as HTMLElement);
  return screen.findByRole("form", { name: "Entry of Hund" });
}

const typeDefinition = (value: string) =>
  fireEvent.change(screen.getByLabelText("Definition in English"), {
    target: { value },
  });

describe("LibraryEditScreen", () => {
  describe("when an entry is saved", () => {
    it("closes the entry once the server saves it", async () => {
      renderEditor({
        "PUT /library/items/i1/segments/0/words":
          exampleLibraryVideoText.segments[0],
      });
      await openHund();
      fireEvent.click(screen.getByRole("button", { name: "Save entry" }));
      await waitFor(() =>
        expect(
          screen.queryByRole("form", { name: "Entry of Hund" }),
        ).toBeNull(),
      );
    });

    it("keeps what was typed when the server refuses it", async () => {
      renderEditor({
        "PUT /library/items/i1/segments/0/words": fakeFailure({
          status: 500,
          message: "",
        }),
      });
      await openHund();
      typeDefinition("hound");
      fireEvent.click(screen.getByRole("button", { name: "Save entry" }));
      await screen.findByRole("alert");
      expect(
        (screen.getByLabelText("Definition in English") as HTMLTextAreaElement)
          .value,
      ).toBe("hound");
    });
  });

  it("gives the entry to every word written the same through one request", async () => {
    const client = renderEditor({
      "POST /library/items/i1/apply-entry": exampleLibraryVideoText,
    });
    await openHund();
    typeDefinition("hound");
    fireEvent.click(
      screen.getByRole("button", { name: "Apply to every occurrence" }),
    );
    await waitFor(() =>
      expect(
        bodyOf(
          requestsTo(
            client.requests,
            "POST",
            "/library/items/i1/apply-entry",
          )[0],
        ),
      ).toMatchObject({ word_text: "Hund", entry: { l1_definition: "hound" } }),
    );
  });
});
