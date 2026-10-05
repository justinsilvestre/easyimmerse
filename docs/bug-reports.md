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

- Save never settles 2026-10-05
  - Save a flashcard while the server accepts the request but never answers, as when the connection hangs. The editor stays read-only under "Saving…" and Save stays unavailable, with no way out but closing the card. Backend requests have no time limit in general.
  - A save that has not settled within a reasonable time should fail with a message, and leave the card editable so that it can be saved again.
