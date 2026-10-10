import { describe, expect, it } from "vitest";
import type { AppAction } from "../app/appAction.ts";
import { actions } from "../app/appAction.ts";
import { stateAfter } from "../app/stateAfter.ts";
import type { NoticeContent } from "./noticesState.ts";
import { updateNotices } from "./updateNotices.ts";

const transient: NoticeContent = {
  tone: "success",
  message: "Saved",
  buttons: [],
  isTransient: true,
};
const lasting: NoticeContent = {
  ...transient,
  tone: "danger",
  isTransient: false,
};

const expiryOf1 = {
  type: "startTimer",
  id: "notices/expiry/1",
  ms: 10_000,
  action: actions.noticeExpired(1),
};
const cancelExpiryOf1 = { type: "cancelTimer", id: "notices/expiry/1" };

/** Applies `action` to the notices after the actions `before`. */
const apply = (before: readonly AppAction[], action: AppAction) => {
  const app = stateAfter(...before);
  return updateNotices(app.notices, action, app);
};

const messagesAfter = (...actionsDone: AppAction[]) =>
  stateAfter(...actionsDone).notices.shown.map((notice) => notice.message);

describe("updateNotices", () => {
  describe("for noticeRequested", () => {
    it("shows the notice", () => {
      expect(messagesAfter(actions.noticeRequested(transient))).toEqual([
        "Saved",
      ]);
    });

    it("starts the expiry timer for a transient notice", () => {
      const [, effects] = apply([], actions.noticeRequested(transient));
      expect(effects).toEqual([expiryOf1]);
    });

    it("starts no timer for a lasting notice", () => {
      const [, effects] = apply([], actions.noticeRequested(lasting));
      expect(effects).toEqual([]);
    });

    it("replaces the shown notice of the same key", () => {
      const keyed = { ...transient, key: "saveUndo:f1" };
      const messages = messagesAfter(
        actions.noticeRequested({ ...keyed, message: "First" }),
        actions.noticeRequested({ ...transient, message: "Other" }),
        actions.noticeRequested({ ...keyed, message: "Second" }),
      );
      expect(messages).toEqual(["Other", "Second"]);
    });
  });

  describe("for noticeHeld", () => {
    it("cancels the expiry timer of a transient notice", () => {
      const [, effects] = apply(
        [actions.noticeRequested(transient)],
        actions.noticeHeld(1, "pointer"),
      );
      expect(effects).toEqual([cancelExpiryOf1]);
    });

    it("returns no effect for a lasting notice", () => {
      const [, effects] = apply(
        [actions.noticeRequested(lasting)],
        actions.noticeHeld(1, "focus"),
      );
      expect(effects).toEqual([]);
    });
  });

  describe("for noticeReleased", () => {
    it("restarts the expiry timer once nothing holds the notice", () => {
      const [, effects] = apply(
        [actions.noticeRequested(transient), actions.noticeHeld(1, "pointer")],
        actions.noticeReleased(1, "pointer"),
      );
      expect(effects).toEqual([expiryOf1]);
    });

    it("starts no timer while focus still holds the notice", () => {
      const [, effects] = apply(
        [
          actions.noticeRequested(transient),
          actions.noticeHeld(1, "pointer"),
          actions.noticeHeld(1, "focus"),
        ],
        actions.noticeReleased(1, "pointer"),
      );
      expect(effects).toEqual([]);
    });

    describe("of a hold never taken", () => {
      const before = [actions.noticeRequested(transient)];
      const release = actions.noticeReleased(1, "focus");

      it("keeps the same state", () => {
        const app = stateAfter(...before);
        const [notices] = updateNotices(app.notices, release, app);
        expect(notices).toBe(app.notices);
      });

      it("starts no timer", () => {
        const [, effects] = apply(before, release);
        expect(effects).toEqual([]);
      });
    });

    it("leaves the state as it is for a notice no longer shown", () => {
      const app = stateAfter(
        actions.noticeRequested(transient),
        actions.noticeDismissed(1),
      );
      const [notices] = updateNotices(
        app.notices,
        actions.noticeReleased(1, "pointer"),
        app,
      );
      expect(notices).toBe(app.notices);
    });
  });

  it("removes the notice when its expiry timer fires", () => {
    const messages = messagesAfter(
      actions.noticeRequested(transient),
      actions.noticeExpired(1),
    );
    expect(messages).toEqual([]);
  });

  it("removes the notice the user dismissed", () => {
    const messages = messagesAfter(
      actions.noticeRequested(transient),
      actions.noticeRequested({ ...transient, message: "Other" }),
      actions.noticeDismissed(1),
    );
    expect(messages).toEqual(["Other"]);
  });

  it("removes the notice whose button was chosen", () => {
    const messages = messagesAfter(
      actions.noticeRequested(transient),
      actions.noticeButtonChosen(1, actions.closeMedia()),
    );
    expect(messages).toEqual([]);
  });

  describe("for noticeWithdrawn", () => {
    it("removes the notice of its key", () => {
      const messages = messagesAfter(
        actions.noticeRequested({ ...transient, key: "saveRefused:f1" }),
        actions.noticeRequested({ ...transient, message: "Other" }),
        actions.noticeWithdrawn("saveRefused:f1"),
      );
      expect(messages).toEqual(["Other"]);
    });

    it("leaves the state as it is when no notice has the key", () => {
      const app = stateAfter(actions.noticeRequested(transient));
      const [notices] = updateNotices(
        app.notices,
        actions.noticeWithdrawn("saveUndo:f1"),
        app,
      );
      expect(notices).toBe(app.notices);
    });
  });
});
