import { execFileSync } from "node:child_process";

/** The parts of a `https://github.com/<owner>/<repo>/releases/download/<tag>/<asset>` URL. */
export interface GitHubReleaseAsset {
  owner: string;
  repo: string;
  tag: string;
  asset: string;
}

const releaseDownloadUrl =
  /^https:\/\/github\.com\/([^/]+)\/([^/]+)\/releases\/download\/([^/]+)\/([^/]+)$/;

export function parseGitHubReleaseUrl(url: string): GitHubReleaseAsset | null {
  const match = releaseDownloadUrl.exec(url);
  if (!match) return null;
  const [, owner, repo, tag, asset] = match;
  return {
    owner,
    repo,
    tag: decodeURIComponent(tag),
    asset: decodeURIComponent(asset),
  };
}

/** Returns the token from the CI environment variables, then from the gh CLI, else null. */
export function findGitHubToken(): string | null {
  const fromEnvironment = process.env.GITHUB_TOKEN ?? process.env.GH_TOKEN;
  if (fromEnvironment) return fromEnvironment;
  try {
    const token = execFileSync("gh", ["auth", "token"], {
      encoding: "utf-8",
      stdio: ["ignore", "pipe", "ignore"],
    });
    return token.trim() || null;
  } catch {
    return null;
  }
}

/**
 * Looks the asset up through the GitHub API and returns its API URL, which serves the
 * file for private repositories when requested with a token and an octet-stream Accept
 * header. The plain download URL answers 404 for private repositories even with a token.
 */
export async function resolveAssetApiUrl(
  asset: GitHubReleaseAsset,
  token: string,
): Promise<string> {
  const releaseUrl = `https://api.github.com/repos/${asset.owner}/${asset.repo}/releases/tags/${encodeURIComponent(asset.tag)}`;
  const response = await fetch(releaseUrl, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
    },
  });
  if (!response.ok) {
    throw new Error(`could not read release ${asset.tag}: ${response.status}`);
  }
  const release = (await response.json()) as {
    assets: { name: string; url: string }[];
  };
  const found = release.assets.find((entry) => entry.name === asset.asset);
  if (!found) {
    throw new Error(`release ${asset.tag} has no asset named ${asset.asset}`);
  }
  return found.url;
}
