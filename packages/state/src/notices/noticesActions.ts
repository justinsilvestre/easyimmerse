import type { AppAction } from "../app/appAction.ts";
import type { NoticeContent, NoticeHold } from "./noticesState.ts";

/**
 * An action of the notices.
 * The union is written out, unlike other features' action types, because `AppAction` contains it
 * and two of its members contain `AppAction`, which TypeScript cannot infer.
 */
export type NoticesAction =
  | { type: "noticeRequested"; content: NoticeContent }
  | { type: "noticeHeld"; id: number; by: NoticeHold }
  | { type: "noticeReleased"; id: number; by: NoticeHold }
  | { type: "noticeExpired"; id: number }
  | { type: "noticeDismissed"; id: number }
  | { type: "noticeButtonChosen"; id: number; action: AppAction }
  | { type: "noticeWithdrawn"; key: string };

type Of<T extends NoticesAction["type"]> = Extract<NoticesAction, { type: T }>;

/** The action creators of the notices. */
export const noticesActions = {
  noticeRequested: (content: NoticeContent): Of<"noticeRequested"> => ({
    type: "noticeRequested",
    content,
  }),
  /** The pointer entered the notice, or focus arrived in it. */
  noticeHeld: (id: number, by: NoticeHold): Of<"noticeHeld"> => ({
    type: "noticeHeld",
    id,
    by,
  }),
  /** The pointer left the notice, or focus left it. */
  noticeReleased: (id: number, by: NoticeHold): Of<"noticeReleased"> => ({
    type: "noticeReleased",
    id,
    by,
  }),
  /** The expiry timer of a transient notice fired. */
  noticeExpired: (id: number): Of<"noticeExpired"> => ({
    type: "noticeExpired",
    id,
  }),
  /** The user dismissed the notice with its Dismiss button. */
  noticeDismissed: (id: number): Of<"noticeDismissed"> => ({
    type: "noticeDismissed",
    id,
  }),
  /** The user chose a button that carries an action: the notice closes, and the action is dispatched after it. */
  noticeButtonChosen: (
    id: number,
    action: AppAction,
  ): Of<"noticeButtonChosen"> => ({ type: "noticeButtonChosen", id, action }),
  /** Removes the shown notice with this key, if there is one. */
  noticeWithdrawn: (key: string): Of<"noticeWithdrawn"> => ({
    type: "noticeWithdrawn",
    key,
  }),
};
