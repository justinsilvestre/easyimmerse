import {
  type BackendError,
  skipToken,
  useGetImportJobQuery,
} from "@easyimmerse/backend";
import type {
  DictionarySummary,
  ImportJobStatus,
  ImportProgress,
} from "@easyimmerse/types";
import { useEffect, useRef } from "react";

export type ImportJobOutcome =
  | { kind: "done"; dictionary: DictionarySummary }
  | { kind: "failed"; error: Pick<BackendError, "code" | "message"> };

const pollingIntervalMs = 500;

/**
 * Polls an import job until it is done or has failed, reports the outcome once, and returns what
 * the job has stored so far. Nothing is polled while `jobId` is null.
 */
export function useImportJob(
  jobId: string | null,
  onSettled: (outcome: ImportJobOutcome) => void,
): ImportProgress | null {
  const { currentData, error } = useGetImportJobQuery(jobId ?? skipToken, {
    pollingInterval: pollingIntervalMs,
  });
  // Strict mode runs effects twice, and each job must be reported only once.
  const settledJob = useRef<string | null>(null);
  useEffect(() => {
    if (jobId === null || settledJob.current === jobId) return;
    const outcome = outcomeOf(currentData, error);
    if (outcome === null) return;
    settledJob.current = jobId;
    onSettled(outcome);
  });
  return currentData?.progress ?? null;
}

/** The error of a query: the backend's, or one serialized by the store, which may lack a message. */
type QueryError = { code?: string; message?: string };

function outcomeOf(
  status: ImportJobStatus | undefined,
  error: QueryError | undefined,
): ImportJobOutcome | null {
  if (error !== undefined)
    return {
      kind: "failed",
      error: {
        code: error.code,
        message: error.message ?? "the import could not be checked",
      },
    };
  if (status?.state === "done" && status.dictionary !== null)
    return { kind: "done", dictionary: status.dictionary };
  if (status?.state === "failed" && status.error !== null)
    return { kind: "failed", error: status.error };
  return null;
}
