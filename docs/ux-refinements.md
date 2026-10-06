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
- [x] Opening a flashcard whose save is still under way, or waiting behind an earlier save of it, shows the content last sent for it, which the list may not show yet; retiming it on the waveform builds on that content too. Undo of a save puts back what the flashcard held just before that save.
- [x] A flashcard the form leaves, because another flashcard is started or opened or the screen is left, is saved in the background as it is, so that moving on never loses work and never asks a question first. This applies to a new flashcard even if it was never changed. A saved flashcard that was not changed is left alone.
  - A brief notice names the flashcard and offers Undo, which deletes a new flashcard or puts back the earlier content of a saved one. No notice appears for a flashcard whose Save had already been pressed.
  - Only a flashcard's latest save can be undone: its Undo is withdrawn once a later save of it starts, a retiming from the waveform included, and once it opens in the form, where undoing would change it underneath the edits. An Undo is sent after any save of the same flashcard still under way, so the two cannot cross.
  - A flashcard whose Save was pressed while waiting for definitions keeps waiting in the background, until ten seconds after Save was pressed, and is then saved with whatever arrived. A new flashcard left while its definitions are still on their way waits for them in the same way, for up to ten seconds.
- [x] Flashcards whose background save failed are kept, with their edits, in one lasting status line, such as "3 flashcards not saved", rather than in a notice each. The line expands into a list of those flashcards, each with Retry, Open and Discard, and offers Retry all. Nothing is retried until the user asks.
  - A lost connection, a request with no answer or a server error puts a flashcard in the list, as does a refusal that may pass: the user signed out or not allowed for now, a request the server gave up waiting for, or too many requests. A save the server refuses outright, which sending again cannot fix, also gets a notice of its own with Open and Discard and no Retry; it stays listed, without Retry.
  - While a flashcard's Retry is under way, the list shows it as saving, and its Discard is unavailable.
  - Open puts the flashcard back in the form, going back to its media screen if the user has left it, and saves the flashcard open there as if the user had moved on from it. The flashcard stays listed until the form has it, however long its screen takes to load. If the project or the media file fails to load, or the media file no longer exists, a notice says the flashcard could not be opened, and it stays listed. If the user goes elsewhere before the screen appears, the flashcard stays listed and is no longer waiting to open. Opening a listed flashcard from the waveform or the flashcard list opens it the same way, with its edits. A flashcard without a media file has no Open, in the list or on its notice.
  - Open during a Retry opens the flashcard at once with the content being sent, as for any flashcard whose save is under way, and takes it off the list, since the form now holds the edits. If that Retry then fails, the flashcard is not listed again: the open form counts as unsaved work.
  - A flashcard opened from the list counts as changed, since its edits are saved nowhere: closing it without saving discards it with Undo.
  - The waveform draws a listed flashcard with its listed edits, including one never saved. Retiming it there changes only those edits, so it stays where it was dragged; nothing is sent until Retry. A retiming made during a Retry keeps the flashcard listed with the new timing, even if the Retry succeeds. A save of a listed flashcard from the form takes it off the list, since the form holds the user's latest edits.
  - Only Discard throws the edits away, after which a brief notice offers Undo, which lists the flashcard again. The × only collapses the list, or hides a refused save's notice while the flashcard stays listed.
  - Screen readers announce the line when it first appears and whenever its count changes, and its list is reached by keyboard like the rest of the page.
- [x] Once Save is pressed, Close and Delete are unavailable, like the fields, until the save is done or has failed; this includes the wait for definitions. Moving on to another flashcard remains possible and saves the waiting one in the background.
- [x] A save request that has had no answer within thirty seconds, as when the connection hangs, counts as failed: the app stops waiting for it, and the form tells so and is editable again, or a flashcard that has left the form is listed among those not saved. Stopping the request does not stop a server that has already received it, so the save may still land.
  - A new flashcard keeps the id it is created under from its first save, through Retry and Open, so that sending it again replaces a save that landed late rather than duplicating it.
  - If the flashcard is then discarded, with Discard or with Close without saving, the possible save is taken back: a new flashcard is deleted, and a saved one gets back what it held before. Undo of the discard still brings the edits back.
- [x] Closing a changed flashcard without saving discards it at once, and a brief notice offers Undo, which reopens it with its edits. Leaving the screen withdraws the notice. Closing an unchanged flashcard shows no notice.
- [x] Notices appear in one region of the app. Screen readers announce a failure at once, as an alert, and other notices politely. A brief notice stays for ten seconds, and the countdown pauses while the pointer is over it or keyboard focus is in it, so its actions can be reached by keyboard. A notice that reports a failure stays until it is dismissed.
- [x] While the open flashcard has unsaved changes, a flashcard is being saved or waiting for definitions to be saved, or any flashcard is listed as not saved, the app warns before it closes: the browser's own leave-page prompt on the web and in the extension, and a confirmation dialog on desktop. On macOS, Quit in the app menu (Cmd+Q) closes the window the same way, so it asks too; quitting from the Dock or by logging out still ends the app without asking. Mobile systems close an app without asking it first, so unsaved work is lost when the app is closed there; keeping it would need the project's work to be stored on the device, as the autosave stories describe.

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

## Ebook/text reader

- [x] Words are found under the pointer from the browser's caret position rather than by wrapping each word in an element, so that a long chapter lays out quickly. The word is highlighted with the CSS Custom Highlight API, which leaves the text's markup alone.
- [x] The mouse must rest on a word for about a tenth of a second before it is looked up, so that moving across the text does not flash the dictionary pop-up.

## Settings

- [x] Settings does not replace the screen beneath it. The media screen stays mounted and inert under the Settings overlay, so that Back restores the player exactly, including the position it had reached.
- [x] The converted-videos section shows nothing beneath its heading while its status loads, so Settings does not flash the unavailable line on every open. A server that cannot convert, or no server at all, gets the one-line unavailable state; any other failure to read the status is shown as such.
- [x] Byte sizes in Settings use 1000-byte units (kB, MB, GB), with one decimal only below ten of a unit.

## Waveform

- [ ] Dragging a flashcard's handle near the edge of the waveform should scroll the waveform, so a clip can be extended beyond the visible span.
- [x] Until the server has probed the file or the player has reported a duration, the waveform strip spans nothing and requests no windows, so it never asks for peaks past the end of the file.
- [x] A seek moves the strip's view at once, before the player reports the new time, so the waveform around the target starts loading immediately.
- [x] The strip loads the waveform in thirty-second windows, at most three at a time, and keeps a window in memory for five minutes after the view last showed it. A window whose request failed is requested again after a few seconds, so a server restart leaves no permanent gap.

## Audit of October 2026

The web app was run against a local server and walked through at desktop and phone sizes, in both themes, with the heuristics below as the yardstick: Nielsen Norman Group's ten usability heuristics and response-time limits, Apple's Human Interface Guidelines and Material 3 for touch targets and safe areas, WCAG 2.2 for contrast, focus, target size and reduced motion, the BBC subtitle guidelines, YouTube's and Anki's keyboard conventions, and Refactoring UI for hierarchy and spacing. The principles that apply to this project are summarized at the end of this section.

### Found and fixed

- [x] The player had no keyboard shortcuts besides L for the dictionary. Space and K play and pause, ← and → skip to the previous and next cue (or by a few seconds without cues), and R replays the current cue. Space is left to a focused button, so pressing it there does not also toggle playback. The control labels, shown as tooltips, name their keys.
- [x] The L hint next to the lookup button showed on phones, where there is no keyboard. It shows only for fine pointers.
- [x] On phones the lookup and new-flashcard buttons lay over the subtitle text, and the file name of an audio file showed through the translucent control bar. The subtitles keep clear of the buttons and the bar is blurred.
- [x] The subtitles panel scrolled back to the active cue on every cue change, even while the user was reading elsewhere. It follows playback until the user scrolls the active cue out of view, then offers "Back to current line", and follows again once the user seeks from a cue.
- [x] The home screen's Dictionaries button said that managing dictionaries was not available, although the Dictionaries screen exists under Settings. It opens that screen.
- [x] The project screen's header had a "Saved" button that only showed a notice. Work is saved as it happens, so the button is gone.
- [x] The project screen said "Settings" twice: once for the project's settings and once, in the footer, for the app's. The project's is "Project settings".
- [x] The Flashcards panel offered reviewing, exporting, and AnkiConnect, each of which only said it was not available yet. The options are marked "Coming soon".
- [x] Loading a project list or a project showed a line of text. Content-shaped skeletons take its place, with a live status for screen readers.
- [x] The Settings screen's Back was a bordered button while every other screen uses the quiet arrow. They match.
- [x] A playback failure was a red sentence with no way on. It is a small card that names the problem and offers "Back to the project".
- [x] Icon buttons were 32 pixels, below the 44 points Apple and Material ask for. They grow to 44 pixels for coarse pointers.
- [x] Reduced motion was honoured in three places. A global rule shortens every transition and animation when the system asks for reduced motion.
- [x] Nothing accounted for the notch and home indicator of phones. The viewport covers the safe area, and the headers, footers, player controls, and the notices region pad themselves by the insets.

### Found and left for later

- [ ] The seek bar and the volume are native range inputs with no time preview while scrubbing. A custom slider with `aria-valuetext` ("1:23 of 45:00") and a hover tooltip would match other players.
- [ ] Subtitles have no size or background setting. Every major streaming service offers one, and learners read subtitles longer than viewers do.
- [ ] The example flashcard in the project form is always German, whatever target language is chosen.
- [ ] The Screenshot and Tracks buttons sit as grey text buttons in the top-left corner of the stage, apart from the other controls. They belong in the control bar.
- [ ] Notices appear at the bottom centre, where the reader's progress slider also sits, so a notice can cover it.
- [ ] Target-language text has no `lang` attribute, so screen readers and text-to-speech pronounce it as the interface language.
- [ ] A `?` overlay listing every shortcut would make them discoverable without hunting through tooltips.

### Principles that apply here

- Status within a second, progress beyond ten: lookups, conversion, imports and saves each show state at once; anything longer shows how far it is and can be cancelled (NN/g response times).
- Every automatic or destructive step can be undone, as the flashcard notices already do (NN/g user control).
- One gesture for one meaning across subtitles, the transcript panel, the reader and the extension; the same name for the same thing on every screen (NN/g consistency).
- Hover is never the only way: every hover lookup has a tap and a keyboard path (Apple HIG, WCAG 2.1.1).
- Touch targets of 44 points, 48 on Android, 24 CSS pixels at the least on the web (Apple HIG, Material 3, WCAG 2.5.8).
- The immersion screens show the media, the subtitles and the lookup, and nothing else until asked (NN/g minimalist design; the product's own "introduce gradually").
- Captions: at most two lines of about 40 characters, high contrast on a translucent box, never under the controls (BBC subtitle guidelines).
- Player keys follow YouTube where they can, and cue-level keys are added because the cue is the unit of study.
- Review, once built, follows Anki: Space shows the answer, 1 to 4 rate, the buttons show the next interval, and context appears only after the reveal.
- Reader: lines of 50 to 75 characters, line height 1.4 to 1.6, 4.5:1 contrast in all three themes, word taps never turn the page (Baymard, WCAG 1.4.3).
- Contrast 4.5:1 for text and 3:1 for controls and focus rings; a visible focus ring on everything; Escape closes and returns focus (WCAG 1.4.3, 1.4.11, 2.4.7).
- Motion: about 100 ms for feedback, 150 to 250 ms for pop-ups and notices, 300 to 500 ms for panels, and none when the system asks for less (Material 3, WCAG 2.3.3).
- Loading: nothing under a second, content-shaped skeletons up to ten, a determinate bar beyond (NN/g skeleton screens).
- Empty states explain and offer one main action; error states say what happened and what to do next, where it happened (NN/g).
