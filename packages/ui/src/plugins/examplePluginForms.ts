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

/** The second form of a video site's import interface, after the URL was looked up. */
export const exampleLookedUpForm: PluginForm = {
  title: "Add from a video site",
  description: null,
  fields: [
    {
      id: "summary",
      label: "Video",
      hint: null,
      control: { kind: "note", text: "A walk through the old town · 12:34" },
    },
    {
      id: "url",
      label: "URL or video ID",
      hint: null,
      control: {
        kind: "text",
        value: "https://videos.example.com/watch/abc123def45",
        placeholder: null,
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
          { id: "en", label: "English (automatic)", hint: null },
        ],
        chosen: ["ja", "en"],
      },
    },
  ],
  actions: [
    { id: "look-up", label: "Look up", style: "secondary" },
    { id: "add", label: "Add", style: "primary" },
  ],
};

/** The media interface of a video site, for a file that holds one of its subtitle tracks. */
export const exampleSourceMediaForm: PluginForm = {
  title: "A walk through the old town",
  description: null,
  fields: [
    {
      id: "fetch",
      label: "Subtitles to fetch",
      hint: null,
      control: {
        kind: "choose-many",
        options: [
          { id: "en", label: "English (automatic)", hint: null },
          { id: "fr", label: "French (automatic)", hint: null },
        ],
        chosen: [],
      },
    },
    {
      id: "remove",
      label: "Subtitles to remove",
      hint: null,
      control: {
        kind: "choose-many",
        options: [{ id: "track-1", label: "Japanese", hint: null }],
        chosen: [],
      },
    },
  ],
  actions: [{ id: "apply", label: "Apply", style: "primary" }],
};
