import { describe, expect, it } from "vitest";
import { actions } from "../../app/appAction.ts";
import { stateAfter } from "../../app/stateAfter.ts";
import {
  applyToMediaScreen as apply,
  applyToMediaScreenIn,
  mediaScreenAfter,
} from "../mediaScreen/mediaScreenTestSupport.ts";
import type { MediaScreenState } from "../screenState.ts";

const later = { chapterIndex: 1, paragraphIndex: 4, offset: 12 };
const translationPlace = { chapterIndex: 0, paragraphIndex: 2, offset: 0 };

describe("updateMediaScreen", () => {
  describe("for the reader", () => {
    it("counts every jump", () => {
      const jumped = actions.readerJumped("b1", later);
      const [screen] = apply(jumped, jumped);
      expect(screen.reader.jumpCount).toBe(2);
    });

    it("does not count a reported location as a jump", () => {
      const before = mediaScreenAfter();
      const [screen] = applyToMediaScreenIn(
        before,
        actions.readingLocationReported("b1", later),
      );
      expect(screen.reader).toBe(before.screen.reader);
    });

    it("counts a chosen match as a jump", () => {
      const [screen] = apply(actions.readerMatchChosen("b1", 3, later));
      expect(screen.reader.jumpCount).toBe(1);
    });

    it("marks the chosen match as active", () => {
      const [screen] = apply(actions.readerMatchChosen("b1", 3, later));
      expect(screen.reader.search.activeMatchIndex).toBe(3);
    });

    it("forgets the chosen match when the query changes", () => {
      const [screen] = apply(
        actions.readerSearchChanged("Tisch"),
        actions.readerMatchChosen("b1", 3, later),
      );
      expect(screen.reader.search.activeMatchIndex).toBeNull();
    });

    it("closes a panel when it is toggled again", () => {
      const toggled = actions.readerPanelToggled("contents");
      const [screen] = apply(toggled, toggled);
      expect(screen.reader.panel).toBeNull();
    });

    it("keeps a panel open when it is opened again", () => {
      const opened = actions.readerPanelOpened("search");
      const [screen] = apply(opened, opened);
      expect(screen.reader.panel).toBe("search");
    });

    it("keeps the chrome while a panel is open", () => {
      const [screen] = apply(
        actions.readerChromeHidden(),
        actions.readerPanelToggled("search"),
      );
      expect(screen.reader.isChromeVisible).toBe(true);
    });

    it("keeps the measured span", () => {
      const [screen] = apply(
        actions.readerNearSpanMeasured({ first: 2, last: 5 }),
      );
      expect(screen.reader.nearSpan).toEqual({ first: 2, last: 5 });
    });

    it("keeps the measured page", () => {
      const [screen] = apply(
        actions.readerPageMeasured({ page: 3, pageCount: 9 }),
      );
      expect(screen.reader.pageInfo).toEqual({ page: 3, pageCount: 9 });
    });

    it("shows the book's own text on opening", () => {
      const { screen } = mediaScreenAfter();
      expect(screen.reader.viewMode).toBe("target");
    });

    it("shows the chosen view", () => {
      const [screen] = apply(actions.readerViewModeChosen("interlinear"));
      expect(screen.reader.viewMode).toBe("interlinear");
    });

    it("counts a change of view as a jump", () => {
      const [screen] = apply(actions.readerViewModeChosen("translation"));
      expect(screen.reader.jumpCount).toBe(1);
    });

    it("opens the translation-only view at the place given", () => {
      const [screen] = apply(
        actions.readerViewModeChosen("translation", translationPlace),
      );
      expect(screen.reader.translationLocation).toEqual(translationPlace);
    });

    it("keeps the translation's place when the view is changed without one", () => {
      const [screen] = apply(
        actions.readerViewModeChosen("translation"),
        actions.readerViewModeChosen("target"),
        actions.readerTranslationLocationReported(translationPlace),
      );
      expect(screen.reader.translationLocation).toEqual(translationPlace);
    });

    it("forgets the chosen match when the view changes", () => {
      const [screen] = apply(
        actions.readerViewModeChosen("translation"),
        actions.readerMatchChosen("m1", 3, later),
      );
      expect(screen.reader.search.activeMatchIndex).toBeNull();
    });

    it("keeps the place the translation-only view reported", () => {
      const [screen] = apply(
        actions.readerTranslationLocationReported(translationPlace),
      );
      expect(screen.reader.translationLocation).toEqual(translationPlace);
    });

    it("does not count a place the translation-only view reported as a jump", () => {
      const [screen] = apply(
        actions.readerTranslationLocationReported(translationPlace),
      );
      expect(screen.reader.jumpCount).toBe(0);
    });

    it("moves the translation-only view to the place jumped to", () => {
      const [screen] = apply(actions.readerTranslationJumped(translationPlace));
      expect(screen.reader.translationLocation).toEqual(translationPlace);
    });

    it("counts a jump in the translation-only view", () => {
      const [screen] = apply(actions.readerTranslationJumped(translationPlace));
      expect(screen.reader.jumpCount).toBe(1);
    });

    it("marks a match chosen in the translation-only view as active", () => {
      const [screen] = apply(
        actions.readerTranslationJumped(translationPlace, 2),
      );
      expect(screen.reader.search.activeMatchIndex).toBe(2);
    });

    it("shows the book's own text again when its translation is changed", () => {
      const [screen] = apply(
        actions.readerTranslationChosen("p1", "m1", null),
        actions.readerViewModeChosen("interlinear"),
      );
      expect(screen.reader.viewMode).toBe("target");
    });

    it("shows the book's own text again when another file opens", () => {
      const app = stateAfter(
        actions.openMediaFileRequested("p1", "m1"),
        actions.readerViewModeChosen("parallel"),
        actions.openMediaFileRequested("p1", "m2"),
      );
      expect((app.screen.main as MediaScreenState).reader.viewMode).toBe(
        "target",
      );
    });

    it("keeps the reader's state when the measured page is unchanged", () => {
      const measured = actions.readerPageMeasured({ page: 3, pageCount: 9 });
      const before = mediaScreenAfter(measured);
      const [screen] = applyToMediaScreenIn(before, measured);
      expect(screen.reader).toBe(before.screen.reader);
    });
  });
});
