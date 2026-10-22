import { cleanup, fireEvent, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import {
  builtInServerOn,
  createBuiltInServerClient,
} from "../testSupport/createBuiltInServerClient.ts";
import type { FakeResponse } from "../testSupport/createFakeBackendClient.ts";
import { createFakeBackendClient } from "../testSupport/createFakeBackendClient.ts";
import {
  fixtureResponses,
  fixtureSyncLink,
} from "../testSupport/fixtureResponses.ts";
import { bodyOf, requestsTo } from "../testSupport/renderMediaScreen.tsx";
import { renderWithAppStore } from "../testSupport/renderWithAppStore.tsx";
import {
  accountServer,
  createAccountServerClient,
  fixtureStorageStatus,
  fixtureStoredCopies,
} from "../testSupport/storageFixtures.ts";
import { CloudStorageSection } from "./CloudStorageSection.tsx";

afterEach(cleanup);

/** Renders the section connected as an account to a server that reports the storage status given. */
function renderOnAccountServer(storage: FakeResponse) {
  const client = createAccountServerClient(storage, {
    "PUT /projects/p1/media/m1/upload-choice":
      fixtureResponses["GET /projects/p1/media"].media_files[0],
  });
  renderWithAppStore(<CloudStorageSection />, client, {
    server: accountServer,
  });
  return client;
}

const withFiles = fixtureStorageStatus(fixtureStoredCopies);

describe("CloudStorageSection", () => {
  describe("connected to a server as an account", () => {
    it("tells how much of the quota is used", async () => {
      renderOnAccountServer(withFiles);
      expect(await screen.findByText("1.6 GB of 10 GB used")).toBeTruthy();
    });

    it("tells how much is used on a server without a quota", async () => {
      renderOnAccountServer(fixtureStorageStatus(fixtureStoredCopies, null));
      expect(await screen.findByText("1.6 GB used")).toBeTruthy();
    });

    it("lists each copy with its project and size", async () => {
      renderOnAccountServer(withFiles);
      expect(await screen.findByText("Spanish practice · 4.8 MB")).toBeTruthy();
    });

    it("tells when the server keeps no copies yet", async () => {
      renderOnAccountServer(fixtureStorageStatus([]));
      expect(
        await screen.findByText(
          "No media files are kept on media.example.org.",
        ),
      ).toBeTruthy();
    });

    it("tells when the server keeps no copies of media files at all", async () => {
      renderOnAccountServer(fixtureStorageStatus([], 0));
      expect(
        await screen.findByText(
          "media.example.org doesn't keep copies of media files.",
        ),
      ).toBeTruthy();
    });

    it("asks before deleting a copy", async () => {
      renderOnAccountServer(withFiles);
      fireEvent.click(
        await screen.findByRole("button", {
          name: "Delete episode.mkv from media.example.org",
        }),
      );
      expect(
        screen.getByText(
          "Delete from media.example.org? episode.mkv stays on this device, if it is here.",
        ),
      ).toBeTruthy();
    });

    it("turns off the choice to keep the copy once the deletion is confirmed", async () => {
      const client = renderOnAccountServer(withFiles);
      fireEvent.click(
        await screen.findByRole("button", {
          name: "Delete episode.mkv from media.example.org",
        }),
      );
      fireEvent.click(screen.getByRole("button", { name: "Delete" }));
      await waitFor(() =>
        expect(
          requestsTo(
            client.requests,
            "PUT",
            "/projects/p1/media/m1/upload-choice",
          ).map(bodyOf),
        ).toEqual([{ is_upload_chosen: false }]),
      );
    });

    it("keeps the copy when the person changes their mind", async () => {
      renderOnAccountServer(withFiles);
      fireEvent.click(
        await screen.findByRole("button", {
          name: "Delete episode.mkv from media.example.org",
        }),
      );
      fireEvent.click(screen.getByRole("button", { name: "Keep" }));
      expect(screen.queryByText(/stays on this device/)).toBeNull();
    });
  });

  it("shows nothing for the server's own launch token", async () => {
    const client = createFakeBackendClient({
      ...fixtureResponses,
      "GET /auth/me": { kind: "launch" },
      "GET /storage": withFiles,
    });
    renderWithAppStore(<CloudStorageSection />, client, {
      server: accountServer,
    });
    await waitFor(() =>
      expect(requestsTo(client.requests, "GET", "/auth/me")).toHaveLength(1),
    );
    expect(screen.queryByRole("heading")).toBeNull();
  });

  it("shows nothing while the app runs offline", () => {
    renderWithAppStore(<CloudStorageSection />);
    expect(screen.queryByRole("heading")).toBeNull();
  });

  describe("on the native app's built-in server", () => {
    it("shows the storage of the account it is linked to", async () => {
      const client = createBuiltInServerClient(fixtureSyncLink, {
        "GET /sync/remote/storage": withFiles,
      });
      renderWithAppStore(<CloudStorageSection />, client, {
        server: builtInServerOn("desktop"),
      });
      expect(
        await screen.findByRole("heading", {
          name: "Storage on cloud.example.org",
        }),
      ).toBeTruthy();
    });

    it("shows nothing while it is not linked", async () => {
      const client = createBuiltInServerClient(null);
      renderWithAppStore(<CloudStorageSection />, client, {
        server: builtInServerOn("desktop"),
      });
      await waitFor(() =>
        expect(requestsTo(client.requests, "GET", "/sync/status")).toHaveLength(
          1,
        ),
      );
      expect(screen.queryByRole("heading")).toBeNull();
    });
  });
});
