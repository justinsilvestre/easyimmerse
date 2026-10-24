import { useListMediaFilesQuery } from "@easyimmerse/backend";
import { createBrowserFileRegistry } from "@easyimmerse/state";
import type { SyncLink } from "@easyimmerse/types";
import { cleanup, fireEvent, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it } from "vitest";
import {
  builtInServerOn,
  createBuiltInServerClient,
} from "../../testSupport/createBuiltInServerClient.ts";
import type { FakeResponse } from "../../testSupport/createFakeBackendClient.ts";
import {
  fixtureMediaFiles,
  fixtureSyncLink,
} from "../../testSupport/fixtureResponses.ts";
import { bodyOf, requestsTo } from "../../testSupport/renderMediaScreen.tsx";
import { renderWithAppStore } from "../../testSupport/renderWithAppStore.tsx";
import {
  accountServer,
  createAccountServerClient,
  fixtureStorageStatus,
} from "../../testSupport/storageFixtures.ts";
import { MediaUploadChoice } from "./MediaUploadChoice.tsx";
import type { MediaCopy } from "./mediaCopyOf.ts";

afterEach(cleanup);

const notKept: MediaCopy = {
  projectId: "p1",
  isUploadChosen: false,
  hasStoredCopy: false,
  browserFile: null,
  isUnreadableHere: false,
};

const [episode] = fixtureMediaFiles.media_files;

/** Renders the choice for m1 on the desktop app's built-in server, linked as the link given tells, or not linked. */
function renderOnBuiltInServer(
  copy: MediaCopy,
  link: SyncLink | null = fixtureSyncLink,
) {
  const client = createBuiltInServerClient(link, {
    "PUT /projects/p1/media/m1/upload-choice": episode,
    "POST /projects/p1/media/m1/stored-copy/fetch": new Promise(
      () => undefined,
    ),
  });
  renderWithAppStore(
    <MediaUploadChoice mediaFileId="m1" copy={copy} />,
    client,
    {
      server: builtInServerOn("desktop"),
    },
  );
  return client;
}

/** Renders its children once the project's media list is cached, as the project screen has it. */
function AfterMediaList({ children }: { children: ReactNode }) {
  return useListMediaFilesQuery("p1").data ? children : null;
}

/** A browser that holds every file it is asked about. */
const holdingAll = {
  ...createBrowserFileRegistry<File>(),
  find: (name: string) => new File([], name),
};

/** Renders the choice for the browser file m2, connected as an account to a server that reports the storage status given. */
function renderOnAccountServer(
  copy: MediaCopy,
  storage: FakeResponse = fixtureStorageStatus([]),
) {
  const client = createAccountServerClient(storage, {
    "PUT /projects/p1/media/m2/stored-copy": new Promise(() => undefined),
    "PUT /projects/p1/media/m2/upload-choice": episode,
  });
  renderWithAppStore(
    <AfterMediaList>
      <MediaUploadChoice mediaFileId="m2" copy={copy} />
    </AfterMediaList>,
    client,
    { server: accountServer, browserFileRegistry: holdingAll },
  );
  return client;
}

const transferOfM1 = {
  media_file_id: "m1",
  name: "episode.mkv",
  sent_bytes: 400,
  total_bytes: 1000,
};

const uploadingM1: SyncLink = { ...fixtureSyncLink, transfer: transferOfM1 };

const inBrowser: MediaCopy = { ...notKept, browserFile: "held" };

describe("MediaUploadChoice", () => {
  describe("on the native app's built-in server linked to a remote", () => {
    it("shows whether the remote keeps a copy", async () => {
      renderOnBuiltInServer({ ...notKept, isUploadChosen: true });
      const checkbox = await screen.findByRole("checkbox", {
        name: "Keep a copy on cloud.example.org",
      });
      expect((checkbox as HTMLInputElement).checked).toBe(true);
    });

    it("records the choice to keep a copy", async () => {
      const client = renderOnBuiltInServer(notKept);
      fireEvent.click(await screen.findByRole("checkbox"));
      await waitFor(() =>
        expect(
          requestsTo(
            client.requests,
            "PUT",
            "/projects/p1/media/m1/upload-choice",
          ).map(bodyOf),
        ).toEqual([{ is_upload_chosen: true }]),
      );
    });

    it("tells how far the file's upload has come", async () => {
      renderOnBuiltInServer({ ...notKept, isUploadChosen: true }, uploadingM1);
      expect(await screen.findByText("Uploading… 40%")).toBeTruthy();
    });

    it("does not tell of another file's upload", async () => {
      renderOnBuiltInServer(
        { ...notKept, isUploadChosen: true },
        {
          ...fixtureSyncLink,
          transfer: { ...transferOfM1, media_file_id: "m9" },
        },
      );
      await screen.findByRole("checkbox");
      expect(screen.queryByText(/Uploading/)).toBeNull();
    });

    it("downloads the remote's copy of a file this device cannot read", async () => {
      const client = renderOnBuiltInServer({
        ...notKept,
        isUploadChosen: true,
        isUnreadableHere: true,
      });
      fireEvent.click(
        await screen.findByRole("button", {
          name: "Download from cloud.example.org",
        }),
      );
      await waitFor(() =>
        expect(
          requestsTo(
            client.requests,
            "POST",
            "/projects/p1/media/m1/stored-copy/fetch",
          ),
        ).toHaveLength(1),
      );
    });

    it("tells that the download is under way", async () => {
      renderOnBuiltInServer({
        ...notKept,
        isUploadChosen: true,
        isUnreadableHere: true,
      });
      fireEvent.click(await screen.findByRole("button"));
      expect(await screen.findByText("Downloading…")).toBeTruthy();
    });

    it("shows nothing while the built-in server is not linked", async () => {
      const client = renderOnBuiltInServer(notKept, null);
      await waitFor(() =>
        expect(requestsTo(client.requests, "GET", "/sync/status")).toHaveLength(
          1,
        ),
      );
      expect(screen.queryByRole("checkbox")).toBeNull();
    });
  });

  describe("connected to a server that keeps copies", () => {
    it("uploads a file this browser holds", async () => {
      const client = renderOnAccountServer(inBrowser);
      fireEvent.click(
        await screen.findByRole("button", {
          name: "Upload to media.example.org",
        }),
      );
      await waitFor(() =>
        expect(
          requestsTo(
            client.requests,
            "PUT",
            "/projects/p1/media/m2/stored-copy",
          ),
        ).toHaveLength(1),
      );
    });

    it("tells that the upload is under way", async () => {
      renderOnAccountServer(inBrowser);
      fireEvent.click(await screen.findByRole("button"));
      expect(await screen.findByText("Uploading…")).toBeTruthy();
    });

    it("tells to add a file again that the browser no longer holds", async () => {
      renderOnAccountServer({ ...notKept, browserFile: "gone" });
      const button = await screen.findByRole("button", {
        name: "Upload to media.example.org",
      });
      expect(button.getAttribute("aria-describedby")).toBe("m2-upload-hint");
    });

    it("tells that the server keeps a copy", async () => {
      renderOnAccountServer({ ...inBrowser, hasStoredCopy: true });
      expect(await screen.findByText("Kept on media.example.org")).toBeTruthy();
    });

    it("removes the server's copy", async () => {
      const client = renderOnAccountServer({
        ...inBrowser,
        isUploadChosen: true,
        hasStoredCopy: true,
      });
      fireEvent.click(
        await screen.findByRole("button", {
          name: "Remove from media.example.org",
        }),
      );
      await waitFor(() =>
        expect(
          requestsTo(
            client.requests,
            "PUT",
            "/projects/p1/media/m2/upload-choice",
          ).map(bodyOf),
        ).toEqual([{ is_upload_chosen: false }]),
      );
    });

    it("shows nothing when the server keeps no copies of media files", async () => {
      const client = renderOnAccountServer(
        inBrowser,
        fixtureStorageStatus([], 0),
      );
      await waitFor(() =>
        expect(requestsTo(client.requests, "GET", "/storage")).toHaveLength(1),
      );
      expect(screen.queryByRole("button")).toBeNull();
    });

    it("shows nothing for a file at a path on the server", async () => {
      const client = renderOnAccountServer(notKept);
      await waitFor(() =>
        expect(
          requestsTo(client.requests, "GET", "/projects/p1/media"),
        ).toHaveLength(1),
      );
      expect(screen.queryByRole("button")).toBeNull();
    });
  });
});
