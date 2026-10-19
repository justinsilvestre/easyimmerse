import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

import type { ComparisonReport } from "./compareCaptures.ts";

/** What the report page shows besides the changes. */
export interface ReportLabels {
  /** The Storybook the changed stories can be opened in, such as a deployed preview. */
  storybookUrl?: string;
  /** Describes the earlier capture, such as a branch name or commit. */
  baseLabel?: string;
}

const templatePath = join(import.meta.dirname, "report.html");

/** Writes `index.html` into the report directory, with the report embedded so the page works from a file or any static host. */
export async function writeReport(
  reportDir: string,
  report: ComparisonReport,
  labels: ReportLabels = {},
): Promise<void> {
  const template = await readFile(templatePath, "utf8");
  const html = template.replace(
    '"__REPORT__"',
    embedJson({ ...report, ...labels }),
  );
  await writeFile(join(reportDir, "index.html"), html);
}

/** Serializes for a script element, where a closing tag inside a string would end the element early. */
export function embedJson(value: unknown): string {
  return JSON.stringify(value).replaceAll("</", "<\\/");
}
