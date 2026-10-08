# UX refinements

All these notes except the section from the [Audit of October 2026](#audit-of-october-2026-not-approved-yet-but-saved-for-reference) have been approved in terms of their *content*, but the document as a whole needs to be organized better.

## Video and audio playback

- [x] On desktop/mobile, a specification of video and audio formats compatible with the target browser environment should be referenced when opening a media file. On user consent, the app should stream the media file in a compatible format. It is important that the audio format allows seeking to arbitrary timestamps, so playback can be controlled accurately based on e.g. subtitles timings.
- [x] A conversion writes about five minutes of media ahead of the newest request and then stops, so that a paused video does not keep a processor core busy. A request within a minute ahead of the running conversion lets it continue; a seek further away restarts it at the segment before the one requested. A request waits up to sixty seconds for its segment before the player is told to retry.
- [x] Converted media is kept on disk between sessions, within a budget of five percent of the disk (at least 1 GiB, at most 100 GiB) and never within the last five percent of free space (at least 2 GiB, at most 20 GiB). Clearing the cache from Settings keeps the conversions that are playing right now. Removing a media file removes its cached conversions unless another media file points at the same source file.
- [x] A media element asked to seek exactly to a frame boundary sometimes shows the previous frame. Every programmatic seek (clicking a cue, clicking the waveform) therefore targets the asked time plus half a frame at the file's frame rate, or half of a sixtieth of a second when the rate is unknown. The time shown and the cue membership keep the asked time.
- [x] Switching tracks reloads the stream, because a converted file has a different playlist per track choice. The player remembers the position before detaching and seeks back to it once the new source has loaded its metadata.
- [x] Closing the conversion notice or the track choice returns keyboard focus to the control that opened it.

## Subtitles

- [ ] When both target-language and translation subtitles are available, cues from both tracks should be paired sensibly, e.g. accounting for differences in segmentation of dialogue. Whereas seeking via cue timings with just the target-language subtitles open happens based on that track's cue timings, the timings of the combined cues should be used when both tracks are open.
- [x] The subtitles form a band, and the player controls sit at the bottom of the stage under it. The band sits under the picture when the stage can hold it and the controls there below a picture as wide as the stage; otherwise it lies over the picture's lower edge, above the controls, so that a short, wide window does not shrink the picture to make room. Under the picture, the stage keeps the controls' height at its foot, and the picture and the band are centred together in the rest, with the band right under the picture. Over the picture, the controls lie on its lower edge too. The controls take no room of their own in the layout, so the picture never moves when they show or hide. When the side panel is stacked under the stage, as on a phone, the stage is only as tall as the picture, the band and the controls, and the panel takes the rest. The picture of an audio file has no known proportions, so its band always sits underneath.
- [x] Over the picture, the band's backdrop fades in from transparent above the subtitles instead of ending in a hard line, and reaches down behind the controls to the bottom of the stage, so no gap opens under the subtitles when the controls fold away. Under the picture, the band lies on black, like the video, instead of the backdrop, so the subtitles' background opacity shows only over the picture.
- [x] The text shadow now shows on every word of the subtitles. Browsers give buttons no text shadow of their own, so the words that can be looked up had lost it, which in Japanese left only the punctuation shadowed.

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
  - A lost connection, a request with no answer or a server error puts a flashcard in the list, as does a refusal that may pass: the user signed out or not allowed for now, a request the server gave up waiting for, or too many requests. A save the server refuses outright, which sending again cannot fix, gets a notice of its own with Open and Discard and no Retry, and is left out of the status line while that notice shows. Once the notice is dismissed, or Open is pressed on it, the flashcard is counted in the status line, listed without Retry.
  - While a flashcard's Retry is under way, the list shows it as saving, and its Discard is unavailable.
  - Open puts the flashcard back in the form, going back to its media screen if the user has left it, and saves the flashcard open there as if the user had moved on from it. The flashcard stays listed until the form has it, however long its screen takes to load. If the project or the media file fails to load, or the media file no longer exists, a notice says the flashcard could not be opened, and it stays listed. If the user goes elsewhere before the screen appears, the flashcard stays listed and is no longer waiting to open. Opening a listed flashcard from the waveform or the flashcard list opens it the same way, with its edits. A flashcard without a media file has no Open, in the list or on its notice.
  - Open during a Retry opens the flashcard at once with the content being sent, as for any flashcard whose save is under way, and takes it off the list, since the form now holds the edits. If that Retry then fails, the flashcard is not listed again: the open form counts as unsaved work.
  - A flashcard opened from the list counts as changed, since its edits are saved nowhere: closing it without saving discards it with Undo.
  - The waveform draws a listed flashcard with its listed edits, including one never saved. Retiming it there changes only those edits, so it stays where it was dragged; nothing is sent until Retry. A retiming made during a Retry keeps the flashcard listed with the new timing, even if the Retry succeeds. A save of a listed flashcard from the form takes it off the list, since the form holds the user's latest edits.
  - Only Discard throws the edits away, after which a brief notice offers Undo, which lists the flashcard again. The × only collapses the list, or hides a refused save's notice, after which the flashcard is listed.
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

## Audit of October 2026 (not approved yet, but saved for reference)

The web app was run against a local server and walked through at desktop and phone sizes, in both themes, with the heuristics below as the yardstick: Nielsen Norman Group's ten usability heuristics and response-time limits, Apple's Human Interface Guidelines and Material 3 for touch targets and safe areas, WCAG 2.2 for contrast, focus, target size and reduced motion, the BBC subtitle guidelines, YouTube's and Anki's keyboard conventions, and Refactoring UI for hierarchy and spacing. The principles that apply to this project are summarized at the end of this section.

### Found and fixed

- [x] The player had no keyboard shortcuts besides L for the dictionary. Space and K play and pause, ← and → skip to the previous and next cue (or by a few seconds without cues), and R replays the current cue. Space is left to a focused button, so pressing it there does not also toggle playback. The control labels, shown as tooltips, name their keys. (Within the subtitles, superseded by the fourth round's lookup cursor: there ← and → move the cursor, and ↑ and ↓ skip cues.) (The sixth round adds C and E for flashcards.)
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

### Exploratory test, second round

A session-based exploratory test (charters: reproduce the reported issues, make flashcards as a first-time user, edit clips, interrupt and resume, sweep every screen) found 27 issues. Fixed in this round:

- [x] Clicking the picture plays and pauses, as in every player, and the video fills the stage instead of staying at its own size.
- [x] The Screenshot button in the stage's corner showed a thumbnail nothing used. It is gone; Tracks is an icon button like the other overlay controls.
- [x] The waveform starts closed. Saved cards are reopened from the "Open the flashcard" button on their subtitle card, as well as by double-clicking the waveform.
- [x] Clicking anywhere on a subtitle card seeks to its cue; word buttons still look up.
- [x] The seek bar's arrow keys move one second rather than one millisecond, and it announces its time.
- [x] A saved flashcard was announced in a bar above the video, which resized the picture and stayed until dismissed. The brief bottom toast with Undo, which off-screen saves already used, serves both.
- [x] Only the card open in the editor has draggable clip handles and a screenshot marker on the waveform; a closed card's bounds cannot be changed by accident.
- [x] Starting an edit, by any route, seeks to the clip's start, and if the player was playing, loops the clip until the card closes, the user pauses, or the user seeks elsewhere.
- [x] A failed save keeps a failure line in the editor until the next attempt, and closing the card afterwards lists it among the cards not saved instead of dropping it.
- [x] Deleting a saved card asks first; a new card has no Delete, since Close offers Undo.
- [x] The Subtitles panel toggle is unavailable while a card occupies the side panel, and says why.
- [x] On the web, where there is no server waveform, the editor still shows the clip's times, length, ±100 ms nudges and the clip's Play button.
- [x] A word with no dictionary entry still offers Flashcard, so a card can be made from the sentence.
- [x] Re-adding a file already in the project opens the existing one instead of adding a duplicate row.
- [x] The project form refuses the same target and translation language.
- [x] Every Back control sits at the left of the header, before the wordmark, named for its destination, as the media and reader screens already did.

Found and left for later:

- [ ] A tap on the video on a phone pauses it; the platform convention is that the first tap reveals the controls.

### Follow-up to the second round

Fixed from the findings left for later and from a review of the media screen:

- [x] The frequency badges follow a "Frequency" label and explain themselves in a tooltip.
- [x] A media file resumes where playback last was. The position is stored as a preference, like the reading place in a book: when playback pauses, every fifteen seconds while it plays, and when the file is closed. A file left within five seconds of its start or end starts over.
- [x] The editor's word and definition fields say "Looking up…" while the lookup is on its way.
- [x] With a few hundred cues, the subtitles list stretched the page: every clickable text holds a screen-reader announcement positioned off screen, whose containing block was the panel rather than the scrolling list. The text is now its own containing block.
- [x] The media screen's header lies over the top of the stage and folds away with the controls, so the subtitles panel takes the full height and the picture never moves. Its Back button is named after the project; the gear moved from the header to a footer like the other screens', with the theme menu.
- [x] Keyboard focus left on a control kept the controls from hiding, so they never hid after a toggle was clicked. Only visible keyboard focus keeps them open now. In distraction-free mode the lookup buttons and the pointer hide with the controls, and Escape leaves the mode.
- [x] The toggles name what pressing them does now (enter or leave distraction-free mode, show or hide the subtitles panel), the subtitles panel toggle shows a side panel rather than captions, and a fullscreen toggle (F) joins them. The Tracks button moved from the stage's corner into the control bar. The waveform toggle works in distraction-free mode. The L hint beside the lookup button is gone; its tooltip names the key.
- [x] A click on a cue in the waveform's cue band seeks to the cue's start rather than the clicked time.
- [x] The dictionary pop-up closes as soon as Settings covers its screen, where it could not be closed before. Its word is an editable field, so another word can be looked up in place, and "No entry" offers the dictionaries settings.
- [x] The seek bar draws what the player has loaded behind its slider, as a stream being converted arrives piece by piece.
- [x] The subtitle track choices are named for their language ("Japanese subtitles", "English subtitles") inside their lists and as tooltips, with the same "None" option in each.
- [x] The theme is chosen from a menu in the footer, system, light or dark, and the choice is stored as a preference instead of lasting until the system theme next changes.
- [x] Importing a large dictionary took minutes, and the desktop webview's request gave up after about a minute while the server finished the import, so a retry imported the dictionary twice. Imports are now jobs the screen polls, with the entries stored so far, and a failure stays on the screen; a dictionary with the title of one already imported is refused.
- [x] Definitions on a flashcard are taken as Markdown from the entries, so that lists stay lists rather than running together.
- [x] The footer is thin and stays at the bottom of the window; while Settings is open, its Settings control stands for the open page. Menus close on a press outside them, also where a clicked button gets no focus.
- [x] The "Converted videos" section is the "Media cache", with a line on what the cache holds, the usage as "The cache is using 90 MB of 100 GB", a maximum size to choose, and a "Clear media cache" button. The conversion notice's "Don't show this again" starts ticked. The project's media heading narrows the list by kind.

### Third round of notes

Fixed from the next round of the user's notes:

- [x] The hover highlight of a Japanese run grew to the matched characters only after the hover-intent delay, which exists to keep the pop-up from jumping to every word the mouse passes. The match was given its own, shorter timer. (Superseded by the fourth round, which removed the hover-intent timer altogether.)
- [x] The pop-up's magnifier was decorative. It submits a changed word, and selects the word shown otherwise, to show that it can be edited. The pop-up can be expanded to most of the window's height to show more of the entries, and the header's "Flashcard" button is an icon button with a tooltip.
- [x] The footer differed between screens: a text link centred at the content's width on some, a gear at the edge on the media screen. Every screen has the same thin bar with the gear and the theme menu at the window's right edge.
- [x] Removing a large dictionary gave no sign for several seconds. The server deletes it in one step with no progress to report, so the row says "Removing…" with its buttons disabled until it is gone.
- [x] The player had no mute. A mute button sits by the volume; unmuting restores the volume.
- [x] Distraction-free mode was confusing beside the subtitles panel toggle and fullscreen. It is gone; the chrome still folds away while the video plays and the pointer rests. Pointer moves over the subtitles, and the pause an open pop-up causes, no longer bring the controls back, since looking words up is not a reason to see them.
- [x] The subtitles jumped when the controls folded away, because the controls' bar collapsed in height. The bar keeps its space and only fades.
- [x] The subtitles were the same size on a phone and on a large monitor. They scale with the width of the picture, from a phone's size to about two and a half times it.
- [x] On a Mac, the video's context menu offered the browser's own controls, which then sat behind the app's. The menu is suppressed on the video.
- [x] The media screen forced the dark theme on everything, including the subtitles panel and the footer. Only the picture and the bars over it stay dark; the rest follows the theme, and the pop-up is rendered outside the dark scope.
- [x] The header's language badge and the waveform's chevron bar and button were redundant with the project's settings and the waveform toggle, and are gone. On a phone the track choices fold into one line that opens on a press.
- [x] The reported scrollbars on the media screen with a long file could not be reproduced in Chromium or in the system WebKit at several window sizes, with the waveform and with the flashcard editor open; the layout was hardened regardless (the screen clips to the viewport and the side panel scrolls inside itself). If it persists in the desktop app, the next step is a measurement there.

### Fourth round of notes

Fixed from the next round of the user's notes:

- [x] Lookups still felt slow on a long file, and the user saw the character under the pointer highlighted before the match. The cause was rendering, not the network: every hover, and every playback tick, re-rendered the whole media screen with its hundreds of cue cards, about 140 ms each time on the test file, because the lazy lookup hook changed store state and the cards received fresh callbacks. Hover lookups now go through the store without a hook, the cue cards are memoised with stable callbacks, and only the card holding the active word receives it. A cached hover now highlights in about 45 ms and a fresh one in 130 to 170 ms, most of it the request itself.
- [x] Two highlights at once, the character under the pointer and the pop-up's word, confused more than they helped. Nothing is highlighted until the hover lookup answers; then the matched characters are highlighted and an open pop-up moves to them in the same moment, so the highlight and the pop-up always agree. The separate hover-intent timer is gone. (Superseded by the fifth round, which highlights the cursor at once and takes the highlight off the pop-up's word instead.)
- [x] Each lookup request from a browser or the desktop webview still pays a CORS preflight round trip, since the bearer token makes the request non-simple and the preflight cache is keyed by the full URL. Left for later; a token carried in a way that keeps the request simple would remove it.
- [x] The pop-up opened small, grew little when expanded, and its expand button was prominent in the header. It opens wider and taller, the expanded size spans the window's height, and the toggle is a thin bar at the pop-up's bottom.
- [x] L only opened the search field. With the pointer on a word it looks that word up as a click would. (Extended by the lookup cursor below: L looks up from the cursor, which the keyboard moves too.)
- [x] A cue vanished from the picture and lost its highlight in the panel at its end time, so a word could not be looked up once the line had been spoken. A cue stays shown until the next one starts.
- [x] The control bar wrapped onto two rows on a phone. The speed select became a Playback options menu (renamed Subtitle options in the fifth round), which also hides the subtitles, and the subtitles-panel, waveform and fullscreen toggles moved to the right of the footer, with the gear and theme menu at its left. The menu's text colour was unreadable inside the dark stage, and the theme menu would have opened off the screen from the left edge; both are fixed in the shared menu button.
- [x] Double-clicking the picture toggles fullscreen. A single click still plays or pauses at once; the second click of a double-click undoes that, as video sites do, rather than delaying every click.
- [x] The subtitle lines floated in pills that grew and shrank with each cue, and the pills' size left little room to aim at words. The subtitles sit in one box docked across the bottom of the picture, of a fixed height for the lines it shows, translucent by default and with shadowed text; the whole box is a lookup surface, so moving the mouse over it leaves the controls hidden. The box's colour and opacity and the text's shadow, size and colour are set from a dialog in the Playback options menu and kept as a preference. (The fifth round renamed the menu, dropped the box's colour for a dark one, enlarged the defaults, and moved the box under the picture onto the controls' surface. The sixth round put it on black.)
- [x] Nothing showed which word of a cue a flashcard had been made from. The word is marked with a dotted underline in the overlay and in the panel; the marks are computed once per cue so that the memoised cards keep their stable inputs.
- [x] A subtitles file beside a media file had to be added by hand after the file. When a media file is added by path, the server lists its folder, adds the subtitle files sharing its stem (an optional language tag and the usual `forced`, `sdh` or `cc` suffixes allowed) as tracks, and fills the unset roles from the tags. Three-letter codes such as `jpn` are read but not matched to the project's two-letter tags, so such a file is added without a role. (Superseded by the fifth round, which matches three-letter codes to two-letter ones.)
- [x] A single click on a word inside the pop-up looked it up, which also fired when the click was meant for a Yomitan entry's own clickable elements. Inside the pop-up only a double-click, double tap or Shift+Enter looks a word up; a held tap still makes a flashcard. The deferred-click machinery that held a click back for the double-click interval had no other use and is gone.
- [x] The pop-up jumped from word to word. It glides over about 150 ms when it moves to another word on the same side of the text, and still jumps when it changes sides or first opens, since a transition between the two anchorings looks wrong; reduced-motion settings turn the glide off. The reader's pop-up follows the same rule.
- [x] Expanding the pop-up only widened it when its word lay mid-window, as in the subtitles panel. Expanded, it now spans the window's height less a margin and may cover its word; compact, it stands on the side with more room without covering it. Both are centred on the word and shifted to stay inside the window; one rule serves the media screen and the reader.
- [x] Escape closed an expanded pop-up outright. The first Escape makes it compact again; a second closes it.
- [x] Holding a cue until the next one made a seek into a gap show a cue from long before. The hold now lasts only while playback carries on from the cue, with a jump of two seconds or more counting as a seek. Each of the three places that need the shown cue runs the rule itself; if the subtitles panel is opened during a hold it shows no active cue until the next one, which passing the cue down from the screen would fix.
- [x] The keyboard's lookup controls fought the player's. On a focused word over the video, ← and → skipped between cues; on a focused word in the panel, they moved the starting character of a Japanese run and skipped cues at the same time; and L looked up only what the mouse was on. The mouse highlight, the keyboard's starting character and L's target were three separate states, and the page's shortcuts ignored keys a focused word had already handled. The subtitles now keep one lookup cursor, which the mouse and the keyboard move to the same places and which is highlighted the same way in the overlay and the panel. From a focused word, ← and → move the cursor through the cue (a word, or a character of a Japanese or Chinese run, at a time) and look up ahead as a resting mouse does (in Japanese or Chinese, superseded by the fifth round, where they move by a word and Shift moves by a character); ↑ and ↓ skip to the previous or next cue; Escape takes the cursor away; and L looks up from the cursor. The keys map to "forward" and "backward" along the text in one place, so that right-to-left scripts can reverse them later.

### Fifth round of notes

Fixed from the next round of the user's notes:

- [x] The Playback options menu held only the subtitles' settings, so it is named Subtitle options.
- [x] The subtitle appearance defaults were small and faint. The default text is half as large again as before and sits at 100%, in the middle of a scale from 50% to 150%. The default shadow is the former strong one, now Medium, between None, Light and a new Heavy outline. The background is black at 25% opacity, and its colour is no longer a choice. The preview, which spanned the dialog in a flat strip, is a small picture of a video's proportions, and its subtitles can take more than one line.
- [x] Under the picture, the picture's box filled the stage's spare height and centred the video in it, so the band could sit far below the picture. The picture and the band are now centred in the stage together, with the band right under the picture. There the band lies on the controls' surface rather than the overlay's backdrop, so the background opacity shows only when the band lies over the picture. (The sixth round put it on black and moved the controls to the bottom of the stage.) (The sixth round put it on black and moved the controls to the bottom of the stage.)
- [x] The subtitle appearance can also be set from a Subtitles section in Settings, after Dictionaries, which shares its preview and controls with the dialog and can restore the defaults.
- [x] The media screen's waveform was a solid shape of one column per pixel, while the clip editor drew spaced bars, one per peak, as SVG. Both now draw the same even bars on a canvas, which stays at one node and a fixed number of draw calls however many peaks are on view, where the SVG's cost grew with every peak. When more peaks are on view than fit as separate bars, each bar shows the loudest of its peaks, and the bars keep the same peaks as the strip follows playback, so the waveform does not flicker while it scrolls. Silence is a thin line, and audio not yet loaded a faint one. The strip's background stays dark in both themes, since its overlays are drawn for a dark background; the clip editor's follows the theme.
- [x] A long field of the flashcard form, such as a definition, stops at about six lines while it does not have focus, and fades out its bottom edge to show that there is more. With focus it shows all its text.
- [x] The flashcard form scrolled back to the top whenever the media screen updated, as when the clip or screenshot was moved, the playback speed changed, or the subtitle appearance dialog opened. The auto-growing text fields re-measured themselves after every render by collapsing to no height, which shrank the form's scrolling area for a moment and let the browser clamp its scroll position. They now re-measure only when their text or width changes, and hold their height while they do.
- [x] A refused save was reported twice: by its own notice and in the status line of flashcards not saved. The status line now leaves the flashcard out while its notice shows.
- [x] The clip editor's "Play clip" button reads "Play", and is announced as "Play the clip".
- [x] In Japanese or Chinese, ← and → moved the cursor one character at a time, which made walking through a sentence slow. They now move by a word. → goes past the characters the lookup matched, or one character until it answers. ← goes to the start of the word before the cursor, found by cutting the run into words from its start with lookups, as → would cut it. These lookups are cached, so stepping back over words just stepped forward over is immediate. Shift with an arrow moves one character.
- [x] The desktop app's bundled ffmpeg was built without a SubRip encoder or muxer, so every embedded subtitle track failed to extract, and the failure was only logged. The build includes them now, and the ffmpeg build workflow checks that extraction works before a release. Text tracks are still extracted while the file is added, in about a second each; the media file is saved first, so a track that fails keeps neither the others nor the file from being added. A file with many text tracks therefore makes adding it slow, which one ffmpeg run for all tracks, or a background job, would fix.
- [x] Subtitle tracks inside a media file are tagged with three-letter codes such as `eng`, which never matched a project's `en`, so they were stored without a role. Three-letter codes now count as their two-letter equivalents, for embedded tracks and for subtitle files beside the video alike. Tracks found inside and beside the file are given roles in one step: a role already set is kept, a subtitle file beside the video takes a role first, and an embedded track takes a role left empty when it is the only embedded track in its language. Picture-based tracks, such as those of DVDs and Blu-rays, stay hidden.
- [x] Tapping a word in a Japanese or Chinese run counted its focus as keyboard focus, since a tap focuses only after the finger lifts, so the cursor jumped to the run's first character and looked it up before the tapped character's own lookup. A tap now leaves the cursor where it lands. The browser tests that caught this had also come to share one media file across tests and to wait for a request that a cached lookup never sends; each test now adds its own file, and the keyboard tests check the word steps.

### Sixth round of notes

- [x] Under the picture, the subtitle band lay on the app's dark blue, which set it apart from the black around the video. It lies on black now.
- [x] The lookup and new-flashcard buttons floated above the subtitle band, over the picture. They sit in the band's top-right corner, laid over the subtitle box so that the box keeps its size; with no subtitles to lie over, they take a row of their own. A long cue that fills the box can run under them while they show.
- [x] The player controls and the header over the picture lay on translucent dark blue, which tinted the edges of the video. Both lie on translucent black now.
- [x] The player controls sat right under the subtitles, so that on a tall stage they floated in the middle of the black space. They sit at the bottom of the stage. Under the picture, the stage keeps their height at its foot and centres the picture and the subtitles above it; over the picture, the band rises above them and its backdrop reaches down behind them.
- [x] The subtitles panel showed the target language at the size of body text. It is one step larger, and the translation one step larger than before.
- [x] In fullscreen, the header folded away with the controls, but the footer stayed and kept a strip of the screen from the picture. In fullscreen the footer lies on the stage under the controls and shows and hides with them; its height counts as part of theirs, so the picture keeps its place. In fullscreen it lies on the stage's dark colours whatever the app theme.
- [x] Most flashcards are kept as the lookup fills them, so opening the form for each one cost a Save or a Close every time. On the media screen, a double-click, double tap, held tap or Shift+Enter on a word, the pop-up's flashcard buttons, and the new-flashcard button now save the flashcard at once, built and filled exactly as before, with the brief notice and Undo that a flashcard saved in the background shows. A flashcard whose definitions are still on their way waits for them, for up to ten seconds, as one left in the form does. A flashcard open in the form stays open, untouched. The new-flashcard button's flashcard has no word, and its notice says "Saved a flashcard without a word."
- [x] C saves a flashcard from the lookup cursor as a double-click there would, or the new-flashcard button's flashcard when there is no cursor; the button's tooltip names the key. E makes the same flashcard but opens it in the form, which is the old way; while a flashcard is open, E does nothing, so it never replaces an open flashcard.
- [x] A flashcard made from a word that appears twice in its subtitle was always underlined at the first occurrence, since only the word and the cue were recorded. The flashcard now records where in the cue its word was taken from, and the underline marks that occurrence; the offset is dropped only when the word is edited to something that no longer sits there, and such a flashcard falls back to the first occurrence.

---

## unorganized but approved

- when a video has been opened:
  - [x] the browser's own context menu does not open on the video, so its native controls cannot be switched on behind the app's
  - [x] the player controls fit on one row even on a phone; the toggles for the subtitles panel, the waveform and fullscreen sit at the right of the footer
  - [x] a subtitle cue stays on the picture after it ends while playback carries on from it, until the next cue starts, so I can look up its words after they have been spoken; seeking into a gap between cues shows no cue
  - [x] in fullscreen, the footer lies under the player controls at the bottom of the screen and shows and hides with them, as the header does, so the picture never moves
- when subtitles are opened and visible:
  - [x] the subtitles keep their place whether the controls are shown or hidden, and grow with the size of the picture
- navigating from the media screen to Settings and back:
  - [x] it opens over the current screen, from the gear in the footer; Back returns me to the screen as it was, so a video keeps playing while I change a setting
- auto-displaying of subtitles cues text: 
  - [x] cue text remains active after the playhead leaves its corresponding end time. (but manual seeking into a gap between cues/cards highlights no cue)
  - [ ] when a card overlaps a cue, but not exactly, tiny non-overlapped parts shouldn't briefly fill the active cue text slot and cause flashing of the cue text
- footer:
  - [x] the footer is the same on every screen: a thin bar at the bottom of the window with the Settings gear and the theme menu at its left edge, and the open screen's own buttons, such as the media screen's panel toggles, at its right; the gear stands for the page already open while Settings is open; on the media screen in fullscreen, it shows and hides with the player controls. though some buttons may change, their place should always be the same when they are there.
- removing a dictionary:
  - [x] the row's buttons are disabled until it is gone; if the removal fails, the row returns to normal and I am told
- looking up words via the pop-up:
  - [x] lookup should feel instant. however, sweeping the pointer across text rapidly shouldn't trigger a succession of lookups and cause the flashing of many dictonary entries.
    - Lookups for whole cues or paragraphs are fetched ahead in one batch request, so hover and click read from the cache and sweeping the pointer sends no requests for that text. The pop-up still follows the pointer after a 40 ms rest.
  - [x] to help lookup feel instant, we need to A) pre-fetch results for text that is likely to have lookups performed on it next and B) cache results smartly.
    - Decision on the range: in a media file, the shown cue, the cues overlapping the next 60 seconds of playback, and the cue-panel cards in view; in the reader, the visible paragraphs plus about one screen on either side. The range follows playback and scrolling, and the whole file or page is not fetched.
    - the big question: what range of text should we pre-fetch results for? every cue/paragraph near the mouse? (not really helpful on mobile.) every cue/paragraph on the page? every cue/paragraph on the page, plus some more? or every cue/paragraph in the media file? not sure what the right balance is; we want to generally do what's easiest on the server/DB, but we don't want to make users wait long for a big batch of lookups any more than an individual lookup, *if we can avoid it*. 
- waveform:
  - [x] the waveform and the clip editor in the flashcard form draw the audio the same way, as evenly spaced bars mirrored around the middle
