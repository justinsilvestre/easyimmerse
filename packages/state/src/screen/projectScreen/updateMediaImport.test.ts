import type { MediaSourceJob } from "@easyimmerse/types";
import { describe, expect, it } from "vitest";
import { actions } from "../../app/appAction.ts";
import { runningMediaSourceJob } from "../../operations/exampleJobReports.ts";
import { exampleMediaFile } from "../../server/exampleMediaFile.ts";
import { showingForm, subtitlesForm } from "./exampleMediaImport.ts";
import type { MediaImportWizard } from "./mediaImportWizard.ts";
import { updateMediaImport } from "./updateMediaImport.ts";

const source = { name: "video-site", label: "Add from a video site" };
const formRequest = {
  kind: "getImportForm",
  projectId: "p1",
  request: { plugin: "video-site" },
} as const;
const input = [{ field: "subtitles", values: ["en"] }];
const stepRequest = {
  kind: "submitImportStep",
  projectId: "p1",
  request: { plugin: "video-site", action: "add", input },
} as const;
const awaitingStep: MediaImportWizard = {
  ...showingForm,
  isAwaitingAnswer: true,
};
const fetching: MediaImportWizard = { ...showingForm, jobId: "j1" };
const jobKey = "jobs/mediaSource/j1";
const statusRequest = {
  kind: "getMediaSourceJob",
  projectId: "p1",
  jobId: "j1",
} as const;

const stepAnswered = (
  data:
    | { kind: "job"; job: MediaSourceJob }
    | { kind: "form"; form: typeof subtitlesForm },
) =>
  actions.requestSettled("project/p1/mediaImport/step", stepRequest, {
    ok: true,
    data,
  });
const fetchChecked = (job: Partial<MediaSourceJob>) =>
  actions.requestSettled(jobKey, statusRequest, {
    ok: true,
    data: { ...runningMediaSourceJob, ...job },
  });
const pilot = exampleMediaFile("m1", "pilot.mkv");
const skippedEnglish = { id: "en", reason: "the plugin did not fetch it" };
const failure = (message: string) =>
  ({ ok: false, error: { status: 500, message } }) as const;

describe("updateMediaImport", () => {
  it("asks the plugin for its form when the dialog opens", () => {
    const [, effects] = updateMediaImport(
      null,
      actions.mediaImportOpened(source),
      "p1",
    );
    expect(effects).toEqual([
      {
        type: "sendRequest",
        id: "project/p1/mediaImport/form",
        request: formRequest,
      },
    ]);
  });

  it("shows the form that arrives", () => {
    const opened = { ...showingForm, form: null };
    const arrived = actions.requestSettled(
      "project/p1/mediaImport/form",
      formRequest,
      { ok: true, data: subtitlesForm },
    );
    const [wizard] = updateMediaImport(opened, arrived, "p1");
    expect(wizard?.form).toBe(subtitlesForm);
  });

  it("says so when the form cannot load", () => {
    const opened = { ...showingForm, form: null };
    const failed = actions.requestSettled(
      "project/p1/mediaImport/form",
      formRequest,
      failure(""),
    );
    const [wizard] = updateMediaImport(opened, failed, "p1");
    expect(wizard?.error).toBe("The plugin's form could not load.");
  });

  it("sends the pressed action with the form's input", () => {
    const [, effects] = updateMediaImport(
      showingForm,
      actions.mediaImportStepTaken("add", input),
      "p1",
    );
    expect(effects).toEqual([
      {
        type: "sendRequest",
        id: "project/p1/mediaImport/step",
        request: stepRequest,
      },
    ]);
  });

  it("sends nothing while the plugin answers an earlier action", () => {
    const [, effects] = updateMediaImport(
      awaitingStep,
      actions.mediaImportStepTaken("add", input),
      "p1",
    );
    expect(effects).toEqual([]);
  });

  it("shows the next form the plugin answers with", () => {
    const next = { ...subtitlesForm, title: "Next" };
    const [wizard] = updateMediaImport(
      awaitingStep,
      stepAnswered({ kind: "form", form: next }),
      "p1",
    );
    expect(wizard?.form).toBe(next);
  });

  it("watches the fetch that a step starts", () => {
    const [, effects] = updateMediaImport(
      awaitingStep,
      stepAnswered({ kind: "job", job: runningMediaSourceJob }),
      "p1",
    );
    expect(effects).toEqual([
      {
        type: "watchJob",
        job: { kind: "mediaSource", request: statusRequest },
      },
    ]);
  });

  it("says what the plugin reported when a step fails", () => {
    const failed = actions.requestSettled(
      "project/p1/mediaImport/step",
      stepRequest,
      failure("no such video"),
    );
    const [wizard] = updateMediaImport(awaitingStep, failed, "p1");
    expect(wizard?.error).toBe("no such video");
  });

  it("names the chosen subtitles that the fetch did not add", () => {
    const [, effects] = updateMediaImport(
      fetching,
      fetchChecked({
        status: "done",
        media_file: pilot,
        skipped_subtitles: [skippedEnglish],
      }),
      "p1",
    );
    expect(effects).toEqual([
      {
        type: "showNotification",
        message:
          "The subtitles “English (automatic)” were not added: the plugin did not fetch it.",
      },
    ]);
  });

  it("names no skipped subtitles when the fetch added no file", () => {
    const [, effects] = updateMediaImport(
      fetching,
      fetchChecked({ status: "done", skipped_subtitles: [skippedEnglish] }),
      "p1",
    );
    expect(effects).toEqual([]);
  });

  it("says the media could not be added when the fetch's status cannot be fetched", () => {
    const lost = actions.requestSettled(jobKey, statusRequest, failure(""));
    const [wizard] = updateMediaImport(fetching, lost, "p1");
    expect(wizard?.error).toBe("The media could not be added.");
  });

  it("stops watching the fetch when another action is taken", () => {
    const [, effects] = updateMediaImport(
      fetching,
      actions.mediaImportStepTaken("add", input),
      "p1",
    );
    expect(effects).toContainEqual({ type: "unwatchJob", key: jobKey });
  });

  it("aborts the form and step requests when the dialog closes", () => {
    const [, effects] = updateMediaImport(
      fetching,
      actions.mediaImportClosed(),
      "p1",
    );
    expect(effects).toEqual(
      expect.arrayContaining([
        { type: "abortRequest", id: "project/p1/mediaImport/form" },
        { type: "abortRequest", id: "project/p1/mediaImport/step" },
      ]),
    );
  });

  it("stops watching the fetch when the dialog closes", () => {
    const [, effects] = updateMediaImport(
      fetching,
      actions.mediaImportClosed(),
      "p1",
    );
    expect(effects).toContainEqual({ type: "unwatchJob", key: jobKey });
  });

  it("ignores a form that arrives after the dialog was closed", () => {
    const arrived = actions.requestSettled(
      "project/p1/mediaImport/form",
      formRequest,
      { ok: true, data: subtitlesForm },
    );
    const [wizard] = updateMediaImport(null, arrived, "p1");
    expect(wizard).toBeNull();
  });

  it("ignores an answer that was aborted", () => {
    const aborted = actions.requestSettled(
      "project/p1/mediaImport/step",
      stepRequest,
      { ok: false, error: { status: "ABORTED", message: "aborted" } },
    );
    const [wizard] = updateMediaImport(awaitingStep, aborted, "p1");
    expect(wizard).toBe(awaitingStep);
  });
});
