import { mkdir } from "node:fs/promises";
import { join } from "node:path";

import { type Browser, type BrowserContext, chromium } from "playwright";

import { type CaptureManifest, writeManifest } from "./captureManifest.ts";
import {
  type CaptureVariant,
  captureVariants,
  fixedTime,
  variantFileName,
} from "./captureVariants.ts";
import { serveDirectory } from "./serveDirectory.ts";
import { readStoryIndex, type StoryEntry } from "./storyIndex.ts";
import { recordRenderOutcomes, StoryPage } from "./storyPage.ts";

export interface CaptureOptions {
  storybookDir: string;
  outputDir: string;
  /** How many stories are captured at once. */
  concurrency: number;
}

/**
 * Screenshots every story of a built Storybook in every variant into `outputDir`,
 * one directory per story, and writes the manifest beside them.
 * A story that fails to render is recorded in the manifest instead of stopping the run.
 */
export async function captureStories(
  options: CaptureOptions,
): Promise<CaptureManifest> {
  const stories = await readStoryIndex(options.storybookDir);
  const server = await serveDirectory(options.storybookDir);
  const browser = await chromium.launch();
  const errors = new Map<string, string>();
  try {
    for (const variant of captureVariants) {
      const capture = { browser, baseUrl: server.url, variant, errors };
      await captureVariant(capture, stories, options);
    }
  } finally {
    await browser.close();
    await server.close();
  }
  const manifest = buildManifest(stories, errors);
  await writeManifest(options.outputDir, manifest);
  return manifest;
}

interface VariantCapture {
  browser: Browser;
  baseUrl: string;
  variant: CaptureVariant;
  errors: Map<string, string>;
}

async function captureVariant(
  capture: VariantCapture,
  stories: StoryEntry[],
  options: CaptureOptions,
): Promise<void> {
  const label = variantFileName(capture.variant).replace(".png", "");
  console.log(`Capturing ${stories.length} stories as ${label}`);
  const context = await newContext(capture.browser, capture.variant);
  await context.clock.setFixedTime(fixedTime);
  await recordRenderOutcomes(context);
  const queue = [...stories];
  const workers = Array.from({ length: options.concurrency }, () =>
    runWorker(context, capture, queue, options.outputDir),
  );
  await Promise.all(workers);
  await context.close();
}

function newContext(
  browser: Browser,
  variant: CaptureVariant,
): Promise<BrowserContext> {
  const { width, height } = variant.viewport;
  return browser.newContext({
    viewport: { width, height },
    colorScheme: variant.theme,
    reducedMotion: "reduce",
    timezoneId: "UTC",
    locale: "en-US",
  });
}

async function runWorker(
  context: BrowserContext,
  capture: VariantCapture,
  queue: StoryEntry[],
  outputDir: string,
): Promise<void> {
  const page = await context.newPage();
  const storyPage = new StoryPage(page, capture.baseUrl, capture.variant.theme);
  for (let story = queue.shift(); story; story = queue.shift()) {
    const storyDir = join(outputDir, story.id);
    await mkdir(storyDir, { recursive: true });
    const path = join(storyDir, variantFileName(capture.variant));
    await storyPage.capture(story.id, path).catch((error) => {
      recordError(capture, story, error);
    });
  }
  await page.close();
}

function recordError(
  capture: VariantCapture,
  story: StoryEntry,
  error: unknown,
): void {
  const label = variantFileName(capture.variant).replace(".png", "");
  const message = error instanceof Error ? error.message : String(error);
  console.error(`  ${story.id} (${label}): ${message}`);
  if (!capture.errors.has(story.id))
    capture.errors.set(story.id, `${label}: ${message}`);
}

function buildManifest(
  stories: StoryEntry[],
  errors: Map<string, string>,
): CaptureManifest {
  return {
    variants: captureVariants,
    stories: stories.map((story) => {
      const error = errors.get(story.id);
      return error === undefined ? story : { ...story, error };
    }),
  };
}
