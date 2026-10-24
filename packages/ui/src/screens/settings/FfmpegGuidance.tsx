import { actions } from "@easyimmerse/state";
import { LinkButton } from "../../components/common/LinkButton.tsx";
import { useAppDispatch } from "../../useAppDispatch.ts";

const gyanBuildsUrl = "https://www.gyan.dev/ffmpeg/builds/";
const btbnBuildsUrl = "https://github.com/BtbN/FFmpeg-Builds/releases";

/** Explains, for each desktop platform, how to install an ffmpeg build with a software H.264 encoder, and which builds include one. */
export function FfmpegGuidance() {
  const dispatch = useAppDispatch();
  const open = (url: string) => () =>
    dispatch(actions.externalLinkRequested(url));
  return (
    <div className="flex flex-col gap-2 rounded-md border border-line bg-surface-muted p-3 text-sm">
      <p>
        To convert video that cannot play directly, install an ffmpeg build with
        a software H.264 encoder (libx264 or libopenh264), then choose its
        ffmpeg program above. easyImmerse runs the build you choose as a
        separate program and does not include it.
      </p>
      <ul className="flex list-disc flex-col gap-1 pl-5">
        <li>
          macOS: install Homebrew's build with{" "}
          <code className="font-mono">brew install ffmpeg</code>, which includes
          libx264 and is licensed under the GPL. On Apple silicon, its ffmpeg is
          in /opt/homebrew/bin.
        </li>
        <li>
          Windows: download the essentials or full build from{" "}
          <LinkButton onClick={open(gyanBuildsUrl)}>gyan.dev</LinkButton>, which
          include libx264 and are licensed under the GPL. Or download a build
          from{" "}
          <LinkButton onClick={open(btbnBuildsUrl)}>
            BtbN's FFmpeg builds
          </LinkButton>
          : a gpl build includes libx264 and libopenh264, and an lgpl build
          includes libopenh264 only. Unpack it and choose ffmpeg.exe in its bin
          folder.
        </li>
        <li>
          Linux: install your distribution's ffmpeg package. On Debian and
          Ubuntu, <code className="font-mono">sudo apt install ffmpeg</code>{" "}
          installs a build that includes libx264.
        </li>
      </ul>
    </div>
  );
}
