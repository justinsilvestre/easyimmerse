import { FailedSavesStatus } from "./FailedSavesStatus.tsx";
import { NotBackedUpStatus } from "./NotBackedUpStatus.tsx";

/** The lasting lines about flashcards not saved: whether they are backed up, and which could not be saved. */
export function UnsavedWorkStatus() {
  return (
    <>
      <NotBackedUpStatus />
      <FailedSavesStatus />
    </>
  );
}
