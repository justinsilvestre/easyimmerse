import type { LicenseNotice } from "@easyimmerse/licenses";
import { useId } from "react";

/** Lists the open-source notices the app ships with, each folded under its title. */
export function LicensesPage({
  notices,
}: {
  notices: readonly LicenseNotice[];
}) {
  const headingId = useId();
  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-3">
      <h2 id={headingId} className="text-base font-semibold">
        Open-source licenses
      </h2>
      {notices.length === 0 ? (
        <p className="text-sm text-fg-muted">
          This build carries no license notices.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {notices.map((notice) => (
            <li key={notice.title}>
              <NoticeDisclosure notice={notice} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function NoticeDisclosure({ notice }: { notice: LicenseNotice }) {
  return (
    <details className="rounded border border-line bg-surface">
      <summary className="cursor-pointer px-3 py-2 text-sm font-medium">
        {notice.title}
      </summary>
      <pre className="max-h-96 overflow-auto whitespace-pre-wrap border-t border-line px-3 py-2 font-mono text-xs text-fg-soft">
        {notice.text}
      </pre>
    </details>
  );
}
