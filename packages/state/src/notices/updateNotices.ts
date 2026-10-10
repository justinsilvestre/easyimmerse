import type { Effect } from "../app/effect.ts";
import type { Feature, FeatureUpdate } from "../app/feature.ts";
import { updated } from "../app/updated.ts";
import { copyOutcomeNotice } from "./copyOutcomeNotice.ts";
import { noticesActions } from "./noticesActions.ts";
import {
  initialNoticesState,
  type Notice,
  type NoticeContent,
  type NoticeHold,
  type NoticesState,
} from "./noticesState.ts";

/** How long a transient notice stays: long enough to read it and reach its buttons, as WCAG's timing guidance asks. */
const expiryMs = 10_000;

/**
 * Shows, holds and removes the notices. A transient notice expires through a timer that a hold cancels and a release restarts.
 * A notice requested with a key replaces the shown notice of that key. Removing a notice leaves its timer running;
 * the stale expiry then finds no notice with its id, since ids are never reused.
 */
export const updateNotices: FeatureUpdate<NoticesState> = (state, action) => {
  switch (action.type) {
    case "noticeRequested":
      return show(state, action.content);
    case "noticeHeld":
      return holdChanged(state, action.id, action.by, true);
    case "noticeReleased":
      return holdChanged(state, action.id, action.by, false);
    case "noticeExpired":
    case "noticeDismissed":
    case "noticeButtonChosen":
      return updated(without(state, (notice) => notice.id === action.id));
    case "noticeWithdrawn":
      return updated(without(state, (notice) => notice.key === action.key));
    case "textCopied":
    case "textCopyFailed":
      return show(state, copyOutcomeNotice(action));
    default:
      return updated(state);
  }
};

/** Shows a notice, in place of the shown notice of its key, and starts its expiry timer when it is transient. */
function show(state: NoticesState, content: NoticeContent) {
  const notice: Notice = {
    ...content,
    id: state.nextId,
    heldBy: { pointer: false, focus: false },
  };
  const { key } = notice;
  const others = state.shown.filter(
    (shown) => key === undefined || shown.key !== key,
  );
  return updated(
    { shown: [...others, notice], nextId: state.nextId + 1 },
    ...expiryTimerFor(notice),
  );
}

/** The notices as a feature. */
export const noticesFeature: Feature<NoticesState> = {
  initialState: initialNoticesState,
  update: updateNotices,
};

/** Records a change of hold, ignoring one that changes nothing, and cancels the expiry of a held transient notice or restarts it once nothing holds it. */
function holdChanged(
  state: NoticesState,
  id: number,
  by: NoticeHold,
  isHeld: boolean,
) {
  const notice = state.shown.find((shown) => shown.id === id);
  if (!notice || notice.heldBy[by] === isHeld) return updated(state);
  const changed = { ...notice, heldBy: { ...notice.heldBy, [by]: isHeld } };
  const shown = state.shown.map((each) => (each === notice ? changed : each));
  return updated(
    { ...state, shown },
    ...(isHeld ? cancelExpiryOf(changed) : expiryTimerFor(changed)),
  );
}

/** Starts the expiry timer of a transient notice that nothing holds. */
function expiryTimerFor(notice: Notice) {
  const isHeld = notice.heldBy.pointer || notice.heldBy.focus;
  if (!notice.isTransient || isHeld) return [];
  const action = noticesActions.noticeExpired(notice.id);
  const id = expiryTimerId(notice.id);
  return [{ type: "startTimer", id, ms: expiryMs, action }] satisfies Effect[];
}

function cancelExpiryOf(notice: Notice) {
  return notice.isTransient
    ? ([
        { type: "cancelTimer", id: expiryTimerId(notice.id) },
      ] satisfies Effect[])
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
