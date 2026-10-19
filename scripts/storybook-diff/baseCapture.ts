import { access, rm } from "node:fs/promises";
import { join } from "node:path";

import { buildStorybook } from "./buildStorybook.ts";
import { captureStories, defaultConcurrency } from "./captureStories.ts";
import { readCommand, runCommand } from "./runCommand.ts";

/** The commit where the current branch and `baseRef` diverge. */
export function findMergeBase(
  repositoryRoot: string,
  baseRef: string,
): Promise<string> {
  return readCommand("git", ["merge-base", "HEAD", baseRef], repositoryRoot);
}

/**
 * Captures the stories of a commit into `outputDir`, unless a capture is already there.
 * The commit is checked out into a temporary worktree under `workDir`, built, captured, and removed again.
 */
export async function captureCommitOnce(
  repositoryRoot: string,
  commit: string,
  workDir: string,
  outputDir: string,
): Promise<void> {
  if (await exists(join(outputDir, "manifest.json"))) {
    console.log(`Reusing the capture of ${commit.slice(0, 7)}.`);
    return;
  }
  await rm(outputDir, { recursive: true, force: true });
  const worktree = join(workDir, "worktree");
  await removeWorktree(repositoryRoot, worktree);
  await runCommand(
    "git",
    ["worktree", "add", "--detach", worktree, commit],
    repositoryRoot,
  );
  try {
    await runCommand(
      "pnpm",
      ["install", "--frozen-lockfile", "--prefer-offline"],
      worktree,
    );
    const storybookDir = await buildStorybook(worktree);
    await captureStories({
      storybookDir,
      outputDir,
      concurrency: defaultConcurrency(),
    });
  } finally {
    await removeWorktree(repositoryRoot, worktree);
  }
}

async function removeWorktree(
  repositoryRoot: string,
  worktree: string,
): Promise<void> {
  if (await exists(worktree)) {
    await runCommand(
      "git",
      ["worktree", "remove", "--force", worktree],
      repositoryRoot,
    );
  }
  await runCommand("git", ["worktree", "prune"], repositoryRoot);
}

function exists(path: string): Promise<boolean> {
  return access(path).then(
    () => true,
    () => false,
  );
}
