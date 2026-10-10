import type { Effect } from "../app/effect.ts";
import type { Feature, FeatureUpdate } from "../app/feature.ts";
import { noticesActions } from "./noticesActions.ts";
import {
  initialNoticesState,
  type Notice,
  type NoticeHold,
  type NoticesState,
} from "./noticesState.ts";

/** How long a transient notice stays: long enough to read it and reach its buttons, as WCAG's timing guidance asks. */
const expiryMs = 10_000;

type Result = readonly [NoticesState, readonly Effect[]];

/**
 * Shows, holds and removes the notices. A transient notice expires through a timer that a hold cancels and a release restarts.
 * A notice requested with a key replaces the shown notice of that key. Removing a notice leaves its timer running;
 * the stale expiry then finds no notice with its id, since ids are never reused.
 */
export const updateNotices: FeatureUpdate<NoticesState> = (state, action) => {
  switch (action.type) {
    case "noticeRequested": {
      const notice: Notice = {
        ...action.content,
        id: state.nextId,
        heldBy: { pointer: false, focus: false },
      };
      const { key } = notice;
      const others = state.shown.filter(
        (shown) => key === undefined || shown.key !== key,
      );
      return [
        { shown: [...others, notice], nextId: state.nextId + 1 },
        expiryTimerFor(notice),
      ];
    }
    case "noticeHeld":
      return holdChanged(state, action.id, action.by, true);
    case "noticeReleased":
      return holdChanged(state, action.id, action.by, false);
    case "noticeExpired":
    case "noticeDismissed":
    case "noticeButtonChosen":
      return [without(state, (notice) => notice.id === action.id), []];
    case "noticeWithdrawn":
      return [without(state, (notice) => notice.key === action.key), []];
    default:
      return [state, []];
  }
};

/** The notices as a feature. */
export const noticesFeature: Feature<NoticesState> = {
  initialState: initialNoticesState,
  update: updateNotices,
};

/** Records a hold's change, and cancels the expiry of a held transient notice or restarts it once nothing holds it. */
function holdChanged(
  state: NoticesState,
  id: number,
  by: NoticeHold,
  isHeld: boolean,
): Result {
  const notice = state.shown.find((shown) => shown.id === id);
  if (!notice) return [state, []];
  const changed = { ...notice, heldBy: { ...notice.heldBy, [by]: isHeld } };
  const shown = state.shown.map((each) => (each === notice ? changed : each));
  return [
    { ...state, shown },
    isHeld ? cancelExpiryOf(changed) : expiryTimerFor(changed),
  ];
}

/** Starts the expiry timer of a transient notice that nothing holds. */
function expiryTimerFor(notice: Notice): readonly Effect[] {
  const isHeld = notice.heldBy.pointer || notice.heldBy.focus;
  if (!notice.isTransient || isHeld) return [];
  const action = noticesActions.noticeExpired(notice.id);
  const id = expiryTimerId(notice.id);
  return [{ type: "startTimer", id, ms: expiryMs, action }];
}

function cancelExpiryOf(notice: Notice): readonly Effect[] {
  return notice.isTransient
    ? [{ type: "cancelTimer", id: expiryTimerId(notice.id) }]
    : [];
}

const expiryTimerId = (noticeId: number) => `notices/expiry/${noticeId}`;

/** Removes the notices that match, keeping the same state when none does. */
function without(
  state: NoticesState,
  matches: (notice: Notice) => boolean,
): NoticesState {
  const shown = state.shown.filter((notice) => !matches(notice));
  return shown.length === state.shown.length ? state : { ...state, shown };
}
