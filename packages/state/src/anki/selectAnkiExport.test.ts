import { describe, expect, it } from "vitest";
import type { AppAction } from "../app/appAction.ts";
import { actions } from "../app/appAction.ts";
import { stateAfterWithCache } from "../app/stateAfter.ts";
import { ankiCache, openOverview } from "./ankiTestSupport.ts";
import {
  selectAnkiExport,
  selectIsAnkiConnectSetupOpen,
} from "./selectAnkiExport.ts";

const backend = ankiCache("anki_package");

const rootAfter = (...actions: AppAction[]) => ({
  app: stateAfterWithCache(backend, openOverview, ...actions),
  backend,
});

describe("selectAnkiExport", () => {
  it("is null while the dialog is closed", () => {
    expect(selectAnkiExport(rootAfter())).toBeNull();
  });

  it("counts the new and all cards of every media file", () => {
    expect(
      selectAnkiExport(rootAfter(actions.ankiExportOpened())),
    ).toMatchObject({ newCount: 2, allCount: 3 });
  });

  it("counts only the cards of the ticked media files", () => {
    expect(
      selectAnkiExport(
        rootAfter(
          actions.ankiExportOpened(),
          actions.ankiExportMediaToggled("m1"),
        ),
      ),
    ).toMatchObject({ newCount: 0, allCount: 1 });
  });
});

describe("selectIsAnkiConnectSetupOpen", () => {
  it("is true while the setup dialog is open", () => {
    expect(
      selectIsAnkiConnectSetupOpen(rootAfter(actions.ankiConnectSetupOpened())),
    ).toBe(true);
  });
});
