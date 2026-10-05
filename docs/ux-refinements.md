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

- [x] Sometimes a flashcard's definitions arrive from the dictionaries after its form has already opened. If Save is pressed before they arrive, the form says it is waiting for definitions and its fields can no longer be edited. The flashcard is saved once the definitions arrive, with them filling the fields not typed in. If they cannot be found, or have not arrived within ten seconds, the flashcard is saved as it is.
- [x] Changing the word before its definitions arrive means they no longer belong to the flashcard, so they are not added, and Save does not wait for them.
- [x] Opening a flashcard whose save is still under way, or waiting behind an earlier save of it, shows the content last sent for it, which the list may not show yet. Undo of a save puts back what the flashcard held just before that save.
- [x] A flashcard the form leaves, because another flashcard is started or opened or the screen is left, is saved in the background as it is, so that moving on never loses work and never asks a question first. This applies to a new flashcard even if it was never changed. A saved flashcard that was not changed is left alone.
  - A brief notice names the flashcard and offers Undo, which deletes a new flashcard or puts back the earlier content of a saved one. No notice appears for a flashcard whose Save had already been pressed.
  - Only a flashcard's latest save can be undone: its Undo is withdrawn once a later save of it starts, a retiming from the waveform included, and once it opens in the form, where undoing would change it underneath the edits. An Undo is sent after any save of the same flashcard still under way, so the two cannot cross.
  - A flashcard whose Save was pressed while waiting for definitions keeps waiting in the background, until ten seconds after Save was pressed, and is then saved with whatever arrived. A new flashcard left while its definitions are still on their way waits for them in the same way, for up to ten seconds.
- [x] When a background save fails, a notice names the flashcard and stays until it is acted on or dismissed. It keeps the flashcard's edits: Retry sends them again, and Reopen puts the flashcard back in the form, saving the flashcard open there as if the user had moved on from it. Reopen is withdrawn once the screen is left, since the form is gone; Retry remains.
- [x] Once Save is pressed, Close and Delete are unavailable, like the fields, until the save is done or has failed; this includes the wait for definitions. Moving on to another flashcard remains possible and saves the waiting one in the background.
- [x] A save request that has had no answer within thirty seconds, as when the connection hangs, counts as failed: the app stops waiting for it, and the form tells so and is editable again, or, for a flashcard that has left the form, the failure notice with Retry appears. Stopping the request does not stop a server that has already received it, so the save may still land.
  - A new flashcard keeps the id it is created under from its first save, through Retry and Reopen, so that sending it again replaces a save that landed late rather than duplicating it.
  - If the flashcard is then discarded, by dismissing the failure notice or with Close without saving, the possible save is taken back: a new flashcard is deleted, and a saved one gets back what it held before. Undo of the discard still brings the edits back.
- [x] Closing a changed flashcard without saving discards it at once, and a brief notice offers Undo, which reopens it with its edits. Leaving the screen withdraws the notice. Closing an unchanged flashcard shows no notice.
- [x] Notices appear in one region of the app. Screen readers announce a failure at once, as an alert, and other notices politely. A brief notice stays for ten seconds, and the countdown pauses while the pointer is over it or keyboard focus is in it, so its actions can be reached by keyboard. A notice that reports a failure stays until it is dismissed.
- [x] While the open flashcard has unsaved changes, a flashcard is being saved or waiting for definitions to be saved, or a failure notice holds a flashcard's edits, the app warns before it closes: the browser's own leave-page prompt on the web and in the extension, and a confirmation dialog on desktop. On macOS, Quit in the app menu (Cmd+Q) closes the window the same way, so it asks too; quitting from the Dock or by logging out still ends the app without asking. Mobile systems close an app without asking it first, so unsaved work is lost when the app is closed there; keeping it would need the project's work to be stored on the device, as the autosave stories describe.

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
