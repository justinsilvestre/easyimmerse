# UX refinements

## Video and audio playback

- [x] On desktop/mobile, a specification of video and audio formats compatible with the target browser environment should be referenced when opening a media file. On user consent, the app should stream the media file in a compatible format. It is important that the audio format allows seeking to arbitrary timestamps, so playback can be controlled accurately based on e.g. subtitles timings.
- [x] A conversion writes about five minutes of media ahead of the newest request and then stops, so that a paused video does not keep a processor core busy. A request within a minute ahead of the running conversion lets it continue; a seek further away restarts it at the segment before the one requested. A request waits up to sixty seconds for its segment before the player is told to retry.
- [x] Converted media is kept on disk between sessions, within a budget of five percent of the disk (at least 1 GiB, at most 100 GiB) and never within the last five percent of free space (at least 2 GiB, at most 20 GiB). Clearing the cache from Settings keeps the conversions that are playing right now. Removing a media file removes its cached conversions unless another media file points at the same source file.
- [x] A media element asked to seek exactly to a frame boundary sometimes shows the previous frame. Every programmatic seek (clicking a cue, clicking the waveform) therefore targets the asked time plus half a frame at the file's frame rate, or half of a sixtieth of a second when the rate is unknown. The time shown and the cue membership keep the asked time.
- [x] Switching tracks reloads the stream, because a converted file has a different playlist per track choice. The player remembers the position before detaching and seeks back to it once the new source has loaded its metadata.
- [x] Closing the conversion notice or the track choice returns keyboard focus to the control that opened it.

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
- when I look up a word that begins a dictionary entry of several separate words, such as „von … an" in „Er arbeitet von heute an", "pick … up" in English, or « ne … pas » in French:
  - [ ] the entry is found when its later words follow in the same sentence, and all of its words are highlighted
  - [ ] the matching may be naive: looking up „arbeitet" in the same sentence may still offer anarbeiten, with „an" highlighted, as long as looking up „von" offers „von … an"

- [x] A dictionary's own stylesheet (Yomitan's `styles.css`, the `.css` beside an MDict or StarDict dictionary) styles that dictionary's definitions and nothing else. It arrives with each lookup, so entries never show unstyled first. Before it is applied, every selector is confined to that dictionary's definitions, and anything that could load a remote resource, run code, or draw outside the definition is dropped. Class names in dictionary markup are kept with a prefix, so they cannot pick up the app's own styles.
- [x] Dictionaries are designed for white pages. In the dark theme, their text colors are lightened and their background colors darkened, keeping each color's hue, so that their entries stay readable. Where the browser cannot compute these colors, the dictionary's own colors are shown.
- [ ] In German, lookup finds a separated particle verb only when the particle ends its clause, so „Fang endlich an mit der Arbeit!" does not lead to anfangen. A simple check of the word after a particle in the middle of a clause could find such verbs: another preposition would suggest a verb particle, and an article, a pronoun or a noun would suggest a preposition, as in „Ich denke an dich". The check should be adopted only if it finds such verbs without adding many wrong matches.

## Settings

- [x] Settings does not replace the screen beneath it. The media screen stays mounted and inert under the Settings overlay, so that Back restores the player exactly, including the position it had reached.
- [x] The converted-videos section shows nothing beneath its heading while its status loads, so Settings does not flash the unavailable line on every open. A server that cannot convert, or no server at all, gets the one-line unavailable state; any other failure to read the status is shown as such.
- [x] Byte sizes in Settings use 1000-byte units (kB, MB, GB), with one decimal only below ten of a unit.

## Waveform

- [ ] Dragging a flashcard's handle near the edge of the waveform should scroll the waveform, so a clip can be extended beyond the visible span.
- [x] Until the server has probed the file or the player has reported a duration, the waveform strip spans nothing and requests no windows, so it never asks for peaks past the end of the file.
- [x] A seek moves the strip's view at once, before the player reports the new time, so the waveform around the target starts loading immediately.
- [x] The strip loads the waveform in thirty-second windows, at most three at a time, and keeps a window in memory for five minutes after the view last showed it. A window whose request failed is requested again after a few seconds, so a server restart leaves no permanent gap.
