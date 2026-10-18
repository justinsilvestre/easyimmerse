import { describe, expect, it } from "vitest";
import { createRequestTable } from "./requestTable.ts";
import type {
  RequestOutcome,
  RunningRequest,
  ServerRequest,
} from "./serverRequest.ts";

const listing: ServerRequest = { kind: "listMediaFiles", projectId: "p1" };
const listed: RequestOutcome = { ok: true, data: { media_files: [] } };
const aborted: RequestOutcome = {
  ok: false,
  error: { status: "ABORTED", message: "Aborted" },
};

type Sent = {
  request: ServerRequest;
  settle(outcome: RequestOutcome): void;
  aborts: number;
};

/** A send function whose requests stay pending until a test settles them, recording each one. */
function createPendingSend() {
  const sent: Sent[] = [];
  const send = (request: ServerRequest): RunningRequest => {
    let settle: (outcome: RequestOutcome) => void = () => {};
    const settled = new Promise<RequestOutcome>((resolve) => {
      settle = resolve;
    });
    const record: Sent = { request, settle, aborts: 0 };
    sent.push(record);
    return {
      settled,
      abort: () => {
        record.aborts += 1;
        settle(aborted);
      },
    };
  };
  return { sent, send };
}

describe("createRequestTable", () => {
  it("sends the request through the given function", () => {
    const { sent, send } = createPendingSend();
    createRequestTable(send).send("a", listing, () => {});
    expect(sent.map(({ request }) => request)).toEqual([listing]);
  });

  it("passes the outcome to the settle callback once the request ends", async () => {
    const { sent, send } = createPendingSend();
    const outcomes: RequestOutcome[] = [];
    createRequestTable(send).send("a", listing, (outcome) =>
      outcomes.push(outcome),
    );
    sent[0]?.settle(listed);
    await Promise.resolve();
    expect(outcomes).toEqual([listed]);
  });

  it("aborts the request in flight when the same id is sent again", () => {
    const { sent, send } = createPendingSend();
    const requests = createRequestTable(send);
    requests.send("a", listing, () => {});
    requests.send("a", listing, () => {});
    expect(sent[0]?.aborts).toBe(1);
  });

  it("does not settle a request that a later send with its id replaced", async () => {
    const { sent, send } = createPendingSend();
    const settledIds: string[] = [];
    const requests = createRequestTable(send);
    requests.send("a", listing, () => settledIds.push("first"));
    requests.send("a", listing, () => settledIds.push("second"));
    sent[1]?.settle(listed);
    await Promise.resolve();
    expect(settledIds).toEqual(["second"]);
  });

  it("settles an aborted request with the outcome its abort gives", async () => {
    const { send } = createPendingSend();
    const outcomes: RequestOutcome[] = [];
    const requests = createRequestTable(send);
    requests.send("a", listing, (outcome) => outcomes.push(outcome));
    requests.abort("a");
    await Promise.resolve();
    expect(outcomes).toEqual([aborted]);
  });

  it("ignores aborting an id that is not in flight", () => {
    const { send } = createPendingSend();
    expect(() => createRequestTable(send).abort("a")).not.toThrow();
  });

  it("does not abort a request that has already settled when its id is sent again", async () => {
    const { sent, send } = createPendingSend();
    const requests = createRequestTable(send);
    requests.send("a", listing, () => {});
    sent[0]?.settle(listed);
    await Promise.resolve();
    requests.send("a", listing, () => {});
    expect(sent[0]?.aborts).toBe(0);
  });
});
