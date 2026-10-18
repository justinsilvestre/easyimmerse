import type { AppAction } from "../app/appAction.ts";
import { actions } from "../app/appAction.ts";
import { updated } from "../app/updated.ts";
import { isAborted } from "../server/isAborted.ts";
import type { RequestOutcome } from "../server/serverRequest.ts";
import type {
  JobKind,
  JobRecord,
  JobReports,
  JobStatus,
  JobsState,
} from "./jobs.ts";
import { pollingIntervalMs } from "./jobs.ts";

/**
 * Keeps each watched job's last report, and asks for its status again after the polling interval while it runs.
 * A job whose status cannot be fetched counts as failed.
 */
export function updateJobs(jobs: JobsState, action: AppAction) {
  switch (action.type) {
    case "requestSettled": {
      const job = jobs[action.id];
      if (job === undefined || isAborted(action.outcome)) return updated(jobs);
      const checked = checkedJob(job, action.outcome);
      const next = { ...jobs, [action.id]: checked };
      return checked.status === "running"
        ? updated(next, {
            type: "startTimer",
            id: action.id,
            ms: pollingIntervalMs[job.kind],
            action: actions.jobPollDue(action.id),
          })
        : updated(next);
    }
    case "jobPollDue": {
      const job = jobs[action.key];
      return job?.status === "running"
        ? updated(jobs, {
            type: "sendRequest",
            id: action.key,
            request: job.request,
          })
        : updated(jobs);
    }
    default:
      return updated(jobs);
  }
}

// The settled action's id is the job's key, so its data is the report of the job's kind.
function checkedJob(job: JobRecord, outcome: RequestOutcome): JobRecord {
  if (!outcome.ok) return { ...job, status: "failed" };
  const report = outcome.data as JobReports[JobKind];
  return { ...job, report, status: statusOf(report) } as JobRecord;
}

function statusOf(report: JobReports[JobKind]): JobStatus {
  return "state" in report ? report.state : report.status;
}
