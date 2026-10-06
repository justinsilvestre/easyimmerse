# bug reports

Each bug report is to be logged in this format:

```md
- <title (up to 5 words)> <day reported (YYYY-MM-DD format)>
  - <how to reproduce the bug>
  - <how the application should behave>
```

---

## Media conversion

- First playback waits for encoders 2026-10-04
  - Start the app and, before anything else, open a file that needs converting.
  - The first playback request waits for the server to discover which video encoders work, up to five seconds on a machine where the hardware encoder test is slow (under half a second on a recent Mac). The player should show that it is preparing the file rather than appear stuck, or discovery should finish before the first file can be opened.
- HDR video converts washed out 2026-10-04
  - Open an HDR (10-bit, BT.2020) video that needs converting.
  - It is transcoded to 8-bit H.264 without tone mapping and looks washed out. Converted HDR video should be tone-mapped to look like the original.
- Transcoding test drops frames once 2026-10-04
  - Run the `rust` workflow's macOS job; in run 37219960258 `accuracy::transcoded_frames_present_at_their_source_times` in `crates/conversion` produced 236 frames instead of 250 with the VideoToolbox encoder, after passing in the six runs before and the run after it.
  - A converted file should hold every source frame on every run. Until the cause is known (the encoder on a virtual Mac, or a run stopped before its last segment), a repeat failure should be investigated rather than rerun.
- Cache clearing test drops connection 2026-10-05
  - Run the `rust` workflow's `windows-11-arm` job; in runs 37225462574, 37241200447, and 37310370925, `media_conversion::clearing_the_cache_answers_with_the_status` in `crates/api` panicked because the connection was aborted (Windows error 10053) before the response arrived. Other runs of the same job pass, and it has not been reproduced on macOS. The test posts a `{}` body to a route that never reads a body, which may be related.
  - The request should get its response on every run, so the test passes on every platform.

## Flashcards

- Retry drops a pending Open 2026-10-06
  - Press Open on a flashcard listed as not saved, then Retry before its screen has loaded, or the reverse. When the Retry fails, or succeeds after a retiming, the flashcard stays listed but no longer waits to open, so the screen appears without it and with no notice.
  - A flashcard the user asked to open should still open once its screen shows, unless the Retry saved it and took it off the list.
- Unsaved cards lack cue marks 2026-10-06
  - List a flashcard as not saved, including one never saved, and look at the subtitle list: only cues of saved flashcards are marked.
  - A flashcard listed as not saved should get the same mark on its cue, since the waveform already draws it.
- Listed card also open in form 2026-10-06
  - Reopen a saved flashcard from the waveform while its background save is still under way, and let that save fail. The same flashcard is then both listed with older edits and open in the form; Open on the listed entry then saves the form's newer edits in the background and loads the older ones. Undo of a Discard can create the same state.
  - A flashcard should be either listed or open in the form, not both, and the form's newer copy should win.
