import { get } from "easyimmerse:plugin/http@0.1.0";
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
