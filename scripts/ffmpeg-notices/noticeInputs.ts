import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

/** What the generator learned about one manifest entry by downloading its archive. */
export interface RecordedBuild {
  url: string;
  sha256: string;
  /** The configure line embedded in the build's ffmpeg binary. */
  configuration: string;
}

/**
 * Everything the notices are rendered from, kept in the repository so that the
 * check can render them again without downloading archives or license texts.
 */
export interface NoticeInputs {
  builds: Record<string, RecordedBuild>;
  /** License texts keyed by the URL they were fetched from. */
  licenseTexts: Record<string, string>;
}

const inputsPath = fileURLToPath(new URL("noticeInputs.json", import.meta.url));

export function readNoticeInputs(): NoticeInputs {
  try {
    return JSON.parse(readFileSync(inputsPath, "utf-8"));
  } catch {
    return { builds: {}, licenseTexts: {} };
  }
}

export function writeNoticeInputs(inputs: NoticeInputs): void {
  writeFileSync(inputsPath, `${JSON.stringify(inputs, null, 2)}\n`);
}
