import { describe, expect, it } from "vitest";
import { attachHls } from "./attachHls.ts";
import type { FakeHlsInstance } from "./fakeHls.ts";
import { createFakeHls } from "./fakeHls.ts";

const source = {
  url: "http://127.0.0.1:1/conversions/k/index.m3u8",
  authorization: "Bearer t0k3n",
};

function attach(options: { supported?: boolean } = {}) {
  const { Hls, instances } = createFakeHls(options);
  const failures: string[] = [];
  const element = document.createElement("video");
  const dispose = attachHls(
    Hls,
    element,
    source,
    (cause) => failures.push(cause),
    () => undefined,
  );
  return {
    instance: instances[0] as FakeHlsInstance,
    failures,
    element,
    dispose,
  };
}

const fatalMediaError = {
  type: "mediaError",
  details: "bufferAppendError",
  fatal: true,
};

describe("attachHls", () => {
  it("loads the playlist URL", () => {
    expect(attach().instance.sourceUrl).toBe(source.url);
  });

  it("attaches the media element", () => {
    const { instance, element } = attach();
    expect(instance.media).toBe(element);
  });

  it("sends the bearer header with every request", () => {
    expect(attach().instance.authorizationHeader).toBe("Bearer t0k3n");
  });

  it("recovers from the first fatal media error", () => {
    const { instance } = attach();
    instance.emitError(fatalMediaError);
    expect(instance.recoveries).toBe(1);
  });

  it("reports nothing on the first fatal media error", () => {
    const { instance, failures } = attach();
    instance.emitError(fatalMediaError);
    expect(failures).toEqual([]);
  });

  it("reports the second fatal media error", () => {
    const { instance, failures } = attach();
    instance.emitError(fatalMediaError);
    instance.emitError(fatalMediaError);
    expect(failures).toEqual(["The converted stream could not be decoded."]);
  });

  it("reports a fatal network error at once", () => {
    const { instance, failures } = attach();
    instance.emitError({
      type: "networkError",
      details: "manifestLoadError",
      fatal: true,
    });
    expect(failures).toEqual([
      "The converted stream could not be loaded from the server.",
    ]);
  });

  it("ignores errors that are not fatal", () => {
    const { instance, failures } = attach();
    instance.emitError({
      type: "networkError",
      details: "fragLoadError",
      fatal: false,
    });
    expect(failures).toEqual([]);
  });

  it("destroys the instance when disposed", () => {
    const { instance, dispose } = attach();
    dispose();
    expect(instance.destroyed).toBe(true);
  });

  it("reports an unsupported browser without creating an instance", () => {
    const { Hls, instances } = createFakeHls({ supported: false });
    const failures: string[] = [];
    attachHls(Hls, document.createElement("video"), source, (cause) =>
      failures.push(cause),
    );
    expect([failures, instances.length]).toEqual([
      ["This browser cannot play converted media."],
      0,
    ]);
  });
});
