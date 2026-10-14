import { describe, expect, it } from "vitest";
import type { AppAction } from "../app/appAction.ts";
import { actions } from "../app/appAction.ts";
import { stateAfterWithCache } from "../app/stateAfter.ts";
import { update } from "../app/update.ts";
import type { RequestOutcome } from "../server/serverRequest.ts";
import { openedAnkiExport } from "./ankiExportDialog.ts";
import type { AnkiPackageExport } from "./ankiResponses.ts";
import { ankiCache, openOverview } from "./ankiTestSupport.ts";

const backend = ankiCache("anki_package");

const after = (...actions: AppAction[]) =>
  stateAfterWithCache(backend, openOverview, ...actions);

const effectsOf = (action: AppAction, ...before: AppAction[]) =>
  update(after(...before), action, backend)[1];

const dialogAfter = (...actions: AppAction[]) => {
  const { main } = after(...actions).screen;
  return main.kind === "project" ? main.ankiExport : undefined;
};

const noticesAfter = (...actions: AppAction[]) =>
  after(...actions).notices.shown.map(({ message }) => message);

const confirmed = [actions.ankiExportOpened(), actions.ankiExportConfirmed()];

const exportRequest = (savePath: string | null) =>
  ({
    kind: "exportAnkiPackage",
    projectId: "p1",
    flashcardIds: ["f3", "f1"],
    savePath,
  }) as const;

const exported = (outcome: RequestOutcome<"exportAnkiPackage">) =>
  actions.requestSettled(
    "project/p1/ankiExport",
    exportRequest("/decks/Korean.apkg"),
    outcome,
  );

const saved = (skippedMediaCount = 0): AnkiPackageExport => ({
  kind: "saved",
  flashcardCount: 2,
  skippedMediaCount,
});

const packageBytes = new Uint8Array([1, 2]);

const downloaded: AnkiPackageExport = {
  kind: "downloaded",
  fileName: "Korean.apkg",
  bytes: packageBytes,
  flashcardCount: 2,
  skippedMediaCount: 0,
};

const failed = {
  ok: false,
  error: { status: 500, message: "the disk is full" },
} as const;

describe("updateAnkiExport", () => {
  it("opens on the new cards of every media file", () => {
    expect(dialogAfter(actions.ankiExportOpened())).toEqual(openedAnkiExport);
  });

  it("takes the chosen scope", () => {
    expect(
      dialogAfter(
        actions.ankiExportOpened(),
        actions.ankiExportScopeChosen("all"),
      )?.scope,
    ).toBe("all");
  });

  it("leaves out the cards of a cleared media file", () => {
    expect(
      dialogAfter(
        actions.ankiExportOpened(),
        actions.ankiExportMediaToggled("m1"),
      )?.mediaFileIds,
    ).toEqual(["m2"]);
  });

  it("includes every card again once every media file is ticked", () => {
    expect(
      dialogAfter(
        actions.ankiExportOpened(),
        actions.ankiExportMediaToggled("m1"),
        actions.ankiExportMediaToggled("m1"),
      )?.mediaFileIds,
    ).toBeNull();
  });

  it("asks where to save a package named after the project", () => {
    expect(
      effectsOf(actions.ankiExportConfirmed(), actions.ankiExportOpened()),
    ).toEqual([{ type: "pickSavePath", suggestedFileName: "Korean.apkg" }]);
  });

  it("is busy once Export is pressed", () => {
    expect(dialogAfter(...confirmed)?.isBusy).toBe(true);
  });

  it("asks for no path when the choices include no card", () => {
    expect(
      effectsOf(
        actions.ankiExportConfirmed(),
        actions.ankiExportOpened(),
        actions.ankiExportMediaToggled("m1"),
      ),
    ).toEqual([]);
  });

  it("exports the chosen cards, oldest first, to the picked path", () => {
    expect(
      effectsOf(
        actions.ankiExportPathPicked({
          kind: "path",
          path: "/decks/Korean.apkg",
        }),
        ...confirmed,
      ),
    ).toEqual([
      {
        type: "sendRequest",
        id: "project/p1/ankiExport",
        request: exportRequest("/decks/Korean.apkg"),
      },
    ]);
  });

  it("asks for the package's bytes where the platform has no save dialog", () => {
    expect(
      effectsOf(
        actions.ankiExportPathPicked({ kind: "unsupported" }),
        ...confirmed,
      ),
    ).toEqual([
      {
        type: "sendRequest",
        id: "project/p1/ankiExport",
        request: exportRequest(null),
      },
    ]);
  });

  it("is no longer busy once the save dialog is cancelled", () => {
    expect(
      dialogAfter(
        ...confirmed,
        actions.ankiExportPathPicked({ kind: "cancelled" }),
      )?.isBusy,
    ).toBe(false);
  });

  it("closes once the package is exported", () => {
    expect(
      dialogAfter(...confirmed, exported({ ok: true, data: saved() })),
    ).toBeNull();
  });

  it("tells how many cards were exported", () => {
    expect(
      noticesAfter(...confirmed, exported({ ok: true, data: saved() })),
    ).toEqual(["Exported 2 flashcards to Anki."]);
  });

  it("tells how many audio clips and screenshots were left out", () => {
    expect(
      noticesAfter(...confirmed, exported({ ok: true, data: saved(3) })),
    ).toEqual([
      "Exported 2 flashcards to Anki. 3 audio clips or screenshots could not be included.",
    ]);
  });

  it("downloads a package that came back as a file", () => {
    expect(
      effectsOf(exported({ ok: true, data: downloaded }), ...confirmed),
    ).toContainEqual({
      type: "downloadFile",
      fileName: "Korean.apkg",
      bytes: packageBytes,
    });
  });

  it("stays open, no longer busy, when the export fails", () => {
    expect(dialogAfter(...confirmed, exported(failed))?.isBusy).toBe(false);
  });

  it("tells why the export failed", () => {
    expect(noticesAfter(...confirmed, exported(failed))).toEqual([
      "The Anki package could not be exported: the disk is full",
    ]);
  });

  it("stops the export under way when closed", () => {
    expect(effectsOf(actions.ankiExportClosed(), ...confirmed)).toContainEqual({
      type: "abortRequest",
      id: "project/p1/ankiExport",
    });
  });

  it("ignores a path picked once the dialog is closed", () => {
    expect(
      effectsOf(
        actions.ankiExportPathPicked({ kind: "unsupported" }),
        ...confirmed,
        actions.ankiExportClosed(),
      ),
    ).toEqual([]);
  });
});
