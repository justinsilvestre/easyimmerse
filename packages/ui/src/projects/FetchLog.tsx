import { actions } from "@easyimmerse/state";
import type { MediaSourceLogLine } from "@easyimmerse/types";
import clsx from "clsx";
import { useEffect, useRef } from "react";
import { Button } from "../components/Button.tsx";
import { useAppDispatch } from "../hooks/useAppDispatch.ts";

/**
 * The log lines, newest at the bottom, kept scrolled to the latest while they arrive,
 * with a button that copies them all as plain text.
 */
export function FetchLog({ lines }: { lines: readonly MediaSourceLogLine[] }) {
  const listRef = useRef<HTMLOListElement>(null);
  const count = lines.length;
  useEffect(() => {
    const list = listRef.current;
    if (list && count > 0) list.scrollTop = list.scrollHeight;
  }, [count]);
  return (
    <div className="relative mt-1">
      <ol
        ref={listRef}
        aria-label="Log"
        className="max-h-40 overflow-y-auto rounded border border-line bg-surface-muted p-2 pr-16 font-mono whitespace-pre-wrap"
      >
        {withKeys(lines).map(({ line, key }) => (
          <li
            key={key}
            className={clsx(
              line.level === "output" && "text-fg-muted",
              line.level === "warn" && "text-warning-fg",
              line.level === "error" && "text-danger-fg",
            )}
          >
            {line.message}
          </li>
        ))}
      </ol>
      <CopyLogButton lines={lines} />
    </div>
  );
}

/** The log as plain text, one line per entry, each marked with its level. */
export function formatLog(lines: readonly MediaSourceLogLine[]): string {
  return lines.map((line) => `[${line.level}] ${line.message}`).join("\n");
}

function CopyLogButton({ lines }: { lines: readonly MediaSourceLogLine[] }) {
  const dispatch = useAppDispatch();
  const copy = () =>
    dispatch(actions.textCopyRequested(formatLog(lines), "log"));
  return (
    <Button
      size="sm"
      className="absolute top-1 right-3"
      aria-disabled={lines.length === 0}
      onClick={lines.length === 0 ? undefined : copy}
    >
      Copy
    </Button>
  );
}

/**
 * Keys each line by its time and text, counting repeats apart, since a download reports
 * the same progress line more than once within a millisecond.
 */
function withKeys(lines: readonly MediaSourceLogLine[]) {
  const seen = new Map<string, number>();
  return lines.map((line) => {
    const text = `${line.at_ms} ${line.level} ${line.message}`;
    const repeats = seen.get(text) ?? 0;
    seen.set(text, repeats + 1);
    return { line, key: `${text} #${repeats}` };
  });
}
