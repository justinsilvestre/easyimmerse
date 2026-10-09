import { importForm, importStep, mediaForm, mediaStep } from "./forms.js";
import { tryDownload, tryGet, tryRun } from "./probe.js";
import { fetchSubtitles, resolve } from "./resolve.js";

/**
 * The `media-source` export. A function returns the `ok` value of its WIT result,
 * and throws a `plugin-error` variant for the `err` value.
 */
export const mediaSource = {
  importForm: (_context) => importForm(),
  importStep: (_context, action, input) => importStep(action, input),
  import: (request, outputDir) =>
    resolve(request.locator, outputDir, request.subtitles),
  mediaForm: (context) => mediaForm(context),
  mediaStep: (context, action, input) => mediaStep(context, action, input),
  fetchSubtitles: (request, outputDir) =>
    fetchSubtitles(request.locator, outputDir, request.subtitles),
};

/** The test-only `sandbox-probe` export. */
export const sandboxProbe = { tryRun, tryGet, tryDownload };
