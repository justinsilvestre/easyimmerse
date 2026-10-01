import { info } from "easyimmerse:plugin/log@0.1.0";

export const hello = {
  greet(name) {
    info(`greeting ${name}`);
    return `Hello, ${name}`;
  },
  /** Loops until the host's fuel limit terminates the call. */
  loopForever() {
    for (;;) {}
  },
};
