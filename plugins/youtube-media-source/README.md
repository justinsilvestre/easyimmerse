# youtube-media-source

A proof-of-concept media-source plugin that adds a YouTube video to a project: the video as MP4, with the subtitles the uploader provided and the automatic captions in the video's own language as WebVTT. It is here to show that a media-source plugin can carry a video all the way into the app, where it plays, its subtitles can be looked up, and flashcards can be made from it. It is not meant to be published.

The plugin does no downloading itself. It asks the host to run its bundled `youtube` script, which runs [yt-dlp](https://github.com/yt-dlp/yt-dlp): once for its version, once to read the title, the duration, and the subtitle languages, and once to download. The script runs the `yt-dlp` executable placed beside it in `bin/<target>/`, or the one on `PATH`. Each of the last two commands prints one JSON object with every field the plugin needs, so that its answer does not depend on what else yt-dlp prints, and a field yt-dlp has no value for, such as the subtitles of a video without any, is simply absent.

While it runs, the plugin logs the yt-dlp version, what it learned about the video, which subtitle languages it fetches, and the download's progress lines, all of which the app shows under "Log" in the dialog and the server writes to its log at the `plugin` target.

## What it needs

- `yt-dlp` beside the script or on `PATH`.
- `ffmpeg` on `PATH`, or in `EASYIMMERSE_FFMPEG_DIR`, which the script puts first on `PATH`. Without it, yt-dlp cannot merge YouTube's separate video and audio streams and falls back to the one combined MP4 YouTube offers, at 360p.

## Trying it

Build the plugin and install it into the development server's plugin directory, then start the server and the web app:

```sh
mise run plugins:build
mkdir -p .dev/plugins
ln -s ../../plugins/youtube-media-source/dist .dev/plugins/youtube-media-source
mise run web-dev
```

Open a project, choose "Add from URL", and paste a video URL or id. The request lasts as long as the download, which the dialog says while it waits. The video lands in `.dev/media/youtube-media-source/`, and the server streams it from there without `--allow-local-paths`, because it fetched the file itself.

The desktop app reads its plugins from the `plugins/` directory beside its database (see the root README for where that is); copy `dist/` there as `plugins/youtube-media-source/` instead.

## Limits of the proof of concept

- yt-dlp's own progress is reported line by line rather than as a fraction, so the dialog's bar jumps from the description step to done.
- A video that needs signing in, such as an age-restricted one, fails, since the plugin passes no cookies.
- The video is capped at 720p so that the download stays small.
- Only the uploader's subtitles and the original-language automatic captions are fetched; automatic translations are not.

## Tests

`crates/plugins/tests/plugins/youtube.rs` loads the built plugin and runs it against `test-bin/youtube.sh`, a stand-in for yt-dlp that answers offline with the repository's sample video and subtitles.
