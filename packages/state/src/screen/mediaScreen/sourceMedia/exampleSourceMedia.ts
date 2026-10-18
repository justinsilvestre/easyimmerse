import type {
  FormInput,
  PluginForm,
  SkippedSubtitle,
  SourceStepResponse,
} from "@easyimmerse/types";
import { actions } from "../../../app/appAction.ts";
import type { RequestOutcome } from "../../../server/serverRequest.ts";
import type { PluginFormWizard } from "../../pluginForm/pluginFormWizard.ts";

/** The media screen of m1 in project p1. */
export const sourceMediaRoute = {
  screen: "media",
  projectId: "p1",
  mediaFileId: "m1",
} as const;

/** A source form that offers subtitles to fetch. */
export const fetchForm: PluginForm = {
  title: "Subtitles from the video site",
  description: null,
  fields: [
    {
      id: "fetch",
      label: "Subtitles to fetch",
      hint: null,
      control: {
        kind: "choose-many",
        options: [{ id: "en", label: "English (automatic)", hint: null }],
        chosen: [],
      },
    },
  ],
  actions: [{ id: "apply", label: "Apply", style: "primary" }],
};

/** The input of the fetch form with the English track checked. */
export const englishChecked: FormInput[] = [{ field: "fetch", values: ["en"] }];

/** The source dialog showing the fetch form. */
export const showingFetchForm: PluginFormWizard = {
  form: fetchForm,
  isAwaitingAnswer: false,
  error: null,
};

/** The source dialog awaiting the plugin's answer to Apply. */
export const applyingFetchForm: PluginFormWizard = {
  ...showingFetchForm,
  isAwaitingAnswer: true,
};

/** The server's answer once the plugin's changes are applied. */
export const applied = (
  skipped: SkippedSubtitle[] = [],
): SourceStepResponse => ({
  kind: "applied",
  removed: [],
  tracks: [],
  selection: { target_track_id: null, translation_track_id: null },
  skipped,
});

/** The answer to the source form request of m1. */
export const sourceFormSettled = (outcome: RequestOutcome<"getSourceForm">) =>
  actions.requestSettled(
    "media/m1/sourceMedia/form",
    { kind: "getSourceForm", projectId: "p1", mediaFileId: "m1" },
    outcome,
  );

/** The answer to Apply with the English track checked on the fetch form of m1. */
export const sourceStepSettled = (
  outcome: RequestOutcome<"submitSourceStep">,
) =>
  actions.requestSettled(
    "media/m1/sourceMedia/step",
    {
      kind: "submitSourceStep",
      projectId: "p1",
      mediaFileId: "m1",
      request: { action: "apply", input: englishChecked },
      form: fetchForm,
    },
    outcome,
  );
