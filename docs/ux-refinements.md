# UX refinements

## Video and audio playback

- [ ] On desktop/mobile, a specification of video and audio formats compatible with the target browser environment should be referenced when opening a media file. On user consent, the app should stream the media file in a compatible format. It is important that the audio format allows seeking to arbitrary timestamps, so playback can be controlled accurately based on e.g. subtitles timings.

## Subtitles

- [ ] When both target-language and translation subtitles are available, cues from both tracks should be paired sensibly, e.g. accounting for differences in segmentation of dialogue. Whereas seeking via cue timings with just the target-language subtitles open happens based on that track's cue timings, the timings of the combined cues should be used when both tracks are open.

As a user:
- when a subtitles track is opened:
  - [ ] between cues, the last cue stays on screen until the next cue begins, so I have time to read it or act on it

## Flashcards

As a user:
- when I export flashcards to Anki:
  - [ ] the Anki template shows whichever fields have values, so my flashcard settings do not affect the export and I can change them for an existing deck

## Dictionaries

As a user:
- when I create flashcards with a dictionary from the easyImmerse registry:
  - [ ] each flashcard stores a reference to the dictionary entry rather than the entry's full text, so it takes less space on my device and in the cloud

## Waveform

- [ ] Dragging a flashcard's handle near the edge of the waveform should scroll the waveform, so a clip can be extended beyond the visible span.
