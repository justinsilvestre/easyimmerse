import type { LicenseNotice, LicenseNoticeGroup } from "@easyimmerse/licenses";
import { type ReactNode, useId, useState } from "react";

/** The notices while they load, once loaded, or after loading failed. */
export type LicenseNoticesState =
  | { status: "loading" }
  | { status: "loaded"; groups: readonly LicenseNoticeGroup[] }
  | { status: "failed" };

/**
 * Lists the open-source notices the app ships with, folded by group and then by notice.
 * A folded section is rendered only once it is opened, so that hundreds of notices stay cheap.
 */
export function LicensesPage({ notices }: { notices: LicenseNoticesState }) {
  const headingId = useId();
  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-3">
      <h2 id={headingId} className="text-base font-semibold">
        Open-source licenses
      </h2>
      <LicensesBody notices={notices} />
    </section>
  );
}

function LicensesBody({ notices }: { notices: LicenseNoticesState }) {
  if (notices.status === "loading") {
    return <Message>Loading the license notices…</Message>;
  }
  if (notices.status === "failed") {
    return <Message>The license notices could not be loaded.</Message>;
  }
  const groups = notices.groups.filter((group) => group.notices.length > 0);
  if (groups.length === 0) {
    return <Message>This build carries no license notices.</Message>;
  }
  return (
    <ul className="flex flex-col gap-2">
      {groups.map((group) => (
        <li key={group.title}>
          <NoticeGroup group={group} />
        </li>
      ))}
    </ul>
  );
}

function Message({ children }: { children: ReactNode }) {
  return <p className="text-sm text-fg-muted">{children}</p>;
}

function NoticeGroup({ group }: { group: LicenseNoticeGroup }) {
  const count = group.notices.length;
  return (
    <LazyDisclosure
      summary={
        <>
          <span className="text-sm font-semibold">{group.title}</span>{" "}
          <span className="text-xs text-fg-muted">
            {count === 1 ? "1 notice" : `${count} notices`}
          </span>
        </>
      }
    >
      <ul className="flex flex-col gap-1 border-t border-line p-2">
        {group.notices.map((notice) => (
          <li key={notice.title}>
            <NoticeDisclosure notice={notice} />
          </li>
        ))}
      </ul>
    </LazyDisclosure>
  );
}

function NoticeDisclosure({ notice }: { notice: LicenseNotice }) {
  return (
    <LazyDisclosure
      summary={<span className="text-sm font-medium">{notice.title}</span>}
    >
      <pre className="max-h-96 overflow-auto whitespace-pre-wrap border-t border-line px-3 py-2 font-mono text-xs text-fg-soft">
        {notice.text}
      </pre>
    </LazyDisclosure>
  );
}

/** A folded section whose content is rendered the first time it is opened. */
function LazyDisclosure({
  summary,
  children,
}: {
  summary: ReactNode;
  children: ReactNode;
}) {
  const [hasOpened, setHasOpened] = useState(false);
  return (
    <details
      className="rounded border border-line bg-surface"
      onToggle={(event) => {
        if (event.currentTarget.open) setHasOpened(true);
      }}
    >
      <summary className="cursor-pointer px-3 py-2">{summary}</summary>
      {hasOpened && children}
    </details>
  );
}
