/** Where an ffmpeg build in the manifest came from, derived from its download URL. */
export interface BuildOrigin {
  /** The FFmpeg release number. */
  version: string;
  /** The FFmpeg source release tarball the build was made from. */
  sourceUrl: string;
  /** Who built it, in a sentence. */
  builder: string;
  /** The page of the release that published the build. */
  releaseUrl: string;
}

const ownRelease =
  /^https:\/\/github\.com\/([^/]+\/[^/]+)\/releases\/download\/(ffmpeg-([\d.]+)(?:-\d+)?)\//;

/** Describes a build that this repository's ffmpeg workflow published. */
export function describeBuildOrigin(url: string): BuildOrigin {
  const match = ownRelease.exec(url);
  if (!match)
    throw new Error(`cannot tell where the build at ${url} came from`);
  const [, repo, tag = "", version = ""] = match;
  return {
    version,
    sourceUrl: `https://ffmpeg.org/releases/ffmpeg-${version}.tar.xz`,
    builder: `Built by the ffmpeg workflow of https://github.com/${repo} (.github/workflows/ffmpeg.yml) for the tag ${tag}.`,
    releaseUrl: `https://github.com/${repo}/releases/tag/${tag}`,
  };
}
