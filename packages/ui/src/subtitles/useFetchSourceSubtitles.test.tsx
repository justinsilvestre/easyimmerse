import type { MediaFile } from "@easyimmerse/types";
import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it } from "vitest";
import { exampleMediaDescription } from "../projects/exampleMediaSourceJob.ts";
import { AppStoreProviders } from "../testSupport/AppStoreProviders.tsx";
import { createFakeBackendClient } from "../testSupport/createFakeBackendClient.ts";
import { createTestAppStore } from "../testSupport/createTestAppStore.ts";
import { useFetchSourceSubtitles } from "./useFetchSourceSubtitles.ts";

afterEach(cleanup);

const mediaFile: MediaFile = {
  id: "m1",
  project_id: "p1",
  name: "media.mp4",
  source: { kind: "path", path: "/media/x/media.mp4" },
  origin: { plugin: "video-site", locator: "https://videos.example.com/abc" },
  created_at_ms: 0,
  track_selection_json: null,
};

const sourceSubtitlesPath = "/projects/p1/media/m1/source-subtitles";

/** Opens the dialog, waits for the offered tracks, and fetches the English ones. */
async function fetchEnglish(skipped: { id: string; reason: string }[]) {
  const client = createFakeBackendClient({
    [`GET ${sourceSubtitlesPath}`]: {
      subtitles: exampleMediaDescription.subtitles,
    },
    [`POST ${sourceSubtitlesPath}`]: {
      tracks: [],
      selection: { target_track_id: null, translation_track_id: null },
      skipped,
    },
  });
  const { store, playerRegistry } = createTestAppStore(client, null);
  const wrapper = ({ children }: { children: ReactNode }) => (
    <AppStoreProviders
      store={store}
      playerRegistry={playerRegistry}
      browserFileRegistry={null}
    >
      {children}
    </AppStoreProviders>
  );
  const { result } = renderHook(
    () => useFetchSourceSubtitles("p1", mediaFile),
    { wrapper },
  );
  act(() => result.current.open?.());
  await waitFor(() => expect(result.current.subtitles).not.toBeNull());
  act(() => result.current.fetch(["en"]));
  await waitFor(() => expect(result.current.isFetching).toBe(false));
  return result;
}

describe("useFetchSourceSubtitles", () => {
  it("closes the dialog once every chosen track is added", async () => {
    const result = await fetchEnglish([]);
    await waitFor(() => expect(result.current.isOpen).toBe(false));
  });

  it("keeps the dialog open to name a chosen track that was not added", async () => {
    const result = await fetchEnglish([
      { id: "en", reason: "the plugin did not fetch it" },
    ]);
    await waitFor(() =>
      expect(result.current.error).toBe(
        "The subtitles “English (automatic)” were not added: the plugin did not fetch it.",
      ),
    );
  });
});
