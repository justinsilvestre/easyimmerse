import type { AppAction } from "../app/appAction.ts";
import { actions } from "../app/appAction.ts";
import type { Effect } from "../app/effect.ts";
import type { RequestOutcome } from "../server/serverRequest.ts";
import type { JobRecord, JobStatus, JobsState } from "./jobs.ts";
import { pollingIntervalMs } from "./jobs.ts";

/**
 * Keeps each watched job's last report, and asks for its status again after the polling interval while it runs.
 * A job whose status cannot be fetched counts as failed.
 */
export function updateJobs(
  jobs: JobsState,
  action: AppAction,
): readonly [JobsState, readonly Effect[]] {
  switch (action.type) {
    case "requestSettled": {
      const job = jobs[action.id];
      if (job === undefined || isAborted(action.outcome)) return [jobs, []];
      const checked = checkedJob(job, action.outcome);
      return [
        { ...jobs, [action.id]: checked },
        checked.status === "running"
          ? [
              {
                type: "startTimer",
                id: action.id,
                ms: pollingIntervalMs[job.kind],
                action: actions.jobPollDue(action.id),
              },
            ]
          : [],
      ];
    }
    case "jobPollDue": {
      const job = jobs[action.key];
      return job?.status === "running"
        ? [
            jobs,
            [{ type: "sendRequest", id: action.key, request: job.request }],
          ]
        : [jobs, []];
    }
    default:
      return [jobs, []];
  }
}

function isAborted(outcome: RequestOutcome): boolean {
  return !outcome.ok && outcome.error.status === "ABORTED";
}

// The settled action's id is the job's key, so its data is the report of the job's kind.
function checkedJob(job: JobRecord, outcome: RequestOutcome): JobRecord {
  if (!outcome.ok) return { ...job, status: "failed" };
  const report = outcome.data as JobRecord["report"];
  return { ...job, report, status: statusOf(job, report) } as JobRecord;
}

function statusOf(job: JobRecord, report: JobRecord["report"]): JobStatus {
  if (report === null) return job.status;
  return "state" in report ? report.state : report.status;
}
