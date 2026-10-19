# Storybook screenshot diff

Shows which stories of `packages/ui` a change affects, as before and after screenshots. Every story is captured in the light and dark themes at a phone width (390 × 844) and a desktop width (1280 × 800), two captures are compared, and a report page lists the stories that were added, removed, changed, or broke, with the differing pixels marked in red. There is no hosted service and no stored baseline: the "before" side is captured from a build of the base commit, so the comparison is always against exactly the commit the change branched from.

## Locally

```sh
mise run storybook-diff                 # against main
mise run storybook-diff -- --base <ref> # against another branch or commit
mise run storybook-diff -- --no-open    # print the report path instead of opening it
```

The task finds the commit where the current branch left the base branch, checks it out into a temporary worktree under `.dev/storybook-diff/`, builds its Storybook, and captures it. That capture is kept under `.dev/storybook-diff/captures/<commit>/`, so later runs against the same base skip straight to the working tree. It then builds and captures the working tree, compares the two, writes the report to `.dev/storybook-diff/report/index.html`, and opens it. A full run takes about ten minutes the first time and five after that; `.dev/` is ignored by git and can be deleted at any time.

Chromium must be installed for Playwright once: `mise exec -- pnpm exec playwright install chromium`.

## On a pull request

The `storybook` workflow runs the same scripts in three jobs: `capture` screenshots the base commit and the pull request's head side by side, `compare` builds the report, and `deploy-changes` publishes it under the pull request's Storybook preview at `storybook/pr-<number>/changes/` and posts a comment with the counts. The report links each story to that preview. The captures are also kept as workflow artifacts for a week.

## How the captures stay deterministic

Two captures of the same build are identical, so any difference in the report comes from the change. The capture fixes everything that would otherwise vary:

- The browser clock is fixed at one moment, with the time zone set to UTC and the locale to `en-US`, so relative and absolute dates render the same every time.
- Reduced motion is emulated, which the stylesheet honours, and Playwright disables remaining animations and hides the caret for the screenshot.
- The capture waits for Storybook's render event, which fires after any `play` function, and then for fonts, images, and the first frame of any video.

A story that renders differently from run to run is a bug in the story or in this tool, not something to exclude.

## Files

- `capture.ts` screenshots a built Storybook into a capture directory: one directory per story, one image per variant, and a `manifest.json`.
- `compare.ts` turns two capture directories into a report directory: `changes.json`, the before, after, and diff images of every changed story, and `index.html`.
- `index.ts` is the local task that runs both against the base commit and the working tree.
- `captureVariants.ts` defines the themes and viewports. Adding one there adds it to every capture and report.
- `storyPage.ts` drives the Storybook preview: it loads the preview once per worker and switches stories through Storybook's own channel, which is several times faster than loading the preview for each story.
