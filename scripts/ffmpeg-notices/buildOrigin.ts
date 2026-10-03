/** Where an ffmpeg build in the manifest came from, derived from its download URL. */
export interface BuildOrigin {
  /** The FFmpeg version, as a release number or `git describe` output. */
  version: string;
  /** The FFmpeg source release tarball or git commit the build was made from. */
  sourceUrl: string;
  /** Who built it, in a sentence. */
  builder: string;
  /** The page of the release that published the build. */
  releaseUrl: string;
}

const btbnRelease =
  /^https:\/\/github\.com\/BtbN\/FFmpeg-Builds\/releases\/download\/(autobuild-(\d{4}-\d\d-\d\d)-(\d\d)-(\d\d))\/ffmpeg-(n[\d.]+(?:-\d+-g([0-9a-f]+))?)-/;
const ownRelease =
  /^https:\/\/github\.com\/([^/]+\/[^/]+)\/releases\/download\/(ffmpeg-macos-([\d.]+))\//;

export function describeBuildOrigin(url: string): BuildOrigin {
  const origin = describeBtbnBuild(url) ?? describeOwnBuild(url);
  if (!origin)
    throw new Error(`cannot tell where the build at ${url} came from`);
  return origin;
}

function describeBtbnBuild(url: string): BuildOrigin | null {
  const match = btbnRelease.exec(url);
  if (!match) return null;
  const [, tag = "", date, hour, minute, version = "", commit] = match;
  return {
    version,
    sourceUrl: commit
      ? `https://github.com/FFmpeg/FFmpeg/commit/${commit}`
      : `https://ffmpeg.org/releases/ffmpeg-${version.slice(1)}.tar.xz`,
    builder: `Built by the BtbN/FFmpeg-Builds autobuild of ${date} ${hour}:${minute} UTC (build scripts: https://github.com/BtbN/FFmpeg-Builds).`,
    releaseUrl: `https://github.com/BtbN/FFmpeg-Builds/releases/tag/${tag}`,
  };
}

function describeOwnBuild(url: string): BuildOrigin | null {
  const match = ownRelease.exec(url);
  if (!match) return null;
  const [, repo, tag = "", version = ""] = match;
  return {
    version,
    sourceUrl: `https://ffmpeg.org/releases/ffmpeg-${version}.tar.xz`,
    builder: `Built by the ffmpeg-macos workflow of https://github.com/${repo} (.github/workflows/ffmpeg-macos.yml) for the tag ${tag}.`,
    releaseUrl: `https://github.com/${repo}/releases/tag/${tag}`,
  };
}
