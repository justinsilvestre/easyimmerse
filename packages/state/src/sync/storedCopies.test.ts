import type { MediaFile, SyncStatus } from "@easyimmerse/types";
import { describe, expect, it } from "vitest";
import { type AppAction, actions } from "../app/appAction.ts";
import { initialAppState } from "../app/update.ts";
import type { OperationsState } from "../operations/operations.ts";
import type { ServerCacheSlice } from "../server/cacheEntry.ts";
import { exampleMediaFile } from "../server/exampleMediaFile.ts";
import { serverCacheWith } from "../server/serverCacheWith.ts";
import type { RequestFailure, ServerRequest } from "../server/serverRequest.ts";
import type { ServerState } from "../server/serverState.ts";
import {
  storedCopyFetchRequestId,
  storedCopyUploadRequestId,
  uploadChoiceRequestId,
} from "./storedCopies.ts";
import { syncFeature } from "./updateSync.ts";

const browserFilm: MediaFile = {
  ...exampleMediaFile("m1", "film.mkv"),
  source: { kind: "browser_file", size: 2048, last_modified_ms: 7 },
};

const pathFilm = exampleMediaFile("m2", "other.mkv");

const listed = serverCacheWith("listMediaFiles", "p1", {
  media_files: [browserFilm, pathFilm],
});

const connected: ServerState = {
  config: { serverUrl: "https://media.example.org", token: "t" },
  cloudUrl: null,
};

const linkedStatus: SyncStatus = {
  link: {
    kind: "account",
    server_url: "https://cloud.example.org",
    account_email: "someone@example.org",
    account_role: "library_user",
    linked_at_ms: 0,
    last_synced_at_ms: null,
    pushed_through_seq: 0,
    state: { kind: "idle" },
    transfer: null,
    conflicts: [],
    conflict_count: 0,
  },
  pulled_revision: 0,
  local_change_seq: 0,
};

const waitingFor = (id: string, request: ServerRequest): OperationsState => ({
  ...initialAppState.operations,
  requests: [{ id, request, isWaiting: false, isSlow: false }],
});

/** Updates the sync slice for the action, connected to a server whose cache lists the project's media files. */
function syncUpdate(
  action: AppAction,
  {
    operations = initialAppState.operations,
    backend = listed,
    server = connected,
  }: {
    operations?: OperationsState;
    backend?: ServerCacheSlice;
    server?: ServerState;
  } = {},
) {
  return syncFeature.update(syncFeature.initialState, action, {
    operations,
    backend,
    server,
  });
}

const uploadRequest: ServerRequest = {
  kind: "uploadStoredCopy",
  projectId: "p1",
  mediaFileId: "m1",
  file: { name: "film.mkv", source: browserFilm.source },
};

/** The notices the update raised once the request failed as given. */
function noticesAfterFailure(
  request: ServerRequest,
  failure: RequestFailure,
  backend: ServerCacheSlice = listed,
) {
  const [, effects] = syncUpdate(
    {
      type: "requestSettled",
      id: "any",
      request,
      outcome: { ok: false, error: failure },
    } as AppAction,
    { backend },
  );
  return effects.map((effect) =>
    effect.type === "dispatch" && effect.action.type === "noticeRequested"
      ? effect.action.content.message
      : effect.type,
  );
}

describe("the sync update for stored copies", () => {
  it("records the choice to keep a copy on the server", () => {
    const [, effects] = syncUpdate(
      actions.uploadChoiceToggled("p1", "m1", true),
    );
    expect(effects).toEqual([
      {
        type: "sendRequest",
        id: uploadChoiceRequestId("m1"),
        request: {
          kind: "setUploadChoice",
          projectId: "p1",
          mediaFileId: "m1",
          isUploadChosen: true,
        },
      },
    ]);
  });

  it("does not record the choice again while the server has not answered", () => {
    const id = uploadChoiceRequestId("m1");
    const [, effects] = syncUpdate(
      actions.uploadChoiceToggled("p1", "m1", false),
      {
        operations: waitingFor(id, {
          kind: "setUploadChoice",
          projectId: "p1",
          mediaFileId: "m1",
          isUploadChosen: true,
        }),
      },
    );
    expect(effects).toEqual([]);
  });

  it("uploads the file the browser holds by its name and source", () => {
    const [, effects] = syncUpdate(
      actions.storedCopyUploadRequested("p1", "m1"),
    );
    expect(effects).toEqual([
      {
        type: "sendRequest",
        id: storedCopyUploadRequestId("m1"),
        request: uploadRequest,
      },
    ]);
  });

  it("uploads nothing for a file at a path", () => {
    const [, effects] = syncUpdate(
      actions.storedCopyUploadRequested("p1", "m2"),
    );
    expect(effects).toEqual([]);
  });

  it("asks the built-in server to download the remote's copy", () => {
    const [, effects] = syncUpdate(
      actions.storedCopyFetchRequested("p1", "m2"),
    );
    expect(effects).toEqual([
      {
        type: "sendRequest",
        id: storedCopyFetchRequestId("m2"),
        request: {
          kind: "fetchStoredCopy",
          projectId: "p1",
          mediaFileId: "m2",
        },
      },
    ]);
  });

  describe("when the person asks to delete a copy", () => {
    it("waits for them to confirm it", () => {
      const [sync] = syncUpdate(actions.storedCopyDeletionAsked("m1"));
      expect(sync.storedCopyDeletionToConfirm).toBe("m1");
    });

    it("forgets it once they keep the copy", () => {
      const [asked] = syncUpdate(actions.storedCopyDeletionAsked("m1"));
      const [sync] = syncFeature.update(
        asked,
        actions.storedCopyDeletionCancelled(),
        {
          operations: initialAppState.operations,
          backend: listed,
          server: connected,
        },
      );
      expect(sync.storedCopyDeletionToConfirm).toBeNull();
    });

    it("forgets it once they confirm it", () => {
      const [asked] = syncUpdate(actions.storedCopyDeletionAsked("m1"));
      const [sync] = syncFeature.update(
        asked,
        actions.uploadChoiceToggled("p1", "m1", false),
        {
          operations: initialAppState.operations,
          backend: listed,
          server: connected,
        },
      );
      expect(sync.storedCopyDeletionToConfirm).toBeNull();
    });
  });

  describe("when a request fails", () => {
    it("tells the person the server has no room for the upload", () => {
      expect(
        noticesAfterFailure(uploadRequest, {
          status: 413,
          code: "quota_exceeded",
          message: "over",
        }),
      ).toEqual([
        "There isn't enough room on media.example.org for this file.",
      ]);
    });

    it("names the remote the built-in server is linked to", () => {
      expect(
        noticesAfterFailure(
          { kind: "fetchStoredCopy", projectId: "p1", mediaFileId: "m2" },
          { status: 500, message: "failed" },
          serverCacheWith("getSyncStatus", undefined, linkedStatus, listed),
        ),
      ).toEqual(["other.mkv couldn't be downloaded from cloud.example.org."]);
    });

    it("tells nothing of an aborted request", () => {
      expect(
        noticesAfterFailure(uploadRequest, {
          status: "ABORTED",
          message: "aborted",
        }),
      ).toEqual([]);
    });

    it("tells nothing of other requests", () => {
      expect(
        noticesAfterFailure(
          { kind: "runSync" },
          { status: 500, message: "failed" },
        ),
      ).toEqual([]);
    });
  });
});
