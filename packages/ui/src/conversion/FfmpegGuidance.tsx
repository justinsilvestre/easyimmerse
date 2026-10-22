import { actions } from "@easyimmerse/state";
import { LinkButton } from "../components/LinkButton.tsx";
import { useAppDispatch } from "../hooks/useAppDispatch.ts";

const gyanBuildsUrl = "https://www.gyan.dev/ffmpeg/builds/";
const btbnBuildsUrl = "https://github.com/BtbN/FFmpeg-Builds/releases";

/** Explains, for each desktop platform, how to install an ffmpeg build with a software H.264 encoder. */
export function FfmpegGuidance() {
  const dispatch = useAppDispatch();
  const open = (url: string) => () =>
    dispatch(actions.externalLinkRequested(url));
  return (
    <div className="flex flex-col gap-2 rounded-md border border-line bg-surface-muted p-3 text-sm">
      <p>
        To convert video that cannot play directly, install an ffmpeg build with
        a software H.264 encoder (libx264 or libopenh264), then choose its
        ffmpeg program above:
      </p>
      <ul className="flex list-disc flex-col gap-1 pl-5">
        <li>
          macOS: install Homebrew's build with{" "}
          <code className="font-mono">brew install ffmpeg</code>, which includes
          libx264. Its ffmpeg is in /opt/homebrew/bin on Apple silicon and in
          /usr/local/bin on Intel.
        </li>
        <li>
          Windows: download a full build from{" "}
          <LinkButton onClick={open(gyanBuildsUrl)}>gyan.dev</LinkButton> or a
          GPL build from{" "}
          <LinkButton onClick={open(btbnBuildsUrl)}>
            BtbN's FFmpeg builds
          </LinkButton>
          ; both include libx264. Unpack it and choose ffmpeg.exe in its bin
          folder.
        </li>
        <li>
          Linux: install your distribution's ffmpeg package, such as{" "}
          <code className="font-mono">sudo apt install ffmpeg</code> on Debian
          and Ubuntu, which includes libx264.
        </li>
      </ul>
    </div>
  );
}
