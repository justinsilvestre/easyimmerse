import { describe, expect, it } from "vitest";
import { actions } from "../../app/appAction.ts";
import {
  applyToMediaScreen as apply,
  applyToMediaScreenIn,
  mediaScreenAfter,
} from "../mediaScreen/mediaScreenTestSupport.ts";

const later = { chapterIndex: 1, paragraphIndex: 4, offset: 12 };

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
  });
});
