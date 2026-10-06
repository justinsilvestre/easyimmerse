import { createContext, type ReactNode, useContext, useState } from "react";
import { NoticeRegion } from "./NoticeRegion.tsx";
import { createNoticeStore, type NoticeStore } from "./noticeStore.ts";

const NoticesContext = createContext<NoticeStore | null>(null);

/** Gives the app one place for notices that outlive the screen that raised them, and shows them. */
export function NoticesProvider({
  store: given,
  statusLine,
  children,
}: {
  /** A store to use instead of a new one, as a test that reads the notices passes. */
  store?: NoticeStore;
  /** A lasting line shown above the notices, which announces itself. */
  statusLine?: ReactNode;
  children: ReactNode;
}) {
  const [store] = useState(() => given ?? createNoticeStore());
  return (
    <NoticesContext value={store}>
      {children}
      <NoticeRegion store={store} statusLine={statusLine} />
    </NoticesContext>
  );
}

/** The app's notices, or, outside a provider, a store of the component's own that nothing shows. */
export function useNotices(): NoticeStore {
  const shared = useContext(NoticesContext);
  const [own] = useState(createNoticeStore);
  return shared ?? own;
}
