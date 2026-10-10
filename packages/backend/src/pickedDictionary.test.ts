import type { PickedDictionaryFile } from "@easyimmerse/state";
import { createBrowserFileRegistry } from "@easyimmerse/state";
import type { TableLayout } from "@easyimmerse/types";
import { describe, expect, it } from "vitest";
import type { BackendRequest } from "./backendClient.ts";
import type { BackendThunkExtra } from "./injectedBaseQuery.ts";
import {
  importPickedDictionary,
  previewPickedDictionaryTable,
} from "./pickedDictionary.ts";

const onDisk: PickedDictionaryFile = {
  name: "jmdict.zip",
  source: { kind: "path", path: "/d/jmdict.zip" },
};

const layout: TableLayout = { columns: ["term", "ignored"], hasHeader: true };

function recordingBaseQuery() {
  const requests: BackendRequest[] = [];
  const baseQuery = async (request: BackendRequest) => {
    requests.push(request);
    return { data: { id: "job1" } };
  };
  return { requests, baseQuery };
}

function extraWith(
  browserFileRegistry: BackendThunkExtra["browserFileRegistry"],
): BackendThunkExtra {
  return {
    client: { send: async () => ({ data: null as never }) },
    browserFileRegistry,
    failedPassages: { retryTimes: {} },
  };
}

function heldFile(name: string) {
  const registry = createBrowserFileRegistry<File>();
  const file = new File([new Uint8Array([80, 75])], name, { lastModified: 1 });
  return {
    extra: extraWith(registry),
    file: { name, source: registry.register(file) },
  };
}

describe("importPickedDictionary", () => {
  it("has the server import a file on its disk", async () => {
    const { requests, baseQuery } = recordingBaseQuery();
    await importPickedDictionary({ file: onDisk }, extraWith(null), baseQuery);
    expect(requests).toEqual([
      {
        method: "POST",
        path: "/dictionaries/import-local",
        body: { kind: "json", value: { path: "/d/jmdict.zip" } },
      },
    ]);
  });

  it("sends the columns the user chose for a table on disk", async () => {
    const { requests, baseQuery } = recordingBaseQuery();
    const table = {
      name: "a.csv",
      source: { kind: "path", path: "/d/a.csv" },
    } as const;
    await importPickedDictionary(
      { file: table, tableLayout: layout },
      extraWith(null),
      baseQuery,
    );
    expect(requests[0]?.body).toEqual({
      kind: "json",
      value: { path: "/d/a.csv", tableLayout: layout },
    });
  });

  it("sends the bytes of a file the browser holds as a raw body", async () => {
    const { requests, baseQuery } = recordingBaseQuery();
    const { extra, file } = heldFile("jmdict.zip");
    await importPickedDictionary({ file }, extra, baseQuery);
    expect(requests[0]?.body).toEqual({
      kind: "bytes",
      value: new Uint8Array([80, 75]),
      contentType: "application/octet-stream",
    });
  });

  it("puts the file name and a chosen table layout in the query string", async () => {
    const { requests, baseQuery } = recordingBaseQuery();
    const { extra, file } = heldFile("words.csv");
    await importPickedDictionary(
      { file, tableLayout: layout },
      extra,
      baseQuery,
    );
    expect(requests[0]?.query).toEqual({
      fileName: "words.csv",
      columns: "term,ignored",
      hasHeader: "true",
    });
  });

  it("carries the file in the offline operation", async () => {
    const { requests, baseQuery } = recordingBaseQuery();
    const { extra, file } = heldFile("words.csv");
    await importPickedDictionary({ file }, extra, baseQuery);
    expect(requests[0]?.offlineOperation).toEqual({
      kind: "importDictionary",
      fileName: "words.csv",
      bytes: new Uint8Array([80, 75]),
      tableLayout: null,
    });
  });

  it("fails without a request for a file the browser no longer holds", async () => {
    const { requests, baseQuery } = recordingBaseQuery();
    const { file } = heldFile("jmdict.zip");
    await importPickedDictionary(
      { file },
      extraWith(createBrowserFileRegistry<File>()),
      baseQuery,
    );
    expect(requests).toEqual([]);
  });
});

describe("previewPickedDictionaryTable", () => {
  it("has the server preview a table on its disk", async () => {
    const { requests, baseQuery } = recordingBaseQuery();
    const table = {
      name: "a.csv",
      source: { kind: "path", path: "/d/a.csv" },
    } as const;
    await previewPickedDictionaryTable(
      { file: table },
      extraWith(null),
      baseQuery,
    );
    expect(requests).toEqual([
      {
        method: "POST",
        path: "/dictionaries/preview-local",
        body: { kind: "json", value: { path: "/d/a.csv" } },
      },
    ]);
  });

  it("sends the bytes of a table the browser holds to be previewed", async () => {
    const { requests, baseQuery } = recordingBaseQuery();
    const { extra, file } = heldFile("words.csv");
    await previewPickedDictionaryTable({ file }, extra, baseQuery);
    expect(requests[0]?.path).toBe("/dictionaries/preview");
  });

  it("returns the failure of a file that cannot be read", async () => {
    const { baseQuery } = recordingBaseQuery();
    const { file } = heldFile("words.csv");
    expect(
      await previewPickedDictionaryTable({ file }, extraWith(null), baseQuery),
    ).toMatchObject({ error: { code: "browserFileUnreachable" } });
  });
});
