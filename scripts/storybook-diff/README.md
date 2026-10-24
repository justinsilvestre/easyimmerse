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

- a button beside the story's name that copies its title and name;
- below the name, a link to the story in Storybook;
- a **Comment** button, described below;
- a **Light/Dark** switch, which starts on your system's theme and affects only that story.

A changed story shows every viewport that changed in either theme, and says so when a viewport did not change in the theme you are looking at. Phone and desktop screenshots sit side by side when the page is wide enough.

To see what changed, **click a screenshot to flip it** between before and after. A rectangle **highlights** where the changes are, with everything outside it darkened; the checkbox above a screenshot turns this off. The changed pixels themselves flash red as the screenshot flips.

Before and after can be told apart at a glance:

- **Before** has an orange label with "Before" on the left and a dashed frame.
- **After** has a blue label with "After" on the right and a solid frame.

Each label spans its screenshot and stays in view as you scroll. A resized screenshot shows its size with the old value of each changed dimension struck out. **Clicking a label shows that screenshot full screen**, where clicking it, tapping it, or pressing the space bar flips it the same way.

## Trying the report page without capturing

To try the report page, or to work on `report.html`, re-render a published report with the current template. This takes seconds:

```sh
git fetch origin gh-pages
mkdir -p .dev/storybook-diff/demo
git archive origin/gh-pages storybook/pr-58/changes | tar -x --strip-components=3 -C .dev/storybook-diff/demo
node scripts/storybook-diff/rerender.ts --report .dev/storybook-diff/demo
```

Then open `.dev/storybook-diff/demo/index.html`. Any `pr-<number>` directory on the `gh-pages` branch that has a `changes/` directory works.

## Comments

The **Comment** button opens a box at the top of the story. What you type is saved in your browser's local storage as you type, keyed by the report's address. It survives a closed tab and a redeployed report, but not a different browser or device.

While there are comments, a bar at the bottom of the page counts them and offers:

- **Copy as Markdown**, which copies every comment, each under a link to its story in the report, ready to paste into the pull request;
- **Open pull request**, in a pull request's report;
- **Clear all**.

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
- `rerender.ts` rewrites an existing report's page with the current template.
- `captureVariants.ts` defines the themes and viewports. **Add one there to add it to every capture and report.**
- `storyPage.ts` drives Storybook. It loads Storybook once per worker and switches between stories through Storybook's own messaging, which is several times faster than reloading the page for each story.
