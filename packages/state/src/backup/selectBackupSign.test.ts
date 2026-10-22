import type { Project, SyncLink, SyncLinkState } from "@easyimmerse/types";
import { describe, expect, it } from "vitest";
import { actions } from "../app/appAction.ts";
import type { AppState } from "../app/appState.ts";
import {
  appAfter,
  applied,
  createNew,
  failure,
  hund,
  selectRequestIds,
  settle,
  typeWord,
} from "../flashcards/flashcardsTestSupport.ts";
import type { ServerCacheSlice } from "../server/cacheEntry.ts";
import {
  emptyServerCache,
  serverCacheWith,
} from "../server/serverCacheWith.ts";
import type { ServerConfig } from "../server/serverState.ts";
import { selectBackupSign } from "./selectBackupSign.ts";

const accountServer: ServerConfig = {
  serverUrl: "https://books.example.org",
  token: "t",
};

const desktopServer: ServerConfig = {
  serverUrl: "http://127.0.0.1:4000",
  token: "launch",
  bundledIn: "desktop",
};

const withServer = (
  app: AppState,
  config: ServerConfig,
  cloudUrl: string | null = null,
): AppState => ({ ...app, server: { config, cloudUrl } });

const withChangedHund = () =>
  appAfter(actions.flashcardOpened("h", hund), typeWord("Hündin"));

/** The app state after saving a new flashcard failed with a server error. */
function withFailedSave(config: ServerConfig): AppState {
  const sending = withServer(appAfter(createNew("f1")), config);
  const [id] = selectRequestIds(sending, "f1");
  if (!id) throw new Error("No save was sent.");
  return applied(sending, settle(sending, id, failure(500)));
}

const project = (id: string, isBackedUp: boolean) =>
  ({ id, is_backed_up: isBackedUp }) as Project;

const linkIn = (state: SyncLinkState): SyncLink => ({
  kind: "account",
  server_url: "https://cloud.example.org",
  account_email: "someone@example.org",
  account_role: "library_user",
  linked_at_ms: 0,
  last_synced_at_ms: null,
  pushed_through_seq: 0,
  state,
  transfer: null,
  refused_upload: null,
  conflicts: [],
  conflict_count: 0,
});

/** The server cache of a built-in server with the link, or none, listing the projects. */
const listedWith = (link: SyncLink | null, ...projects: Project[]) =>
  serverCacheWith(
    "getSyncStatus",
    undefined,
    { link, pulled_revision: 0, local_change_seq: 0 },
    serverCacheWith("listProjects", undefined, { projects }),
  );

/** The server cache of a built-in server without a link, listing the projects. */
const listed = (...projects: Project[]) => listedWith(null, ...projects);

const signOf = (app: AppState, backend: ServerCacheSlice = emptyServerCache) =>
  selectBackupSign({ app, backend });

describe("selectBackupSign", () => {
  describe("while the app runs without a server", () => {
    it("tells of work kept only in this browser while a flashcard waits to be saved", () => {
      expect(signOf(withChangedHund())).toEqual({ kind: "browserOnly" });
    });

    it("is hidden while no flashcard waits to be saved", () => {
      expect(signOf(appAfter())).toEqual({ kind: "hidden" });
    });
  });

  describe("while the app is connected to an account's server", () => {
    it("tells of failed saves while some exist", () => {
      expect(signOf(withFailedSave(accountServer))).toEqual({
        kind: "failedSaves",
      });
    });

    it("is hidden while a flashcard waits to be saved without having failed", () => {
      expect(signOf(withServer(withChangedHund(), accountServer))).toEqual({
        kind: "hidden",
      });
    });
  });

  describe("while the app runs on its built-in server", () => {
    it("tells of failed saves while some exist", () => {
      expect(
        signOf(withFailedSave(desktopServer), listed(project("p1", false))),
      ).toEqual({ kind: "failedSaves" });
    });

    it("is hidden while the built-in server has not reported whether it is linked", () => {
      expect(
        signOf(
          withServer(appAfter(), desktopServer),
          serverCacheWith("listProjects", undefined, {
            projects: [project("p1", false)],
          }),
        ),
      ).toEqual({ kind: "hidden" });
    });

    it("is hidden while no projects are cached", () => {
      expect(signOf(withServer(appAfter(), desktopServer))).toEqual({
        kind: "hidden",
      });
    });

    it("tells of work kept only on the device while a project is not backed up", () => {
      expect(
        signOf(
          withServer(appAfter(), desktopServer),
          listed(project("p1", true), project("p2", false)),
        ),
      ).toEqual({
        kind: "deviceOnly",
        platform: "desktop",
        hasOfficialServer: false,
      });
    });

    it("names the mobile app on a phone", () => {
      expect(
        signOf(
          withServer(appAfter(), { ...desktopServer, bundledIn: "mobile" }),
          listed(project("p1", false)),
        ),
      ).toMatchObject({ platform: "mobile" });
    });

    it("tells whether the easyImmerse cloud is offered", () => {
      expect(
        signOf(
          withServer(appAfter(), desktopServer, "https://cloud.example.org"),
          listed(project("p1", false)),
        ),
      ).toMatchObject({ hasOfficialServer: true });
    });

    it("is hidden while every project is backed up", () => {
      expect(
        signOf(
          withServer(appAfter(), desktopServer),
          listed(project("p1", true)),
        ),
      ).toEqual({ kind: "hidden" });
    });

    it("is hidden while there are no projects", () => {
      expect(signOf(withServer(appAfter(), desktopServer), listed())).toEqual({
        kind: "hidden",
      });
    });

    describe("while it is linked to a remote", () => {
      const notBackedUp = project("p1", false);

      it("tells of a remote that logged it out while a project is not backed up", () => {
        expect(
          signOf(
            withServer(appAfter(), desktopServer),
            listedWith(linkIn({ kind: "logged_out" }), notBackedUp),
          ),
        ).toEqual({
          kind: "loggedOut",
          platform: "desktop",
          serverUrl: "https://cloud.example.org",
          email: "someone@example.org",
        });
      });

      it("tells since when the remote could not be reached while a project is not backed up", () => {
        expect(
          signOf(
            withServer(appAfter(), desktopServer),
            listedWith(
              linkIn({ kind: "unreachable", since_ms: 1000 }),
              notBackedUp,
            ),
          ),
        ).toEqual({
          kind: "linkFailing",
          platform: "desktop",
          serverUrl: "https://cloud.example.org",
          sinceMs: 1000,
        });
      });

      it("tells of a remote that refused to sync while a project is not backed up", () => {
        expect(
          signOf(
            withServer(appAfter(), desktopServer),
            listedWith(
              linkIn({ kind: "failed", code: "storage", message: "" }),
              notBackedUp,
            ),
          ),
        ).toEqual({
          kind: "linkFailing",
          platform: "desktop",
          serverUrl: "https://cloud.example.org",
          sinceMs: null,
        });
      });

      it("is hidden while the link is idle, though a project is not backed up yet", () => {
        expect(
          signOf(
            withServer(appAfter(), desktopServer),
            listedWith(linkIn({ kind: "idle" }), notBackedUp),
          ),
        ).toEqual({ kind: "hidden" });
      });

      it("is hidden while syncing, though a project is not backed up yet", () => {
        expect(
          signOf(
            withServer(appAfter(), desktopServer),
            listedWith(linkIn({ kind: "syncing" }), notBackedUp),
          ),
        ).toEqual({ kind: "hidden" });
      });

      it("is hidden while the remote is unreachable but every project is backed up", () => {
        expect(
          signOf(
            withServer(appAfter(), desktopServer),
            listedWith(
              linkIn({ kind: "unreachable", since_ms: 1000 }),
              project("p1", true),
            ),
          ),
        ).toEqual({ kind: "hidden" });
      });
    });
  });
});
