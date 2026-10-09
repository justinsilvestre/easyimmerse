import { download, get } from "easyimmerse:plugin/http@0.1.0";
import { run } from "easyimmerse:plugin/run-command@0.1.0";

/**
 * Asks the host to run a command, discarding its output. The host tests use
 * this to check that only bundled executables are permitted.
 *
 * @param {string} command
 */
export function tryRun(command) {
  run(command, []);
}

/**
 * Asks the host to fetch a URL, discarding the response. The host tests use
 * this to check that only allowlisted hosts are permitted.
 *
 * @param {string} url
 */
export function tryGet(url) {
  get(url);
}

/**
 * Asks the host to download a URL into a file. The host tests use this to
 * check that only allowlisted hosts and granted paths are permitted.
 *
 * @param {string} url
 * @param {string} path
 * @returns {bigint}
 */
export function tryDownload(url, path) {
  return download(url, path);
}
