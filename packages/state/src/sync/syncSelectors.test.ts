import type { SyncLink, SyncStatus } from "@easyimmerse/types";
import { describe, expect, it } from "vitest";
import { initialAppState } from "../app/update.ts";
import {
  emptyServerCache,
  serverCacheWith,
} from "../server/serverCacheWith.ts";
import { storedCopyUploadRequestId } from "./storedCopies.ts";
import {
  selectIsStoredCopyUploading,
  selectSyncLink,
  selectSyncStatus,
} from "./syncSelectors.ts";

const link: SyncLink = {
  kind: "account",
  server_url: "https://cloud.example.org",
  account_email: "someone@example.org",
  account_role: "library_user",
  linked_at_ms: 0,
  last_synced_at_ms: null,
  pushed_through_seq: 0,
  state: { kind: "idle" },
  transfer: null,
  refused_upload: null,
  conflicts: [],
  conflict_count: 0,
};

const status: SyncStatus = { link, pulled_revision: 3, local_change_seq: 7 };

const reported = {
  app: initialAppState,
  backend: serverCacheWith("getSyncStatus", undefined, status),
};

const unreported = { app: initialAppState, backend: emptyServerCache };

describe("selectSyncStatus", () => {
  it("returns the status the built-in server reported", () => {
    expect(selectSyncStatus(reported)).toEqual(status);
  });

  it("returns null before the built-in server has reported one", () => {
    expect(selectSyncStatus(unreported)).toBeNull();
  });
});

describe("selectSyncLink", () => {
  it("returns the built-in server's link", () => {
    expect(selectSyncLink(reported)).toEqual(link);
  });

  it("returns null before the built-in server has reported its status", () => {
    expect(selectSyncLink(unreported)).toBeNull();
  });
});

describe("selectIsStoredCopyUploading", () => {
  it("tells that the file is being uploaded while its upload waits for the server", () => {
    const uploading = {
      app: {
        ...initialAppState,
        operations: {
          ...initialAppState.operations,
          requests: [
            {
              id: storedCopyUploadRequestId("m1"),
              request: {
                kind: "fetchStoredCopy",
                projectId: "p1",
                mediaFileId: "m1",
              },
              isWaiting: false,
              isSlow: false,
            } as const,
          ],
        },
      },
      backend: emptyServerCache,
    };
    expect(selectIsStoredCopyUploading(uploading, "m1")).toBe(true);
  });
});
