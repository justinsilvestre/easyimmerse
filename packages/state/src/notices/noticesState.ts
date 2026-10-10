import type { AppAction } from "../app/appAction.ts";

/** How a notice looks: what kind of news it brings. */
export type NoticeTone = "success" | "info" | "danger";

/** Something the user can do about a notice, such as Undo. Choosing it closes the notice. */
export type NoticeButton = { label: string } & (
  | { action: AppAction }
  /** A callback the UI runs after closing the notice. It goes once the flashcard notices carry actions. */
  | { onSelect: () => void }
);

/** A notice to show: a transient one goes after a while, a lasting one stays until the user acts on it or dismisses it. */
export type NoticeContent = {
  /** A name that the notice's feature uses to replace or withdraw it. At most one shown notice has a given key. */
  key?: string;
  tone: NoticeTone;
  message: string;
  buttons: readonly NoticeButton[];
  /** Whether the notice goes by itself after ten seconds, unless the pointer or keyboard focus is on it. */
  isTransient: boolean;
};

/** What keeps a notice from going: the pointer resting on it, or keyboard focus inside it. */
export type NoticeHold = "pointer" | "focus";

/** A notice on screen. */
export type Notice = NoticeContent & {
  id: number;
  heldBy: Readonly<Record<NoticeHold, boolean>>;
};

/** The notices on screen, oldest first, and the id the next one gets. */
export type NoticesState = { shown: readonly Notice[]; nextId: number };

export const initialNoticesState: NoticesState = { shown: [], nextId: 1 };
