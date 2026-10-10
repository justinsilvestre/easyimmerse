import type { Notice as ShownNotice } from "@easyimmerse/state";
import { actions, selectNotices } from "@easyimmerse/state";
import type { ReactNode } from "react";
import { useAppDispatch } from "../hooks/useAppDispatch.ts";
import { useAppSelector } from "../hooks/useAppSelector.ts";
import { Notice } from "./Notice.tsx";

/**
 * Shows the app's notices at the bottom of the window, above the home indicator on a phone with one. Each failure is an alert, announced as soon as it appears;
 * other notices sit in a polite live region, announced once the screen reader is idle. Their buttons follow the page in keyboard order.
 * A transient notice waits while the pointer or focus is on it.
 * While a modal dialog is open, the dialog shows its own region and a region outside any dialog hides, status line included, so each notice shows once.
 */
export function NoticeRegion({
  statusLine,
}: {
  /** A lasting line shown above the notices, which announces itself. */
  statusLine?: ReactNode;
}) {
  const notices = useAppSelector(selectNotices);
  const isFailure = (notice: ShownNotice) => notice.tone === "danger";
  return (
    <section
      aria-label="Notifications"
      className="pointer-events-none fixed inset-x-0 bottom-[calc(1rem+env(safe-area-inset-bottom))] z-40 flex flex-col items-center gap-2 px-4 [body:has(dialog:modal)_&:not(dialog_*)]:invisible"
    >
      {statusLine}
      <NoticeList notices={notices.filter(isFailure)} />
      <div aria-live="polite">
        <NoticeList notices={notices.filter((notice) => !isFailure(notice))} />
      </div>
    </section>
  );
}

function NoticeList({ notices }: { notices: readonly ShownNotice[] }) {
  return (
    <ul className="flex flex-col items-center gap-2">
      {notices.map((notice) => (
        <NoticeItem key={notice.id} notice={notice} />
      ))}
    </ul>
  );
}

/** One notice, which tells the store when the pointer or focus holds it and when the user acts on it. */
function NoticeItem({ notice }: { notice: ShownNotice }) {
  const dispatch = useAppDispatch();
  const { id } = notice;
  return (
    <li
      className="pointer-events-auto"
      onPointerEnter={() => dispatch(actions.noticeHeld(id, "pointer"))}
      onPointerLeave={() => dispatch(actions.noticeReleased(id, "pointer"))}
      onFocus={() => dispatch(actions.noticeHeld(id, "focus"))}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null))
          dispatch(actions.noticeReleased(id, "focus"));
      }}
    >
      <div role={notice.tone === "danger" ? "alert" : undefined}>
        <Notice
          tone={notice.tone}
          message={notice.message}
          actions={notice.buttons.map((button) => ({
            label: button.label,
            onSelect: () =>
              dispatch(actions.noticeButtonChosen(id, button.action)),
          }))}
          onDismiss={() => dispatch(actions.noticeDismissed(id))}
        />
      </div>
    </li>
  );
}
