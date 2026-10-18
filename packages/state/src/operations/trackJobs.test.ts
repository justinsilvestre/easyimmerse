import { describe, expect, it } from "vitest";
import type { JobsState } from "./jobs.ts";
import { trackJobs } from "./trackJobs.ts";

const key = "jobs/dictionaryImport/job1";
const request = { kind: "getImportJob", jobId: "job1" } as const;
const watch = {
  type: "watchJob",
  job: { kind: "dictionaryImport", request },
} as const;
const watched: JobsState = {
  [key]: { kind: "dictionaryImport", request, status: "running", report: null },
};

describe("trackJobs", () => {
  describe("for watchJob", () => {
    it("asks for the job's status at once", () => {
      const [, effects] = trackJobs({}, [watch]);
      expect(effects).toEqual([{ type: "sendRequest", id: key, request }]);
    });

    it("records the job as running, with no report yet", () => {
      const [jobs] = trackJobs({}, [watch]);
      expect(jobs).toEqual(watched);
    });

    it("restarts a job watched again", () => {
      const [, effects] = trackJobs(watched, [watch]);
      expect(effects).toEqual([
        { type: "cancelTimer", id: key },
        { type: "sendRequest", id: key, request },
      ]);
    });
  });

  describe("for unwatchJob", () => {
    it("cancels the job's timer and aborts its status request", () => {
      const [, effects] = trackJobs(watched, [{ type: "unwatchJob", key }]);
      expect(effects).toEqual([
        { type: "cancelTimer", id: key },
        { type: "abortRequest", id: key },
      ]);
    });

    it("forgets the job", () => {
      const [jobs] = trackJobs(watched, [{ type: "unwatchJob", key }]);
      expect(jobs).toEqual({});
    });

    it("does nothing for a job not watched", () => {
      const [, effects] = trackJobs({}, [{ type: "unwatchJob", key }]);
      expect(effects).toEqual([]);
    });
  });

  describe("for any other effect", () => {
    const other = { type: "cancelTimer", id: "other" } as const;

    it("passes it through", () => {
      const [, effects] = trackJobs(watched, [other]);
      expect(effects).toEqual([other]);
    });

    it("keeps the jobs as they are", () => {
      const [jobs] = trackJobs(watched, [other]);
      expect(jobs).toBe(watched);
    });
  });
});
