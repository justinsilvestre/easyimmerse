import type { AnkiConnectSync, AnkiUpdatesQueue } from "@easyimmerse/state";
import type { ReactNode } from "react";
import { pluralize } from "../../lib/formatting/pluralize.ts";
import { AnkiConnectStatus, type ChannelStatus } from "./AnkiConnectStatus.tsx";
import { Count } from "./Count.tsx";
import { FlashcardsColumns } from "./FlashcardsColumns.tsx";
import { newAndChangedPhrase } from "./newAndChangedPhrase.ts";
import { QueueSummary } from "./QueueSummary.tsx";

/**
 * Shows AnkiConnect while it is on for the project, or off after flashcards were sent through it:
 * its status above, then `children`, and under them what waits to be sent or deleted, with a `preview` of the next card.
 * Sending needs no button, since a connection check that finds Anki sends what waits; only a failed sync offers to try again.
 */
export function AnkiConnectChannel({
  sync,
  queue,
  flashcardCount,
  preview,
  onCheckConnection,
  onTryAgain,
  onSetUpAnkiConnect,
  onTurnOff,
  children,
}: {
  sync: AnkiConnectSync;
  queue: AnkiUpdatesQueue;
  /** Every flashcard of the project. */
  flashcardCount: number;
  /** The next card in the Anki updates queue, or null when the queue is empty. */
  preview: ReactNode;
  onCheckConnection: () => void;
  /** Sends to Anki again what a failed sync left waiting. */
  onTryAgain: () => void;
  /** Opens the setup, which turns AnkiConnect on, from the switch while it is off and from the connection hint. */
  onSetUpAnkiConnect: () => void;
  onTurnOff: () => void;
  children?: ReactNode;
}) {
  const hasFlashcards = flashcardCount > 0;
  const status = statusOf(sync, queue);
  const summary = ankiConnectSummary(queue, sync, status, flashcardCount);
  return (
    <FlashcardsColumns
      queue={
        hasFlashcards ? (
          <QueueSummary summary={summary} preview={preview} />
        ) : null
      }
      action={null}
      placement="above"
    >
      <AnkiConnectStatus
        isOn={sync.isOn}
        status={status}
        isSyncing={sync.isSyncing}
        deniedOrigin={sync.deniedOrigin}
        onCheckConnection={onCheckConnection}
        onTryAgain={onTryAgain}
        onSetUpAnkiConnect={onSetUpAnkiConnect}
        onTurnOff={onTurnOff}
      />
      {!hasFlashcards && <p className="self-stretch text-center">{summary}</p>}
      {children}
    </FlashcardsColumns>
  );
}

/** Tells of a failed sync only while something still waits, since a failure whose flashcards reached Anki since is no longer the user's concern. */
function statusOf(
  sync: AnkiConnectSync,
  queue: AnkiUpdatesQueue,
): ChannelStatus {
  return sync.hasSyncFailed &&
    !isNothingWaiting(queue, sync.pendingDeletionCount)
    ? "syncFailed"
    : sync.connection;
}

/**
 * Says what will be sent to Anki or deleted from it, or, when nothing will, how many flashcards Anki has, with the counts in bold.
 * While Anki is connected, what is left is said to wait for it, since a send is under way or about to start, unless the last sync failed.
 * While AnkiConnect is off, the flashcards left are said to wait for it to be turned on, and the notes to delete are left to the list of deleted flashcards.
 */
function ankiConnectSummary(
  { newCount, changedCount }: AnkiUpdatesQueue,
  { isOn, pendingDeletionCount }: AnkiConnectSync,
  status: ChannelStatus,
  flashcardCount: number,
): ReactNode {
  const notes = <Count>{pluralize(pendingDeletionCount, "note")}</Count>;
  const hasNotes = isOn && pendingDeletionCount > 0;
  const isAllSent = newCount + changedCount === 0;
  if (isAllSent && hasNotes)
    return status === "syncFailed" ? (
      <>{notes} could not be deleted from Anki.</>
    ) : (
      <>{notes} waiting to be deleted from Anki.</>
    );
  if (isAllSent)
    return flashcardCount === 0 ? (
      "Once you've made some flashcards from media, they will be sent automatically to Anki."
    ) : (
      <>
        <Count>{pluralize(flashcardCount, "flashcard")}</Count> exported to Anki
        so far.
      </>
    );
  const flashcards = (
    <Count>{newAndChangedPhrase(newCount, changedCount)}</Count>
  );
  if (!isOn) return <>{flashcards} waiting until AnkiConnect is turned on.</>;
  if (status === "syncFailed")
    return (
      <>
        {flashcards} could not be sent to Anki
        {hasNotes && <>, with {notes} still to delete</>}.
      </>
    );
  if (status === "connected")
    return (
      <>
        {flashcards}
        {hasNotes && <> and {notes} to delete</>} waiting for Anki.
      </>
    );
  return (
    <>
      {flashcards} will be sent{hasNotes && <> and {notes} deleted</>} the next
      time easyImmerse connects to Anki.
    </>
  );
}

function isNothingWaiting(
  { newCount, changedCount }: AnkiUpdatesQueue,
  pendingDeletionCount: number,
) {
  return newCount + changedCount + pendingDeletionCount === 0;
}
