# bug reports

Each bug report is to be logged in this format:

```md
- <title (up to 5 words)> <day reported (YYYY-MM-DD format)>
  - <how to reproduce the bug>
  - <how the application should behave>
```

---
- Converted segments start 1 ms early 2026-10-01
  - Convert `fixtures/conversion.mkv` (H.264 with B-frames, in Matroska) to HLS through the conversion service, either in one run or with restarts. In every segment except the first segment of a run, the fragment's start decode time is 1 ms short, so its first frame is presented 1 ms before its source time; for example, segment 1's keyframe is presented at 1.501 s instead of 1.502 s. The test `presents_each_frame_at_its_source_time` in `crates/conversion/tests/playback_accuracy.rs` (ignored) reproduces it. The likely cause is that ffmpeg reads every packet of this Matroska file as 41 ms long while the real frame spacing alternates between 41 and 42 ms, and the muxer starts each fragment at the previous fragment's start plus its summed sample durations. A `setts` bitstream filter that derives durations from the next decode time shifted presentation times and was reverted.
  - Every converted frame should be presented at exactly its source time. Seeks made half a frame inside a frame are not affected.
