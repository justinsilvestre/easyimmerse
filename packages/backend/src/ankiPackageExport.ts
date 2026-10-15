import type { AnkiPackageExport } from "@easyimmerse/state";
import type { AnkiPackageRequest, AnkiPackageSaved } from "@easyimmerse/types";
import type { BackendResult } from "./backendClient.ts";
import { contentDispositionFileName } from "./contentDispositionFileName.ts";
import { readBackendError } from "./httpBackendClient.ts";
import type { ServerQuery } from "./sendToAnki.ts";
import type { ServerFetch } from "./serverFetch.ts";

/** The flashcards of a project to export, the path to save the package at, or null to receive it, and whether to mark them exported. */
export type AnkiExportArgs = {
  projectId: string;
  flashcardIds: readonly string[];
  savePath: string | null;
  marksExported: boolean;
};

/** What an export works with: the server's JSON requests, its plain fetch for the package's bytes, and the signal that stops a download. */
export type AnkiExportDeps = {
  server: ServerQuery;
  serverFetch: ServerFetch | null;
  signal?: AbortSignal;
};

/** Exports flashcards as an Anki package: the server writes it at the save path, or answers with its bytes when there is none. */
export function exportAnkiPackage(
  args: AnkiExportArgs,
  deps: AnkiExportDeps,
): Promise<BackendResult<AnkiPackageExport>> {
  return args.savePath === null
    ? downloadPackage(args, deps)
    : savePackage(args, args.savePath, deps.server);
}

async function savePackage(
  args: AnkiExportArgs,
  savePath: string,
  server: ServerQuery,
): Promise<BackendResult<AnkiPackageExport>> {
  const result = await server({
    method: "POST",
    path: packagePath(args.projectId),
    body: { kind: "json", value: packageRequest(args, savePath) },
  });
  if ("error" in result) return result;
  const saved = result.data as AnkiPackageSaved;
  return {
    data: {
      kind: "saved",
      flashcardCount: saved.flashcard_count,
      skippedMediaCount: saved.skipped_media_count,
      markedDeletionCount: saved.marked_deletion_count,
    },
  };
}

async function downloadPackage(
  args: AnkiExportArgs,
  { serverFetch, signal }: AnkiExportDeps,
): Promise<BackendResult<AnkiPackageExport>> {
  if (serverFetch === null) return { error: needsServer };
  try {
    const response = await serverFetch(packagePath(args.projectId), {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(packageRequest(args, null)),
      signal,
    });
    if (!response.ok) return { error: await readBackendError(response) };
    return {
      data: await downloadedPackage(response, args.flashcardIds.length),
    };
  } catch (cause) {
    return { error: { status: "NETWORK", message: messageOf(cause) } };
  }
}

/** Reads a package the server answered with, named as its header says. */
async function downloadedPackage(
  response: Response,
  flashcardCount: number,
): Promise<AnkiPackageExport> {
  const { headers } = response;
  return {
    kind: "downloaded",
    fileName: contentDispositionFileName(
      headers.get("content-disposition"),
      "flashcards.apkg",
    ),
    bytes: new Uint8Array(await response.arrayBuffer()),
    flashcardCount,
    skippedMediaCount: Number(headers.get("x-easyimmerse-skipped-media")) || 0,
    markedDeletionCount:
      Number(headers.get("x-easyimmerse-marked-deletions")) || 0,
  };
}

const needsServer = {
  status: "OFFLINE",
  message: "Exporting an Anki package needs the easyImmerse server.",
} as const;

function packagePath(projectId: string): string {
  return `/projects/${projectId}/anki/package`;
}

function packageRequest(
  { flashcardIds, marksExported }: AnkiExportArgs,
  savePath: string | null,
): AnkiPackageRequest {
  return {
    flashcard_ids: [...flashcardIds],
    save_path: savePath,
    marks_exported: marksExported,
  };
}

function messageOf(cause: unknown): string {
  return cause instanceof Error ? cause.message : String(cause);
}
