import type { BrowserContext, Page } from "playwright";

/** What the page records once Storybook has rendered the story, or given up on it. */
type RenderOutcome =
  | { status: "rendered" }
  | { status: "error"; message: string };

const renderTimeoutMs = 30_000;
const mediaTimeoutMs = 10_000;

/** Makes every page in the context record Storybook's render outcome on `window.__storybookDiff`. */
export async function recordRenderOutcomes(
  context: BrowserContext,
): Promise<void> {
  await context.addInitScript(installRenderRecorder);
}

/**
 * A Storybook preview page that shows one story at a time in a fixed theme.
 * The preview is loaded once; later stories are switched to through Storybook's own channel,
 * which is far faster than loading the preview again for each.
 */
export class StoryPage {
  private currentStoryId: string | null = null;
  private readonly page: Page;
  private readonly baseUrl: string;
  private readonly theme: string;

  constructor(page: Page, baseUrl: string, theme: string) {
    this.page = page;
    this.baseUrl = baseUrl;
    this.theme = theme;
  }

  /**
   * Shows the story, waits until it has rendered and its fonts and media have loaded, then screenshots it.
   * The screenshot is cropped to the story's content, which may extend past the viewport.
   */
  async capture(storyId: string, outputPath: string): Promise<void> {
    await this.show(storyId);
    const outcome = await awaitRenderOutcome(this.page);
    if (outcome.status === "error") throw new Error(outcome.message);
    await this.page.evaluate(awaitFontsAndMedia, mediaTimeoutMs);
    const clip = await this.page.evaluate(measureContent);
    await this.page.screenshot({
      path: outputPath,
      fullPage: true,
      clip,
      animations: "disabled",
      caret: "hide",
      scale: "css",
    });
  }

  private async show(storyId: string): Promise<void> {
    if (this.currentStoryId === null) {
      await this.page.goto(storyUrl(this.baseUrl, storyId, this.theme));
    } else {
      await this.page.evaluate(switchStory, storyId);
    }
    this.currentStoryId = storyId;
  }
}

/** The preview URL of a story in one theme. `baseUrl` must end with a slash. */
export function storyUrl(
  baseUrl: string,
  storyId: string,
  theme: string,
): string {
  const url = new URL("iframe.html", baseUrl);
  url.searchParams.set("id", storyId);
  url.searchParams.set("viewMode", "story");
  url.searchParams.set("globals", `theme:${theme}`);
  return url.href;
}

async function awaitRenderOutcome(page: Page): Promise<RenderOutcome> {
  const handle = await page.waitForFunction(
    () => (window as unknown as RecorderWindow).__storybookDiff,
    null,
    { timeout: renderTimeoutMs },
  );
  const outcome = await handle.jsonValue();
  if (outcome === null) throw new Error("The story never rendered.");
  return outcome;
}

interface RecorderWindow {
  __storybookDiff: RenderOutcome | null;
  __STORYBOOK_ADDONS_CHANNEL__?: Channel;
}

interface Channel {
  on(event: string, listener: (payload: unknown) => void): void;
  emit(event: string, payload: unknown): void;
}

/** Runs in the page. Asks Storybook to render another story, after clearing the last outcome. */
function switchStory(storyId: string): void {
  const recorder = window as unknown as RecorderWindow;
  recorder.__storybookDiff = null;
  recorder.__STORYBOOK_ADDONS_CHANNEL__?.emit("setCurrentStory", {
    storyId,
    viewMode: "story",
  });
}

/**
 * Runs in the page before any of its scripts. Storybook assigns its event channel to a global,
 * so a setter on that global can subscribe as soon as the channel exists.
 * The function must not reference anything outside itself, because only its source reaches the page.
 */
function installRenderRecorder(): void {
  const recorder = window as unknown as RecorderWindow;
  recorder.__storybookDiff = null;
  const describe = (payload: unknown): string => {
    if (payload instanceof Error) return payload.message;
    if (Array.isArray(payload)) return payload.map(describe).join("\n");
    if (typeof payload === "object" && payload !== null && "title" in payload) {
      const description =
        "description" in payload ? ` ${payload.description}` : "";
      return `${payload.title}${description}`;
    }
    return String(payload);
  };
  const failures = [
    "storyErrored",
    "storyThrewException",
    "playFunctionThrewException",
    "unhandledErrorsWhilePlaying",
    "storyMissing",
  ];
  let channel: Channel | undefined;
  Object.defineProperty(recorder, "__STORYBOOK_ADDONS_CHANNEL__", {
    configurable: true,
    get: () => channel,
    set: (next: Channel) => {
      channel = next;
      for (const event of ["storyRendered", "storyUnchanged"]) {
        next.on(event, () => {
          recorder.__storybookDiff = { status: "rendered" };
        });
      }
      for (const event of failures) {
        next.on(event, (payload) => {
          recorder.__storybookDiff = {
            status: "error",
            message: describe(payload),
          };
        });
      }
    },
  });
}

/** Runs in the page. Resolves once fonts, images, and the first video frames are ready, or after the timeout. */
function awaitFontsAndMedia(timeoutMs: number): Promise<void> {
  const settled = (target: EventTarget, events: string[]) =>
    new Promise<void>((resolve) => {
      for (const event of events) {
        target.addEventListener(event, () => resolve(), { once: true });
      }
    });
  const videos = [...document.querySelectorAll("video")]
    .filter((video) => video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA)
    .map((video) => settled(video, ["loadeddata", "error"]));
  const images = [...document.images]
    .filter((image) => !image.complete)
    .map((image) => settled(image, ["load", "error"]));
  const ready = Promise.all([document.fonts.ready, ...videos, ...images]);
  const timeout = new Promise<void>((resolve) =>
    setTimeout(resolve, timeoutMs),
  );
  return Promise.race([ready.then(() => undefined), timeout]);
}

/**
 * Runs in the page. Measures the box around the story root and anything drawn outside it,
 * such as a modal dialog, a popover, or a menu positioned beside its button.
 */
function measureContent(): {
  x: number;
  y: number;
  width: number;
  height: number;
} {
  const root = document.getElementById("storybook-root") ?? document.body;
  const isOverlay = (element: Element) =>
    element.matches("dialog[open], :popover-open") ||
    ["fixed", "absolute"].includes(getComputedStyle(element).position);
  const rects = [root, ...[...root.querySelectorAll("*")].filter(isOverlay)]
    .map((element) => element.getBoundingClientRect())
    .filter((rect) => rect.width > 0 && rect.height > 0);
  const left = Math.max(0, Math.min(...rects.map((rect) => rect.left)));
  const top = Math.max(0, Math.min(...rects.map((rect) => rect.top)));
  const right = Math.max(...rects.map((rect) => rect.right));
  const bottom = Math.max(...rects.map((rect) => rect.bottom));
  return {
    x: Math.floor(left + window.scrollX),
    y: Math.floor(top + window.scrollY),
    width: Math.max(1, Math.ceil(right - left)),
    height: Math.max(1, Math.ceil(bottom - top)),
  };
}
