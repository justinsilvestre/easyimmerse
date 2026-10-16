import { describe, expect, it } from "vitest";
import type { AppAction } from "../app/appAction.ts";
import { actions } from "../app/appAction.ts";
import { stateAfterWithCache } from "../app/stateAfter.ts";
import { serverCacheWith } from "../server/serverCacheWith.ts";
import { ankiCache, ankiFlashcard, openOverview } from "./ankiTestSupport.ts";
import {
  selectAnkiExport,
  selectIsAnkiConnectSetupOpen,
} from "./selectAnkiExport.ts";

const backend = ankiCache(false);

const rootAfter = (...actions: AppAction[]) => ({
  app: stateAfterWithCache(backend, openOverview, ...actions),
  backend,
});

describe("selectAnkiExport", () => {
  it("is null while the dialog is closed", () => {
    expect(selectAnkiExport(rootAfter())).toBeNull();
  });

  it("counts the new and changed and all cards of every media file", () => {
    expect(
      selectAnkiExport(rootAfter(actions.ankiExportOpened())),
    ).toMatchObject({ newAndChangedCount: 2, allCount: 3 });
  });

  it("counts a card edited since it was exported among the new and changed", () => {
    const edited = ankiCache(false, [
      ankiFlashcard("f1", "m1", 1, { exportedAtMs: 10, updatedAtMs: 11 }),
      ankiFlashcard("f2", "m1", 2, { exportedAtMs: 10 }),
    ]);
    expect(
      selectAnkiExport({
        app: stateAfterWithCache(
          edited,
          openOverview,
          actions.ankiExportOpened(),
        ),
        backend: edited,
      }),
    ).toMatchObject({ newAndChangedCount: 1 });
  });

  it("leaves a card sent through AnkiConnect since its last edit out of the queued cards", () => {
    const sent = ankiCache(false, [
      ankiFlashcard("f1", "m1", 1, {
        exportedAtMs: 10,
        updatedAtMs: 11,
        sentAtMs: 12,
      }),
      ankiFlashcard("f2", "m1", 2),
    ]);
    expect(
      selectAnkiExport({
        app: stateAfterWithCache(
          sent,
          openOverview,
          actions.ankiExportOpened(),
        ),
        backend: sent,
      }),
    ).toMatchObject({ newAndChangedCount: 1 });
  });

  it("counts the exported cards that AnkiConnect sent before any export marked them", () => {
    const sent = ankiCache(false, [
      ankiFlashcard("f1", "m1", 1, { sentAtMs: 5 }),
      ankiFlashcard("f2", "m1", 2, { sentAtMs: 5, exportedAtMs: 4 }),
      ankiFlashcard("f3", "m1", 3),
    ]);
    expect(
      selectAnkiExport({
        app: stateAfterWithCache(
          sent,
          openOverview,
          actions.ankiExportOpened(),
          actions.ankiExportScopeChosen("all"),
        ),
        backend: sent,
      }),
    ).toMatchObject({ duplicateCount: 1 });
  });

  it("counts no duplicate for a card AnkiConnect sent as it now is, which the queued cards leave out", () => {
    const sent = ankiCache(false, [
      ankiFlashcard("f1", "m1", 1, { sentAtMs: 5 }),
    ]);
    expect(
      selectAnkiExport({
        app: stateAfterWithCache(
          sent,
          openOverview,
          actions.ankiExportOpened(),
        ),
        backend: sent,
      }),
    ).toMatchObject({ duplicateCount: 0 });
  });

  it("counts a queued card that AnkiConnect sent before any export as a duplicate", () => {
    const sent = ankiCache(false, [
      ankiFlashcard("f1", "m1", 1, { sentAtMs: 5, updatedAtMs: 6 }),
    ]);
    expect(
      selectAnkiExport({
        app: stateAfterWithCache(
          sent,
          openOverview,
          actions.ankiExportOpened(),
        ),
        backend: sent,
      }),
    ).toMatchObject({ duplicateCount: 1 });
  });

  it("counts the deletions an export marking its cards would mark", () => {
    const deleted = serverCacheWith(
      "listAnkiPendingDeletions",
      "p1",
      {
        deletions: [
          {
            flashcard_id: "f8",
            word: "a",
            requested_at_ms: 1,
            reached_by_package: true,
            reached_by_anki_connect: false,
          },
          {
            flashcard_id: "f9",
            word: "b",
            requested_at_ms: 2,
            reached_by_package: false,
            reached_by_anki_connect: true,
          },
          {
            flashcard_id: "f7",
            word: "c",
            requested_at_ms: 3,
            reached_by_package: true,
            reached_by_anki_connect: true,
          },
        ],
      },
      ankiCache(false),
    );
    expect(
      selectAnkiExport({
        app: stateAfterWithCache(
          deleted,
          openOverview,
          actions.ankiExportOpened(),
        ),
        backend: deleted,
      }),
    ).toMatchObject({ markCount: 1 });
  });

  it("counts only the cards of the ticked media files", () => {
    expect(
      selectAnkiExport(
        rootAfter(
          actions.ankiExportOpened(),
          actions.ankiExportMediaToggled("m1"),
        ),
      ),
    ).toMatchObject({ newAndChangedCount: 0, allCount: 1 });
  });
});

describe("selectIsAnkiConnectSetupOpen", () => {
  it("is true while the setup dialog is open", () => {
    expect(
      selectIsAnkiConnectSetupOpen(rootAfter(actions.ankiConnectSetupOpened())),
    ).toBe(true);
  });
});
