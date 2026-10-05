import { useEffect, useState, useSyncExternalStore } from "react";
import { Notice } from "./Notice.tsx";
import {
  type NoticeStore,
  noticeTimeoutMs,
  type ShownNotice,
} from "./noticeStore.ts";

/**
 * Shows the app's notices at the bottom of the window. Failures sit in an alert, which is announced at once;
 * other notices sit in a polite live region, announced once the screen reader is idle. Their buttons follow the page in keyboard order.
 * A transient notice waits while the pointer or focus is on it.
 */
export function NoticeRegion({ store }: { store: NoticeStore }) {
  const notices = useSyncExternalStore(store.subscribe, store.list);
  const isFailure = (notice: ShownNotice) => notice.tone === "danger";
  return (
    <section
      aria-label="Notifications"
      className="pointer-events-none fixed inset-x-0 bottom-4 z-40 flex flex-col items-center gap-2 px-4"
    >
      <div role="alert">
        <NoticeList notices={notices.filter(isFailure)} store={store} />
      </div>
      <div aria-live="polite">
        <NoticeList
          notices={notices.filter((notice) => !isFailure(notice))}
          store={store}
        />
      </div>
    </section>
  );
}

function NoticeList({
  notices,
  store,
}: {
  notices: readonly ShownNotice[];
  store: NoticeStore;
}) {
  return (
    <ul className="flex flex-col items-center gap-2">
      {notices.map((notice) => (
        <TimedNotice key={notice.id} notice={notice} store={store} />
      ))}
    </ul>
  );
}

function TimedNotice({
  notice,
  store,
}: {
  notice: ShownNotice;
  store: NoticeStore;
}) {
  const [isHeld, setHeld] = useState({ pointer: false, focus: false });
  const isWaiting = notice.isTransient && !isHeld.pointer && !isHeld.focus;
  useEffect(() => {
    if (!isWaiting) return;
    const timer = setTimeout(() => store.dismiss(notice.id), noticeTimeoutMs);
    return () => clearTimeout(timer);
  }, [isWaiting, notice.id, store]);
  return (
    <li
      className="pointer-events-auto"
      onPointerEnter={() => setHeld((held) => ({ ...held, pointer: true }))}
      onPointerLeave={() => setHeld((held) => ({ ...held, pointer: false }))}
      onFocus={() => setHeld((held) => ({ ...held, focus: true }))}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null))
          setHeld((held) => ({ ...held, focus: false }));
      }}
    >
      <Notice
        tone={notice.tone}
        message={notice.message}
        actions={notice.actions}
        onDismiss={() => store.dismiss(notice.id)}
      />
    </li>
  );
}
