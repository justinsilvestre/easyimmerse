import { describe, expect, it } from "vitest";
import type { JobsState } from "./jobs.ts";
import { trackJobs } from "./trackJobs.ts";

const key = "jobs/dictionaryImport/job1";
const request = { kind: "getImportJob", jobId: "job1" } as const;
const watched: JobsState = {
  [key]: { kind: "dictionaryImport", request, status: "running", report: null },
};

describe("trackJobs", () => {
  describe("for watchJob", () => {
    it("asks for the job's status at once", () => {
      const [, effects] = trackJobs({}, [
        { type: "watchJob", key, job: { kind: "dictionaryImport", request } },
      ]);
      expect(effects).toEqual([{ type: "sendRequest", id: key, request }]);
    });

    it("records the job as running, with no report yet", () => {
      const [jobs] = trackJobs({}, [
        { type: "watchJob", key, job: { kind: "dictionaryImport", request } },
      ]);
      expect(jobs).toEqual(watched);
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

  it("passes other effects through and keeps the jobs as they are", () => {
    const [jobs] = trackJobs(watched, [{ type: "cancelTimer", id: "other" }]);
    expect(jobs).toBe(watched);
  });
});
