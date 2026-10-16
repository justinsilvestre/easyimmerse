import type {
  AnkiConnectionStatus,
  AnkiConnectSync,
  AnkiUpdatesQueue,
} from "@easyimmerse/state";
import { Plug, Send } from "lucide-react";
import type { ReactNode } from "react";
import { Badge } from "../components/Badge.tsx";
import { Button } from "../components/Button.tsx";
import { pluralize } from "../components/pluralize.ts";
import { newAndChangedPhrase } from "./newAndChangedPhrase.ts";
import { SyncChannel } from "./SyncChannel.tsx";

/**
 * Shows AnkiConnect while it is on for the project: whether Anki answers, what waits to be sent or deleted,
 * and the buttons to send, check again, get help, or turn AnkiConnect off.
 */
export function AnkiConnectChannel({
  sync,
  queue,
  flashcardCount,
  onSendToAnki,
  onCheckConnection,
  onSetUpAnkiConnect,
  onTurnOff,
}: {
  sync: AnkiConnectSync;
  queue: AnkiUpdatesQueue;
  /** Every flashcard of the project. */
  flashcardCount: number;
  onSendToAnki: () => void;
  onCheckConnection: () => void;
  onSetUpAnkiConnect: () => void;
  onTurnOff: () => void;
}) {
  const isUpToDate =
    queue.newCount + queue.changedCount === 0 &&
    sync.pendingDeletionCount === 0;
  return (
    <SyncChannel
      icon={<Plug className="size-5" aria-hidden />}
      title="AnkiConnect"
      headerAction={
        <Button variant="subtle" size="sm" onClick={onTurnOff}>
          Turn off
        </Button>
      }
    >
      {connectionBadges[sync.connection]}
      <p>
        {ankiConnectSummary(queue, sync.pendingDeletionCount, flashcardCount)}
      </p>
      <ConnectionHint {...sync} />
      <div className="flex flex-wrap gap-2 pt-1">
        <Button
          variant="primary"
          disabled={isUpToDate || sync.isSyncing}
          onClick={onSendToAnki}
        >
          <Send className="size-4" aria-hidden />
          {sync.isSyncing ? "Sending…" : "Send to Anki"}
        </Button>
        {isUnconnected(sync.connection) && (
          <>
            <Button onClick={onCheckConnection}>Check again</Button>
            <Button variant="subtle" onClick={onSetUpAnkiConnect}>
              Setup help
            </Button>
          </>
        )}
      </div>
    </SyncChannel>
  );
}

/** Counts the flashcards in the Anki updates queue, which wait to be sent to Anki, and the notes waiting to be deleted from it. */
function ankiConnectSummary(
  { newCount, changedCount }: AnkiUpdatesQueue,
  pendingDeletionCount: number,
  flashcardCount: number,
) {
  const notes = pluralize(pendingDeletionCount, "note");
  const isAllSent = newCount + changedCount === 0;
  if (isAllSent && pendingDeletionCount > 0)
    return `${notes} waiting to be deleted from Anki.`;
  if (isAllSent)
    return flashcardCount === 0
      ? "No flashcards yet."
      : "No flashcards waiting to be sent.";
  const unsent = `${newAndChangedPhrase(newCount, changedCount)} waiting to be sent`;
  return pendingDeletionCount === 0
    ? `${unsent}.`
    : `${unsent}, ${notes} to delete.`;
}

const connectionBadges = {
  checking: <Badge>Checking Anki…</Badge>,
  connected: <Badge tone="success">Anki connected</Badge>,
  unreachable: <Badge tone="danger">Anki unreachable</Badge>,
  denied: <Badge tone="danger">Anki refused easyImmerse</Badge>,
} satisfies Record<AnkiConnectionStatus, ReactNode>;

/**
 * Tells how to connect to Anki when the last check did not.
 * AnkiConnect asks again each time a page it refused checks, unless the user chose to ignore that page's origin, which its config then lists.
 * When that origin is not known, emptying the list is the step that still works.
 */
function ConnectionHint({
  connection,
  deniedOrigin,
}: Pick<AnkiConnectSync, "connection" | "deniedOrigin">) {
  switch (connection) {
    case "checking":
    case "connected":
      return null;
    case "unreachable":
      return (
        <p className="text-fg-muted">
          Start Anki with the AnkiConnect add-on installed, then check again.
        </p>
      );
    case "denied":
      return (
        <p className="text-fg-muted">
          Check again and choose Yes when Anki asks. If it does not ask, choose
          Tools, then Add-ons in Anki, select AnkiConnect, choose Config,{" "}
          {deniedOrigin === null ? (
            <>
              empty <Code>ignoreOriginList</Code>
            </>
          ) : (
            <>
              remove <Code>{deniedOrigin}</Code> from{" "}
              <Code>ignoreOriginList</Code>
            </>
          )}
          , and check again.
        </p>
      );
  }
}

function Code({ children }: { children: ReactNode }) {
  return <code className="font-mono">{children}</code>;
}

/** Tells whether the last check found that easyImmerse cannot use Anki, so that the user can check again or get help. */
function isUnconnected(connection: AnkiConnectionStatus) {
  return connection === "unreachable" || connection === "denied";
}
