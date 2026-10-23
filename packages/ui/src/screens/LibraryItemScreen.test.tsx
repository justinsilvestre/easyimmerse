import { selectRoute } from "@easyimmerse/state";
import { cleanup, fireEvent, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { exampleLibraryItem } from "../library/exampleLibrary.ts";
import { createFakeBackendClient } from "../testSupport/createFakeBackendClient.ts";
import { fixtureResponses } from "../testSupport/fixtureResponses.ts";
import { bodyOf, requestsTo } from "../testSupport/renderMediaScreen.tsx";
import { renderWithAppStore } from "../testSupport/renderWithAppStore.tsx";
import { LibraryItemScreen } from "./LibraryItemScreen.tsx";

afterEach(cleanup);

/** Renders the German item i1, which the server adds to project p1 as media file m3. */
function renderItem() {
  const client = createFakeBackendClient({
    ...fixtureResponses,
    "GET /library/items/i1": exampleLibraryItem(),
    "POST /library/items/i1/add": { project_id: "p1", media_file_id: "m3" },
  });
  return {
    client,
    ...renderWithAppStore(<LibraryItemScreen itemId="i1" />, client),
  };
}

const addToProject = async () =>
  fireEvent.click(
    await screen.findByRole("button", { name: "Add to project" }),
  );

describe("LibraryItemScreen", () => {
  it("offers the person's projects in the item's language, and a new project", async () => {
    renderItem();
    const choice = (await screen.findByLabelText(
      "Add to",
    )) as HTMLSelectElement;
    await waitFor(() =>
      expect([...choice.options].map(({ text }) => text)).toEqual([
        "Alpha",
        "New German project",
      ]),
    );
  });

  it("adds the item to a new project when that is chosen", async () => {
    const { client } = renderItem();
    fireEvent.change(await screen.findByLabelText("Add to"), {
      target: { value: "" },
    });
    await addToProject();
    await waitFor(() =>
      expect(
        bodyOf(requestsTo(client.requests, "POST", "/library/items/i1/add")[0]),
      ).toEqual({ project_id: null }),
    );
  });

  it("opens the added media file in its project", async () => {
    const { store } = renderItem();
    await addToProject();
    await waitFor(() =>
      expect(selectRoute(store.getState())).toEqual({
        screen: "media",
        projectId: "p1",
        mediaFileId: "m3",
      }),
    );
  });
});
