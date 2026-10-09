import { writeFile } from "easyimmerse:plugin/fs@0.1.0";
import { get } from "easyimmerse:plugin/http@0.1.0";
import { progress } from "easyimmerse:plugin/log@0.1.0";
import { run } from "easyimmerse:plugin/run-command@0.1.0";

/** The id the fixture offers its one English subtitle track under. */
export const SUBTITLE_ID = "en";

/** The name of the fixture's one subtitle track. */
export const SUBTITLE_NAME = "English";

/**
 * The JSON that the bundled `fetch-locator` script prints for a locator.
 *
 * @typedef {{ media_url: string, subtitle_url: string, title: string }} LocatorInfo
 */

/**
 * @param {string} locator
 * @param {string} outputDir
 * @param {string[]} subtitles
 */
export function resolve(locator, outputDir, subtitles) {
  const info = fetchLocator(locator);
  report(0, "resolved locator");
  const mediaPath = `${outputDir}/media.mp4`;
  download(info.media_url, mediaPath);
  report(0.5, "downloaded media");
  const fetched = writeSubtitles(info, outputDir, subtitles);
  report(1, "downloaded subtitles");
  return { metadata: metadata(info), mediaPath, subtitles: fetched };
}

/**
 * @param {string} locator
 * @param {string} outputDir
 * @param {string[]} subtitles
 */
export function fetchSubtitles(locator, outputDir, subtitles) {
  return writeSubtitles(fetchLocator(locator), outputDir, subtitles);
}

/**
 * Writes the one subtitle track when it was asked for; any other id is unknown.
 *
 * @param {LocatorInfo} info
 * @param {string} outputDir
 * @param {string[]} subtitles
 */
function writeSubtitles(info, outputDir, subtitles) {
  return subtitles.map((id) => {
    if (id !== SUBTITLE_ID) {
      throw {
        tag: "not-found",
        val: `no subtitle track ${JSON.stringify(id)}`,
      };
    }
    const path = `${outputDir}/subtitles.srt`;
    download(info.subtitle_url, path);
    return { id, language: "en", name: SUBTITLE_NAME, path };
  });
}

/** @param {LocatorInfo} info */
function metadata(info) {
  return { title: info.title, durationMs: undefined, mediaUrl: info.media_url };
}

/**
 * @param {string} locator
 * @returns {LocatorInfo}
 */
function fetchLocator(locator) {
  const output = run("fetch-locator", [locator]);
  try {
    return JSON.parse(output.stdout);
  } catch (error) {
    throw { tag: "invalid-input", val: `fetch-locator output: ${error}` };
  }
}

/**
 * @param {string} url
 * @param {string} path
 */
function download(url, path) {
  writeFile(path, get(url).body);
}

/**
 * @param {number} fraction
 * @param {string} message
 */
function report(fraction, message) {
  progress({ fraction, message });
}
