import { describe, expect, it } from "vitest";
import { actions } from "../app/appAction.ts";
import { createAppStore } from "../app/createAppStore.ts";
import { createFakeServerStoreParts } from "../app/createFakeServerStoreParts.ts";
import { createRecordingEffects } from "../platform/recordingEffects.ts";
import { learner } from "../screen/libraryPreparationTestSupport.ts";
import type { ServerCacheSlice } from "../server/cacheEntry.ts";
import { exampleMediaFile } from "../server/exampleMediaFile.ts";
import {
  emptyServerCache,
  serverCacheWith,
  serverCacheWithFailure,
  serverCacheWithPending,
} from "../server/serverCacheWith.ts";
import type { RequestFailure } from "../server/serverRequest.ts";
import type { ServerConfig } from "../server/serverState.ts";

const server: ServerConfig = {
  serverUrl: "https://books.example.org",
  token: "t",
};

const notFound: RequestFailure = { status: 404, message: "Not found." };

const listedM1 = serverCacheWith("listMediaFiles", "p1", {
  media_files: [exampleMediaFile("m1", "film.mp4")],
});

/** Creates a store whose platform shows the address at startup, over the given server cache, connected to a server unless `config` is null. */
function storeOpenedAt(
  path: string,
  cache: ServerCacheSlice,
  config: ServerConfig | null = server,
) {
  const effects = createRecordingEffects();
  effects.showAddress(path);
  const store = createAppStore(
    effects,
    createFakeServerStoreParts(config, cache),
  );
  return { store, effects };
}

const screenOf = ({ store }: ReturnType<typeof storeOpenedAt>) =>
  store.getState().app.route.screen;

describe("watchUnreachableRoute", () => {
  it("moves home from a project the server does not have", () => {
    const cache = serverCacheWithFailure("getProject", "p1", notFound);
    expect(screenOf(storeOpenedAt("/projects/p1", cache))).toBe("home");
  });

  it("replaces the unreachable screen's history entry with the home screen's", () => {
    const cache = serverCacheWithFailure("getProject", "p1", notFound);
    const { effects } = storeOpenedAt("/projects/p1/review", cache);
    expect(effects.calls).toContainEqual({
      type: "writeLocation",
      entry: { path: "/", previousPath: null },
      write: "replace",
    });
  });

  it("stays on a project that failed to load for another reason", () => {
    const failure = { status: "NETWORK", message: "Offline." } as const;
    const cache = serverCacheWithFailure("getProject", "p1", failure);
    expect(screenOf(storeOpenedAt("/projects/p1", cache))).toBe("project");
  });

  it("stays on a project while it loads", () => {
    const cache = serverCacheWithPending("getProject", "p1");
    expect(screenOf(storeOpenedAt("/projects/p1", cache))).toBe("project");
  });

  it("moves home from a media file its project's list lacks", () => {
    expect(screenOf(storeOpenedAt("/projects/p1/media/m2", listedM1))).toBe(
      "home",
    );
  });

  it("stays on a media file its project's list holds", () => {
    expect(screenOf(storeOpenedAt("/projects/p1/media/m1", listedM1))).toBe(
      "media",
    );
  });

  it("stays on a media file while its project's list is fetched again", () => {
    const cache = serverCacheWithPending("listMediaFiles", "p1");
    expect(screenOf(storeOpenedAt("/projects/p1/media/m2", cache))).toBe(
      "media",
    );
  });

  it("stays on a media file the app opened itself before its project's list holds it", () => {
    const { store } = storeOpenedAt("/projects/p1", listedM1);
    store.dispatch(actions.openMediaFileRequested("p1", "m2"));
    expect(store.getState().app.route.screen).toBe("media");
  });

  it("moves home from a library item the server does not have", () => {
    const cache = serverCacheWithFailure("getLibraryItem", "i1", notFound);
    expect(screenOf(storeOpenedAt("/library/items/i1", cache))).toBe("home");
  });

  it("moves home from the library management screen for someone who does not manage the library", () => {
    const cache = serverCacheWith("getCurrentPrincipal", "self", learner);
    expect(screenOf(storeOpenedAt("/library/manage", cache))).toBe("home");
  });

  it("stays on the library management screen for a library manager", () => {
    const cache = serverCacheWith("getCurrentPrincipal", "self", {
      kind: "launch",
    });
    expect(screenOf(storeOpenedAt("/library/manage", cache))).toBe(
      "libraryManage",
    );
  });

  it("stays on the library management screen until it knows who uses the app", () => {
    expect(screenOf(storeOpenedAt("/library/manage", emptyServerCache))).toBe(
      "libraryManage",
    );
  });

  it("moves home from a library screen while the app has no server", () => {
    expect(screenOf(storeOpenedAt("/library", emptyServerCache, null))).toBe(
      "home",
    );
  });

  it("keeps Settings open over the home screen it moves to", () => {
    const cache = serverCacheWithFailure("getProject", "p1", notFound);
    const opened = storeOpenedAt("/projects/p1?settings=account", cache);
    expect(opened.store.getState().app.route).toEqual({
      screen: "settings",
      beneath: { screen: "home" },
      pages: ["account"],
    });
  });
});
