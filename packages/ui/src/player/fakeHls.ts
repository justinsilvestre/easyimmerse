import type { HlsClass } from "./loadHls.ts";

type ErrorListener = (event: string, data: FakeErrorData) => void;

export type FakeErrorData = {
  type: string;
  details: string;
  fatal: boolean;
};

/** One fake hls.js instance, recording what the player did with it. */
export type FakeHlsInstance = {
  sourceUrl: string | null;
  media: HTMLMediaElement | null;
  destroyed: boolean;
  recoveries: number;
  authorizationHeader: string | null;
  emitError: (data: FakeErrorData) => void;
};

/** A stand-in for the hls.js class, for tests and stories. The instances it creates are listed on `instances`. */
export function createFakeHls(options: { supported?: boolean } = {}) {
  const instances: FakeHlsInstance[] = [];
  class FakeHls {
    static Events = { ERROR: "hlsError" };
    static ErrorTypes = {
      NETWORK_ERROR: "networkError",
      MEDIA_ERROR: "mediaError",
      OTHER_ERROR: "otherError",
    };
    static isSupported = () => options.supported ?? true;
    private readonly listeners: ErrorListener[] = [];
    readonly record: FakeHlsInstance;
    constructor(config: {
      xhrSetup?: (xhr: XMLHttpRequest, url: string) => void;
    }) {
      this.record = {
        sourceUrl: null,
        media: null,
        destroyed: false,
        recoveries: 0,
        authorizationHeader: readAuthorization(config.xhrSetup),
        emitError: (data) => {
          for (const listener of this.listeners) listener("hlsError", data);
        },
      };
      instances.push(this.record);
    }
    on(_event: string, listener: ErrorListener) {
      this.listeners.push(listener);
    }
    loadSource(url: string) {
      this.record.sourceUrl = url;
    }
    attachMedia(element: HTMLMediaElement) {
      this.record.media = element;
    }
    recoverMediaError() {
      this.record.recoveries += 1;
    }
    destroy() {
      this.record.destroyed = true;
    }
  }
  return { Hls: FakeHls as unknown as HlsClass, instances };
}

function readAuthorization(
  xhrSetup: ((xhr: XMLHttpRequest, url: string) => void) | undefined,
): string | null {
  if (xhrSetup === undefined) return null;
  let header: string | null = null;
  const xhr = {
    setRequestHeader: (name: string, value: string) => {
      if (name.toLowerCase() === "authorization") header = value;
    },
  } as unknown as XMLHttpRequest;
  xhrSetup(xhr, "");
  return header;
}
