import type { PluginForm } from "@easyimmerse/types";
import type { MediaImportWizard } from "./mediaImportWizard.ts";

/** A plugin form that asks which subtitles to fetch. */
export const subtitlesForm: PluginForm = {
  title: "Add from a video site",
  description: null,
  fields: [
    {
      id: "subtitles",
      label: "Subtitles",
      hint: null,
      control: {
        kind: "choose-many",
        options: [{ id: "en", label: "English (automatic)", hint: null }],
        chosen: ["en"],
      },
    },
  ],
  actions: [{ id: "add", label: "Add", style: "primary" }],
};

/** The import dialog of a video-site plugin, showing its subtitles form. */
export const showingForm: MediaImportWizard = {
  source: { name: "video-site", label: "Add from a video site" },
  form: subtitlesForm,
  isAwaitingAnswer: false,
  jobId: null,
  error: null,
};
