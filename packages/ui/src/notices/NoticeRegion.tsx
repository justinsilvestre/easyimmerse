import { useEffect, useState, useSyncExternalStore } from "react";
import { Notice } from "./Notice.tsx";
import {
  type NoticeStore,
  noticeTimeoutMs,
  type ShownNotice,
} from "./noticeStore.ts";

/**
 * Shows the app's notices at the bottom of the window. The list is a polite live region, so each notice is announced as it appears;
 * its buttons follow the page in keyboard order. A transient notice waits while the pointer or focus is on it.
 */
export function NoticeRegion({ store }: { store: NoticeStore }) {
  const notices = useSyncExternalStore(store.subscribe, store.list);
  return (
    <section
      aria-label="Notifications"
      className="pointer-events-none fixed inset-x-0 bottom-4 z-40 flex justify-center px-4"
    >
      <ul aria-live="polite" className="flex flex-col items-center gap-2">
        {notices.map((notice) => (
          <TimedNotice key={notice.id} notice={notice} store={store} />
        ))}
      </ul>
    </section>
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
