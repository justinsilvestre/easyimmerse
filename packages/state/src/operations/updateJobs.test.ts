import type { ImportJobState } from "@easyimmerse/types";
import { describe, expect, it } from "vitest";
import { actions } from "../app/appAction.ts";
import {
  runningImportStatus,
  runningMediaSourceJob,
} from "./exampleJobReports.ts";
import type { JobsState } from "./jobs.ts";
import { updateJobs } from "./updateJobs.ts";

const key = "jobs/dictionaryImport/job1";
const request = { kind: "getImportJob", jobId: "job1" } as const;
const watched: JobsState = {
  [key]: { kind: "dictionaryImport", request, status: "running", report: null },
};
const reported = (state: ImportJobState) =>
  actions.requestSettled(key, request, {
    ok: true,
    data: { ...runningImportStatus, state },
  });

const mediaKey = "jobs/mediaSource/j1";
const mediaRequest = {
  kind: "getMediaSourceJob",
  projectId: "p1",
  jobId: "j1",
} as const;
const watchedFetch: JobsState = {
  [mediaKey]: {
    kind: "mediaSource",
    request: mediaRequest,
    status: "running",
    report: null,
  },
};

describe("updateJobs", () => {
  describe("when a job's status arrives", () => {
    it("asks again after the dictionary import's interval while the job runs", () => {
      const [, effects] = updateJobs(watched, reported("running"));
      expect(effects).toEqual([
        {
          type: "startTimer",
          id: key,
          ms: 500,
          action: actions.jobPollDue(key),
        },
      ]);
    });

    it("asks again after the media fetch's interval while the fetch runs", () => {
      const settled = actions.requestSettled(mediaKey, mediaRequest, {
        ok: true,
        data: runningMediaSourceJob,
      });
      const [, effects] = updateJobs(watchedFetch, settled);
      expect(effects).toMatchObject([{ type: "startTimer", ms: 1000 }]);
    });

    it("keeps the report", () => {
      const [jobs] = updateJobs(watched, reported("running"));
      expect(jobs[key]?.report).toEqual(runningImportStatus);
    });

    it("stops asking once the job has failed", () => {
      const [, effects] = updateJobs(watched, reported("failed"));
      expect(effects).toEqual([]);
    });

    it("marks a finished job as done", () => {
      const [jobs] = updateJobs(watched, reported("done"));
      expect(jobs[key]?.status).toBe("done");
    });

    it("reads a media fetch's status from its report", () => {
      const settled = actions.requestSettled(mediaKey, mediaRequest, {
        ok: true,
        data: { ...runningMediaSourceJob, status: "failed" },
      });
      const [jobs] = updateJobs(watchedFetch, settled);
      expect(jobs[mediaKey]?.status).toBe("failed");
    });
  });

  describe("when a job's status request fails", () => {
    const failed = actions.requestSettled(key, request, {
      ok: false,
      error: { status: 404, message: "no such job" },
    });

    it("marks the job as failed", () => {
      const [jobs] = updateJobs(watched, failed);
      expect(jobs[key]?.status).toBe("failed");
    });

    it("stops asking", () => {
      const [, effects] = updateJobs(watched, failed);
      expect(effects).toEqual([]);
    });
  });

  it("ignores a status request that was aborted", () => {
    const aborted = actions.requestSettled(key, request, {
      ok: false,
      error: { status: "ABORTED", message: "aborted" },
    });
    const [jobs] = updateJobs(watched, aborted);
    expect(jobs).toBe(watched);
  });

  it("ignores the status of a job no longer watched", () => {
    const [jobs] = updateJobs({}, reported("running"));
    expect(jobs).toEqual({});
  });

  describe("when a poll is due", () => {
    it("asks for a running job's status", () => {
      const [, effects] = updateJobs(watched, actions.jobPollDue(key));
      expect(effects).toEqual([{ type: "sendRequest", id: key, request }]);
    });

    it("asks nothing for a job no longer watched", () => {
      const [, effects] = updateJobs({}, actions.jobPollDue(key));
      expect(effects).toEqual([]);
    });
  });
});
