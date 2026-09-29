/** The types of the data exchanged between the API server and its clients. */

export type HealthReport = {
  status: "ok";
  /** The version of ffmpeg available to the server, or `null` when ffmpeg is unavailable. */
  ffmpegVersion: string | null;
};

export type Project = {
  id: number;
  name: string;
  /** The language the user is learning, as a BCP 47 language tag. */
  targetLanguage: string;
  /** The creation time in ISO 8601 format. */
  createdAt: string;
};

export type NewProject = Pick<Project, "name" | "targetLanguage">;
