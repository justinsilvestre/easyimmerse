import type {
  Dictionary,
  DictionarySummary,
  ImportJobStarted,
  ImportJobStatus,
} from "@easyimmerse/types";
import type { BackendResult } from "./backendClient.ts";

/**
 * Keeps each dictionary parsed without a server as an import job that is already done,
 * so that the status query finds the same outcome a server would report.
 */
export function createOfflineImportJobs() {
  const jobs = new Map<string, ImportJobStatus>();
  return {
    finish(dictionary: Dictionary): ImportJobStarted {
      const id = String(jobs.size + 1);
      jobs.set(id, doneJob(id, dictionary));
      return { id };
    },
    status(id: string): BackendResult<ImportJobStatus> {
      const job = jobs.get(id);
      if (job === undefined)
        return {
          error: {
            status: 404,
            code: "not_found",
            message: `no import job has the id "${id}"`,
          },
        };
      return { data: job };
    },
  };
}

function doneJob(id: string, dictionary: Dictionary): ImportJobStatus {
  const summary = summarize(id, dictionary);
  return {
    state: "done",
    progress: {
      entries: summary.entry_count,
      term_meta: summary.term_meta_count,
      kanji: summary.kanji_count,
      kanji_meta: summary.kanji_meta_count,
      tags: summary.tag_count,
      media: summary.media_count,
    },
    dictionary: summary,
    error: null,
  };
}

function summarize(id: string, dictionary: Dictionary): DictionarySummary {
  const { metadata } = dictionary;
  return {
    id,
    title: metadata.title,
    format: metadata.format,
    source_language: metadata.sourceLanguage,
    target_language: metadata.targetLanguage,
    entry_count: dictionary.entries.length,
    term_meta_count: dictionary.termMeta.length,
    tag_count: dictionary.tags.length,
    kanji_count: dictionary.kanjiEntries.length,
    kanji_meta_count: dictionary.kanjiMeta.length,
    media_count: 0,
  };
}
