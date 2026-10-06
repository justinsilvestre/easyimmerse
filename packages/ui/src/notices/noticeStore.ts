import type { NoticeAction, NoticeTone } from "./Notice.tsx";

/** A notice to show: an Undo notice goes after a while, a failure stays until the user acts on it or dismisses it. */
export type NoticeContent = {
  tone: NoticeTone;
  message: string;
  actions?: readonly NoticeAction[];
  /** Whether the notice goes by itself after `noticeTimeoutMs`, unless the user is pointing at it or focusing it. */
  isTransient: boolean;
  /** Runs when the user dismisses the notice, but not when one of its actions is chosen or it goes by itself. */
  onDismiss?: () => void;
};

export type ShownNotice = NoticeContent & { id: number };

/** How long a transient notice stays: long enough to read it and reach its actions, as WCAG's timing guidance asks. */
export const noticeTimeoutMs = 10_000;

/** Keeps the notices on screen and tells its listener whenever they change. */
export function createNoticeStore() {
  let notices: readonly ShownNotice[] = [];
  let nextId = 1;
  const listeners = new Set<() => void>();
  const set = (next: readonly ShownNotice[]) => {
    notices = next;
    for (const listener of listeners) listener();
  };
  const dismiss = (id: number) =>
    set(notices.filter((notice) => notice.id !== id));
  return {
    /** Shows a notice and returns its id. Choosing one of its actions dismisses it. */
    show(content: NoticeContent): number {
      const id = nextId++;
      const actions = content.actions?.map((action) => ({
        ...action,
        onSelect: () => {
          dismiss(id);
          action.onSelect();
        },
      }));
      set([...notices, { ...content, actions, id }]);
      return id;
    },
    dismiss,
    /** Dismisses a notice at the user's request, running what the notice does on dismissal. */
    dismissByUser(id: number) {
      const notice = notices.find((shown) => shown.id === id);
      dismiss(id);
      notice?.onDismiss?.();
    },
    list: () => notices,
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}

export type NoticeStore = ReturnType<typeof createNoticeStore>;
