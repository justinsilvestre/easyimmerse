import type { PluginForm } from "@easyimmerse/types";

/** A form with one field of every control kind and an action of every style. */
export const exampleImportForm: PluginForm = {
  title: "Import from a video site",
  description: "The media and its subtitles are fetched through a media downloader.",
  fields: [
    {
      id: "locator",
      label: "URL",
      hint: null,
      control: { kind: "text", value: "", placeholder: "https://" },
    },
    {
      id: "quality",
      label: "Quality",
      hint: "Higher qualities take longer to fetch.",
      control: {
        kind: "choose-one",
        options: [
          { id: "best", label: "Best", hint: null },
          { id: "720p", label: "720p", hint: "About 1 GB an hour" },
          { id: "audio", label: "Audio only", hint: null },
        ],
        chosen: ["best"],
      },
    },
    {
      id: "subtitles",
      label: "Subtitles",
      hint: null,
      control: {
        kind: "choose-many",
        options: [
          { id: "ja", label: "Japanese", hint: null },
          { id: "en", label: "English", hint: "Generated automatically" },
        ],
        chosen: ["ja"],
      },
    },
    {
      id: "keep-original",
      label: "Keep the original file",
      hint: "Uses more disk space.",
      control: { kind: "toggle", on: false },
    },
    {
      id: "terms",
      label: "Terms",
      hint: null,
      control: {
        kind: "note",
        text: "Only fetch media you have the right to download.",
      },
    },
  ],
  actions: [
    { id: "forget", label: "Forget login", style: "destructive" },
    { id: "preview", label: "Preview", style: "secondary" },
    { id: "import", label: "Import", style: "primary" },
  ],
};

/** A form that only tells the user something and offers one action. */
export const exampleNoticeForm: PluginForm = {
  title: "Sign in required",
  description: null,
  fields: [
    {
      id: "notice",
      label: "Why",
      hint: null,
      control: {
        kind: "note",
        text: "This video is only available to signed-in viewers.",
      },
    },
  ],
  actions: [{ id: "retry", label: "Try again", style: "primary" }],
};
