import { actions, selectCurrentMediaFileId } from "@easyimmerse/state";
import { act, cleanup } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createFakeBackendClient } from "../testSupport/createFakeBackendClient.ts";
import {
  fixtureMediaFiles,
  fixtureResponses,
} from "../testSupport/fixtureResponses.ts";
import { renderWithAppStore } from "../testSupport/renderWithAppStore.tsx";
import { useAddChosenMediaFile } from "./useAddChosenMediaFile.ts";

afterEach(cleanup);

function AddsChosenMediaFile() {
  useAddChosenMediaFile("p1");
  return null;
}

/** Renders the hook for project `p1`, whose media include `episode.mkv`, and picks a file of the given name. */
function chooseFile(name: string) {
  const client = createFakeBackendClient({
    ...fixtureResponses,
    "POST /projects/p1/media": {
      ...fixtureMediaFiles.media_files[0],
      id: "m3",
      name,
    },
  });
  const rendered = renderWithAppStore(<AddsChosenMediaFile />, client);
  act(() => {
    rendered.store.dispatch(
      actions.navigated({ type: "openProject", projectId: "p1" }),
    );
    rendered.store.dispatch(
      actions.mediaFileChosen({
        name,
        source: { kind: "path", path: `/videos/${name}` },
      }),
    );
  });
  return { ...rendered, client };
}

const postsOf = (client: ReturnType<typeof createFakeBackendClient>) =>
  client.requests.filter((request) => request.method === "POST");

describe("useAddChosenMediaFile", () => {
  it("opens the added media file", async () => {
    const { store } = chooseFile("pilot.mkv");
    await vi.waitFor(() =>
      expect(selectCurrentMediaFileId(store.getState())).toBe("m3"),
    );
  });

  describe("when a file of the same name is already in the project", () => {
    it("opens the file already there", async () => {
      const { store } = chooseFile("episode.mkv");
      await vi.waitFor(() =>
        expect(selectCurrentMediaFileId(store.getState())).toBe("m1"),
      );
    });

    it("says that the file is already in the project", async () => {
      const { effects } = chooseFile("episode.mkv");
      await vi.waitFor(() =>
        expect(effects.calls).toContainEqual({
          type: "showNotification",
          message: "“episode.mkv” is already in the project.",
        }),
      );
    });

    it("does not send the file again", async () => {
      const { client, store } = chooseFile("episode.mkv");
      await vi.waitFor(() =>
        expect(selectCurrentMediaFileId(store.getState())).toBe("m1"),
      );
      expect(postsOf(client)).toEqual([]);
    });
  });
});
