import { describe, expect, it } from "vitest";
import { stateAfter } from "../app/stateAfter.ts";
import {
  failedDictionaryImport,
  startedDictionaryImport,
} from "./exampleDictionaryImport.ts";
import { selectDictionaryImportActivity } from "./selectDictionaryImportActivity.ts";

describe("selectDictionaryImportActivity", () => {
  it("gives a running import's file and progress", () => {
    const app = stateAfter(...startedDictionaryImport);
    expect(selectDictionaryImportActivity({ app })).toMatchObject({
      label: "Adding jmdict.zip",
      status: "running",
      percent: 40,
    });
  });

  it("leads to the dictionaries page", () => {
    const app = stateAfter(...startedDictionaryImport);
    expect(selectDictionaryImportActivity({ app })?.opens?.step).toEqual({
      type: "openDictionaries",
    });
  });

  it("tells of a failure", () => {
    const app = stateAfter(...failedDictionaryImport);
    expect(selectDictionaryImportActivity({ app })).toMatchObject({
      label: "A dictionary could not be added",
      status: "failed",
    });
  });

  it("gives nothing while no dictionary is being added", () => {
    expect(selectDictionaryImportActivity({ app: stateAfter() })).toBeNull();
  });

  it("keeps its reference while another job reports", () => {
    const app = stateAfter(...startedDictionaryImport);
    const first = selectDictionaryImportActivity({ app });
    const jobs = { ...app.operations.jobs, "jobs/mediaSource/j9": undefined };
    const later = { ...app, operations: { ...app.operations, jobs } };
    expect(selectDictionaryImportActivity({ app: later })).toBe(first);
  });
});
