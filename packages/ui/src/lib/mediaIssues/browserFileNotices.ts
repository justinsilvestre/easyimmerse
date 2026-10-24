/** The sentences shown for a file a web browser holds when this app cannot open it. */
export const browserFileNotices = {
  /** For an app with no access to files a browser picked, such as the desktop app. */
  unreachable:
    "This file was added in a web browser, and this app cannot reach it.",
  /** For a file the browser no longer holds, such as after the page reloaded. */
  notOpen: (use: "play" | "read") =>
    `This file is no longer open in the browser. Add it again to ${use} it.`,
};
