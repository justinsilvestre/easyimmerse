@echo off
rem Runs yt-dlp with the given arguments: the copy placed beside this script when there is
rem one, else the one on PATH. The youtube-media-source plugin asks the host to run this.
rem The app's bundled ffmpeg, named by EASYIMMERSE_FFMPEG_DIR, goes first on PATH so that
rem yt-dlp merges separate video and audio streams with it.
if defined EASYIMMERSE_FFMPEG_DIR set "PATH=%EASYIMMERSE_FFMPEG_DIR%;%PATH%"
if exist "%~dp0yt-dlp.exe" (
  "%~dp0yt-dlp.exe" %*
) else (
  yt-dlp %*
)
