# Storybook screenshot diff

This tool shows you which stories in `packages/ui` your change affects. It screenshots every story before and after the change, compares them, and gives you a report page of everything that was **added, removed, changed, or broke**, with the differing pixels marked in red.

There is **no hosted service and no stored baseline**. The "before" screenshots come from a build of the commit your branch started from, so you always compare against exactly that commit.

## Local runs with `mise run storybook-diff`

```sh
mise run storybook-diff                 # against main
mise run storybook-diff -- --base <ref> # against another branch or commit
mise run storybook-diff -- --no-open    # print the report path instead of opening it
```

Before the first run, install Chromium for Playwright: `mise exec -- pnpm exec playwright install chromium`.

- **The first run takes about ten minutes**, because it builds and screenshots the base commit as well as your working tree.
- **Later runs against the same base take about five**, because the base commit's screenshots are kept.
- Everything goes in `.dev/storybook-diff/`, which git ignores and which you can delete at any time.
- The report is written to `.dev/storybook-diff/report/index.html`.

## Report screenshots and controls

Every story is screenshotted:

- in the **light and dark themes**;
- at a **phone width** (390 × 844) and a **desktop width** (1280 × 800);
- **cropped to the story's content**, including dialogs and menus and anything that runs past the viewport, so a small component isn't lost in a mostly empty page.

Each story is a collapsible section. Its header stays at the top of the screen while you scroll through it, and it has:

- a **Copy** button, for the story's title and name;
- a **Comment** button, which copies a Markdown link to the story in the report and, in a pull request's report, opens the pull request so you can paste it into a comment;
- a link to the story in Storybook;
- a **Light/Dark** switch, which starts on your system's theme and affects only that story.

A changed story shows every viewport that changed in either theme, and says so when a viewport did not change in the theme you are looking at. Phone and desktop screenshots sit side by side when the page is wide enough.

To see what changed, **click a screenshot to flip it** between before and after, or **tick the checkbox** above it to lay the changed pixels over it. The label above each screenshot stays in view as you scroll, and before and after are told apart at a glance: before has a dashed purple frame and its label on the left, after a solid teal frame and its label on the right.

## Automatic reports on pull requests

The `storybook` workflow runs the same scripts in three jobs:

1. `capture` screenshots the base commit and the pull request's head.
2. `compare` builds the report.
3. `deploy-changes` publishes it at **`storybook/pr-<number>/changes/`**, beside the pull request's Storybook preview, and posts a comment with the counts.

The screenshots are also kept as workflow artifacts for a week.

## Deterministic captures

The screenshots are deterministic, so **any difference in the report comes from your change**. To keep them that way, the capture:

- fixes the browser clock at one moment, with the time zone set to UTC and the locale to `en-US`, so dates render the same every time;
- turns on reduced motion, which our stylesheet honours, and has Playwright stop any remaining animations and hide the text caret;
- waits for Storybook to finish rendering the story, including any `play` function, and then for fonts, images, and the first frame of any video.

If a story still renders differently from run to run, **treat it as a bug** in the story or in this tool. Don't exclude it.

## Files

- `index.ts` is the local task. It finds where your branch left the base branch, checks that commit out into a temporary worktree, and runs `capture.ts` and `compare.ts`.
- `capture.ts` screenshots a built Storybook: one directory per story, one image per theme and viewport, and a `manifest.json`.
- `compare.ts` compares two captures and writes the report: `changes.json`, the before, after, and diff images of each changed story, and `index.html`.
- `report.html` is the report page's template.
- `captureVariants.ts` defines the themes and viewports. **Add one there to add it to every capture and report.**
- `storyPage.ts` drives Storybook. It loads Storybook once per worker and switches between stories through Storybook's own messaging, which is several times faster than reloading the page for each story.
