import type { MiddlewareAPI, UnknownAction } from "redux";
import { describe, expect, it, vi } from "vitest";
import type {
  Effects,
  PickedFile,
  PickedMediaFile,
} from "../platform/effects.ts";
import { createRecordingEffects } from "../platform/recordingEffects.ts";
import type { RequestOutcome, ServerRequest } from "../server/serverRequest.ts";
import { abortedFailure } from "../server/serverRequest.ts";
import { actions } from "./appAction.ts";
import { createAppStore } from "./createAppStore.ts";
import type { FakeServerStoreParts } from "./createFakeServerStoreParts.ts";
import { createFakeServerStoreParts } from "./createFakeServerStoreParts.ts";
import type { PerformedEffect } from "./effect.ts";
import { createEffectsMiddleware } from "./effectsMiddleware.ts";

const pickedFile: PickedFile = {
  name: "episode.srt",
  source: { kind: "inline", text: "1\n00:00:01,000 --> 00:00:02,000\nHello" },
};

const pickedMediaFile: PickedMediaFile = {
  name: "episode.mkv",
  source: { kind: "path", path: "/videos/episode.mkv" },
};

const timerAction = actions.notificationRequested("Time is up");

const startTimer: PerformedEffect = {
  type: "startTimer",
  id: "test/a",
  ms: 1_000,
  action: timerAction,
};

const listing: ServerRequest = { kind: "listMediaFiles", projectId: "p1" };

const listed: RequestOutcome<"listMediaFiles"> = {
  ok: true,
  data: { media_files: [] },
};

const aborted: RequestOutcome<"listMediaFiles"> = {
  ok: false,
  error: abortedFailure,
};

const sendListing: PerformedEffect = {
  type: "sendRequest",
  id: "a",
  request: listing,
};

/** Passes one action through an effects middleware whose reducer queued `queued`, and returns the actions the middleware dispatches, then and later. */
function dispatchedBy(
  effects: Effects,
  queued: readonly PerformedEffect[],
  server: FakeServerStoreParts = createFakeServerStoreParts(),
): UnknownAction[] {
  const dispatched: UnknownAction[] = [];
  const api: MiddlewareAPI = {
    dispatch: (action) => {
      dispatched.push(action);
      return action;
    },
    getState: () => ({}),
  };
  createEffectsMiddleware(effects, server.runRequest, () => queued)(api)(
    () => undefined,
  )(actions.playerTimeChanged(0));
  return dispatched;
}

describe("effectsMiddleware", () => {
  it("dispatches a started timer's action once the clock passes its deadline", () => {
    const effects = createRecordingEffects();
    const dispatched = dispatchedBy(effects, [startTimer]);
    effects.clock.advanceBy(1_000);
    expect(dispatched).toEqual([timerAction]);
  });

  it("does not dispatch the action of a timer that was cancelled", () => {
    const effects = createRecordingEffects();
    const dispatched = dispatchedBy(effects, [
      startTimer,
      { type: "cancelTimer", id: "test/a" },
    ]);
    effects.clock.advanceBy(1_000);
    expect(dispatched).toEqual([]);
  });

  it("sends a request through the server parts' runner", () => {
    const server = createFakeServerStoreParts();
    dispatchedBy(createRecordingEffects(), [sendListing], server);
    expect(server.sentRequests).toEqual([listing]);
  });

  it("dispatches requestSettled once the server responds", async () => {
    const server = createFakeServerStoreParts();
    const dispatched = dispatchedBy(
      createRecordingEffects(),
      [sendListing],
      server,
    );
    server.respond(listing, listed);
    await vi.waitFor(() => {
      expect(dispatched).toEqual([
        actions.requestSettled("a", listing, listed),
      ]);
    });
  });

  it("settles an aborted request as aborted", async () => {
    const dispatched = dispatchedBy(createRecordingEffects(), [
      sendListing,
      { type: "abortRequest", id: "a" },
    ]);
    await vi.waitFor(() => {
      expect(dispatched).toEqual([
        actions.requestSettled("a", listing, aborted),
      ]);
    });
  });

  it("drops the outcome of a replaced request", async () => {
    const server = createFakeServerStoreParts();
    const dispatched = dispatchedBy(
      createRecordingEffects(),
      [sendListing, sendListing],
      server,
    );
    server.respond(listing, listed);
    await vi.waitFor(() => {
      expect(dispatched).toEqual([
        actions.requestSettled("a", listing, listed),
      ]);
    });
  });

  it("settles a withdrawn request as aborted", () => {
    const dispatched = dispatchedBy(createRecordingEffects(), [
      { type: "settleWithdrawnRequest", id: "a", request: listing },
    ]);
    expect(dispatched).toEqual([actions.requestSettled("a", listing, aborted)]);
  });

  it("does not send a withdrawn request", () => {
    const server = createFakeServerStoreParts();
    dispatchedBy(
      createRecordingEffects(),
      [{ type: "settleWithdrawnRequest", id: "a", request: listing }],
      server,
    );
    expect(server.sentRequests).toEqual([]);
  });

  it("calls seekPlayer after seekRequested is dispatched", () => {
    const effects = createRecordingEffects();
    const store = createAppStore(effects, createFakeServerStoreParts());
    store.dispatch(actions.openMediaFileRequested("p1", "m1"));
    store.dispatch(actions.seekRequested(12.5));
    expect(effects.calls.filter(({ type }) => type === "seekPlayer")).toEqual([
      { type: "seekPlayer", seconds: 12.5 },
    ]);
  });

  it("dispatches subtitleFileChosen once the file pick resolves", async () => {
    const effects = createRecordingEffects();
    const server = createFakeServerStoreParts();
    const store = createAppStore(effects, server);
    store.dispatch(actions.subtitleFilePickRequested());
    effects.resolvePickFile(pickedFile);
    await vi.waitFor(() => {
      expect(server.dispatchedActions).toContainEqual(
        actions.subtitleFileChosen(pickedFile),
      );
    });
  });

  it("dispatches subtitleFilePickCancelled once the file pick resolves to null", async () => {
    const effects = createRecordingEffects();
    const server = createFakeServerStoreParts();
    const store = createAppStore(effects, server);
    store.dispatch(actions.subtitleFilePickRequested());
    effects.resolvePickFile(null);
    await vi.waitFor(() => {
      expect(server.dispatchedActions).toContainEqual(
        actions.subtitleFilePickCancelled(),
      );
    });
  });

  it("dispatches subtitleFilePickCancelled once the file pick fails", async () => {
    const effects = createRecordingEffects();
    const server = createFakeServerStoreParts();
    const store = createAppStore(effects, server);
    store.dispatch(actions.subtitleFilePickRequested());
    effects.rejectPickFile(new Error("dialog unavailable"));
    await vi.waitFor(() => {
      expect(server.dispatchedActions).toContainEqual(
        actions.subtitleFilePickCancelled(),
      );
    });
  });

  it("dispatches mediaFileChosen once the media file pick resolves", async () => {
    const effects = createRecordingEffects();
    const server = createFakeServerStoreParts();
    const store = createAppStore(effects, server);
    store.dispatch(actions.mediaFilePickRequested());
    effects.resolvePickMediaFile(pickedMediaFile);
    await vi.waitFor(() => {
      expect(server.dispatchedActions).toContainEqual(
        actions.mediaFileChosen(pickedMediaFile),
      );
    });
  });

  it("dispatches dictionaryFileChosen once the dictionary file pick resolves", async () => {
    const effects = createRecordingEffects();
    const server = createFakeServerStoreParts();
    const store = createAppStore(effects, server);
    store.dispatch(actions.dictionaryFilePickRequested());
    effects.resolvePickDictionaryFile(pickedMediaFile);
    await vi.waitFor(() => {
      expect(server.dispatchedActions).toContainEqual(
        actions.dictionaryFileChosen(pickedMediaFile),
      );
    });
  });

  it("dispatches mediaFilePickCancelled once the media file pick resolves to null", async () => {
    const effects = createRecordingEffects();
    const server = createFakeServerStoreParts();
    const store = createAppStore(effects, server);
    store.dispatch(actions.mediaFilePickRequested());
    effects.resolvePickMediaFile(null);
    await vi.waitFor(() => {
      expect(server.dispatchedActions).toContainEqual(
        actions.mediaFilePickCancelled(),
      );
    });
  });

  it("dispatches mediaFilePickCancelled once the media file pick fails", async () => {
    const effects = createRecordingEffects();
    const server = createFakeServerStoreParts();
    const store = createAppStore(effects, server);
    store.dispatch(actions.mediaFilePickRequested());
    effects.rejectPickMediaFile(new Error("dialog unavailable"));
    await vi.waitFor(() => {
      expect(server.dispatchedActions).toContainEqual(
        actions.mediaFilePickCancelled(),
      );
    });
  });

  it("dispatches preferencesLoaded with the stored values once the store has started", async () => {
    const effects = createRecordingEffects();
    effects.preferences.set("showTranslations", "true");
    const server = createFakeServerStoreParts();
    createAppStore(effects, server);
    await vi.waitFor(() => {
      expect(server.dispatchedActions).toContainEqual(
        actions.preferencesLoaded({ showTranslations: "true" }),
      );
    });
  });

  it("dispatches preferencesLoaded even when a preference fails to load", async () => {
    const effects = createRecordingEffects();
    effects.loadPreference = () => Promise.reject(new Error("storage locked"));
    const server = createFakeServerStoreParts();
    createAppStore(effects, server);
    await vi.waitFor(() => {
      expect(server.dispatchedActions).toContainEqual(
        actions.preferencesLoaded({}),
      );
    });
  });

  it("calls savePreference after preferenceToggled is dispatched", () => {
    const effects = createRecordingEffects();
    const store = createAppStore(effects, createFakeServerStoreParts());
    store.dispatch(actions.preferenceToggled("showTranslations"));
    expect(effects.preferences.get("showTranslations")).toBe("true");
  });

  it("dispatches readingLocationLoaded with the stored location after readingLocationLoadRequested", async () => {
    const location = { chapterIndex: 2, paragraphIndex: 3, offset: 4 };
    const effects = createRecordingEffects();
    effects.preferences.set("readingLocation:b1", JSON.stringify(location));
    const server = createFakeServerStoreParts();
    const store = createAppStore(effects, server);
    store.dispatch(actions.readingLocationLoadRequested("b1"));
    await vi.waitFor(() => {
      expect(server.dispatchedActions).toContainEqual(
        actions.readingLocationLoaded("b1", location),
      );
    });
  });

  it("dispatches readingLocationLoaded with null when the location fails to load", async () => {
    const effects = createRecordingEffects();
    effects.loadPreference = () => Promise.reject(new Error("storage locked"));
    const server = createFakeServerStoreParts();
    const store = createAppStore(effects, server);
    store.dispatch(actions.readingLocationLoadRequested("b1"));
    await vi.waitFor(() => {
      expect(server.dispatchedActions).toContainEqual(
        actions.readingLocationLoaded("b1", null),
      );
    });
  });

  it("stores the reading location as JSON after readingLocationReported in a new paragraph", () => {
    const location = { chapterIndex: 0, paragraphIndex: 1, offset: 2 };
    const effects = createRecordingEffects();
    const store = createAppStore(effects, createFakeServerStoreParts());
    store.dispatch(actions.readingLocationReported("b1", location));
    expect(effects.preferences.get("readingLocation:b1")).toBe(
      JSON.stringify(location),
    );
  });
});
