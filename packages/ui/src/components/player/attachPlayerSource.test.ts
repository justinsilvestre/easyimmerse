import { describe, expect, it, vi } from "vitest";
import { attachPlayerSource } from "./attachPlayerSource.ts";
import { createFakeHls } from "./fakeHls.ts";

const directSource = {
  kind: "direct",
  url: "http://127.0.0.1:1/m.mp4",
} as const;
const hlsSource = {
  kind: "hls",
  url: "http://127.0.0.1:1/conversions/k/index.m3u8",
  authorization: "Bearer t",
} as const;

const flushPromises = () => new Promise((resolve) => setTimeout(resolve, 0));

describe("attachPlayerSource", () => {
  describe("with a direct source", () => {
    it("sets the element's src", () => {
      const element = document.createElement("video");
      attachPlayerSource(element, directSource, { onFailure: () => undefined });
      expect(element.getAttribute("src")).toBe(directSource.url);
    });

    it("removes the src when detached", () => {
      const element = document.createElement("video");
      const detach = attachPlayerSource(element, directSource, {
        onFailure: () => undefined,
      });
      detach();
      expect(element.hasAttribute("src")).toBe(false);
    });

    it("continues from the resume time once metadata has loaded", () => {
      const element = document.createElement("video");
      attachPlayerSource(element, directSource, {
        resumeAtSeconds: 42,
        onFailure: () => undefined,
      });
      element.dispatchEvent(new Event("loadedmetadata"));
      expect(element.currentTime).toBe(42);
    });

    it("stops waiting to resume when detached", () => {
      const element = document.createElement("video");
      const detach = attachPlayerSource(element, directSource, {
        resumeAtSeconds: 42,
        onFailure: () => undefined,
      });
      detach();
      element.dispatchEvent(new Event("loadedmetadata"));
      expect(element.currentTime).toBe(0);
    });
  });

  describe("with an HLS source", () => {
    it("feeds the playlist to hls.js once it has loaded", async () => {
      const { Hls, instances } = createFakeHls();
      const element = document.createElement("video");
      attachPlayerSource(element, hlsSource, {
        onFailure: () => undefined,
        loadHlsClass: async () => Hls,
      });
      await flushPromises();
      expect(instances[0]?.sourceUrl).toBe(hlsSource.url);
    });

    it("destroys hls.js when detached", async () => {
      const { Hls, instances } = createFakeHls();
      const detach = attachPlayerSource(
        document.createElement("video"),
        hlsSource,
        {
          onFailure: () => undefined,
          loadHlsClass: async () => Hls,
        },
      );
      await flushPromises();
      detach();
      expect(instances[0]?.destroyed).toBe(true);
    });

    it("never attaches when detached before hls.js has loaded", async () => {
      const { Hls, instances } = createFakeHls();
      const detach = attachPlayerSource(
        document.createElement("video"),
        hlsSource,
        {
          onFailure: () => undefined,
          loadHlsClass: async () => Hls,
        },
      );
      detach();
      await flushPromises();
      expect(instances).toHaveLength(0);
    });

    it("reports a failure to load hls.js", async () => {
      const onFailure = vi.fn();
      attachPlayerSource(document.createElement("video"), hlsSource, {
        onFailure,
        loadHlsClass: () => Promise.reject(new Error("offline")),
      });
      await flushPromises();
      expect(onFailure).toHaveBeenCalledWith(
        "The converted-media player could not be loaded.",
      );
    });
  });
});
