import type { ImportJobStatus, MediaSourceJob } from "@easyimmerse/types";

/** What each kind of server job reports when its status is asked for. */
export type JobReports = {
  dictionaryImport: ImportJobStatus;
  mediaSource: MediaSourceJob;
};

/** A kind of server job that the app polls. */
export type JobKind = keyof JobReports;

/** The request that asks for the status of a job of each kind. */
export type JobStatusRequests = {
  dictionaryImport: { kind: "getImportJob"; jobId: string };
  mediaSource: { kind: "getMediaSourceJob"; projectId: string; jobId: string };
};

/** A job to watch: its kind and the request that asks for its status. */
export type WatchedJob = {
  [K in JobKind]: { kind: K; request: JobStatusRequests[K] };
}[JobKind];

/** Whether a job still runs, or how it ended. */
export type JobStatus = "running" | "done" | "failed";

/** A server job being polled: the request that asks for its status, whether it still runs, and what it last reported. */
export type JobRecord = {
  [K in JobKind]: {
    kind: K;
    request: JobStatusRequests[K];
    status: JobStatus;
    /** The last status the server reported, or null before the first arrives. */
    report: JobReports[K] | null;
  };
}[JobKind];

/** The jobs being polled, by key. */
export type JobsState = Partial<Record<string, JobRecord>>;

/** How long to wait after one status of a job before asking for the next. */
export const pollingIntervalMs: Record<JobKind, number> = {
  dictionaryImport: 500,
  mediaSource: 1000,
};

/** The key of a job in the jobs being polled, which is also the id of its status request and of its polling timer. */
export const jobKey = (kind: JobKind, jobId: string) => `jobs/${kind}/${jobId}`;
