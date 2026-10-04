# easyimmerse-conversion

Converts media files into HLS segments with ffmpeg while they play, keeps the converted segments in a bounded cache, discovers a hardware video encoder, and decodes waveform peaks. Desktop and server only; the pure planning it relies on (segment plans, playlists, codec strings) lives in `easyimmerse-media`.

Tests that run ffmpeg live in `tests/conversion/` and skip when neither `EASYIMMERSE_FFMPEG_DIR` nor `PATH` has `ffmpeg` and `ffprobe`.

## Measured behaviour that is left as it is

Each of these was measured with the conversion fixtures and judged imperceptible. They are listed so that nobody rediscovers them as bugs; none is scheduled for work. Should one of them turn out to be audible or visible, it becomes a bug report.

- **Matroska frame times are up to 0.5 ms off.** Matroska stores timestamps in whole milliseconds, so a 24 fps source converts to frames alternately 41 and 42 ms apart. The error never accumulates.
- **AAC audio begins one encoder frame before the video.** The first converted audio packet is the encoder's priming packet, kept so that the first real packet reconstructs fully. Players see about 21 ms (ffmpeg's `aac`) or 23 ms (`aac_at`) of near silence before time zero.
- **Audio across a restart seam comes from two encoder runs.** When a seek starts a new run, the segments on either side of the seam were encoded separately, so the decoder's overlap-add across the seam uses mismatched frames. Click positions measured on both sides of a seam were identical to the sample at 48 kHz.
- **Audio-only segments can overlap or gap at a seam by one packet.** Audio-only sources are cut at the first packet after each nominal four-second boundary, so a segment from a restarted run can overlap or gap the neighbouring segment of an earlier run by about 21 ms for AAC or 26 ms for MP3.
- **A first play that starts mid-file begins a run from the start.** hls.js requests the init segment before any media segment, and that request starts a run from segment 0 when none is active; the first media segment request replaces it a fraction of a second later. A cached init segment is served without starting a run, so this happens once per file.
