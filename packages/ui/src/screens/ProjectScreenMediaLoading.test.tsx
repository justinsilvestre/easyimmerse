import { actions } from "@easyimmerse/state";
import { act, cleanup, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import {
  createFakeBackendClient,
  type FakeResponse,
} from "../testSupport/createFakeBackendClient.ts";
import { fixtureResponses } from "../testSupport/fixtureResponses.ts";
import { renderWithAppStore } from "../testSupport/renderWithAppStore.tsx";
import { ProjectScreen } from "./ProjectScreen.tsx";

afterEach(cleanup);

/** Renders the project screen of p1, whose media list the server answers with `mediaFiles`. */
function renderProject(mediaFiles: FakeResponse) {
  const client = createFakeBackendClient({
    ...fixtureResponses,
    "GET /dictionaries": { dictionaries: [] },
    "GET /projects/p1/media": mediaFiles,
  });
  const rendered = renderWithAppStore(
    <ProjectScreen
      projectId="p1"
      onBack={() => undefined}
      onEditSettings={() => undefined}
    />,
    client,
  );
  act(() =>
    rendered.store.dispatch(
      actions.navigated({ type: "openProject", projectId: "p1" }),
    ),
  );
}

const neverAnswered = () => new Promise(() => {});

describe("ProjectScreen", () => {
  describe("while the media list is loading", () => {
    it("shows that the media are loading", async () => {
      renderProject(neverAnswered);
      expect(
        await screen.findByRole("status", { name: "Loading media" }),
      ).toBeDefined();
    });

    it("does not say the project has no media", async () => {
      renderProject(neverAnswered);
      await screen.findByRole("status", { name: "Loading media" });
      expect(screen.queryByText("No media yet")).toBeNull();
    });
  });

  describe("when the loaded media list is empty", () => {
    it("says the project has no media", async () => {
      renderProject({ media_files: [] });
      expect(await screen.findByText("No media yet")).toBeDefined();
    });
  });
});
