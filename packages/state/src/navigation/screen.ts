/** The screen the app shows. */
export type Screen =
  | { kind: "home" }
  | { kind: "newProject" }
  | { kind: "project"; projectId: string }
  | { kind: "media"; projectId: string; mediaId: string };
