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
 * A notice requested with a key replaces the shown notice of that key. Removing a notice cancels its timer.
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
      return without(state, (notice) => notice.id === action.id);
    case "noticeWithdrawn":
      return without(state, (notice) => notice.key === action.key);
    case "textCopied":
    case "textCopyFailed":
      return show(state, copyOutcomeNotice(action));
    default:
      return updated(state);
  }
};

/** Shows a notice, in place of the shown notice of its key, and starts its expiry timer when it is transient. */
function show(state: NoticesState, content: NoticeContent) {
  const { key } = content;
  const [rest, cancels] = without(
    state,
    (shown) => key !== undefined && shown.key === key,
  );
  const notice: Notice = {
    ...content,
    id: freeNoticeId(rest.shown),
    heldBy: { pointer: false, focus: false },
  };
  return updated(
    { shown: [...rest.shown, notice] },
    ...cancels,
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

/** Removes the notices that match and cancels their expiry timers, keeping the same state when none matches. */
function without(state: NoticesState, matches: (notice: Notice) => boolean) {
  const removed = state.shown.filter(matches);
  if (removed.length === 0) return updated(state);
  const shown = state.shown.filter((notice) => !matches(notice));
  return updated({ shown }, ...removed.flatMap(cancelExpiryOf));
}

/** Returns the smallest positive id that no shown notice has. */
function freeNoticeId(shown: readonly Notice[]): number {
  const used = new Set(shown.map(({ id }) => id));
  let id = 1;
  while (used.has(id)) id += 1;
  return id;
}
