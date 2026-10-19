# User stories

Each story is written in the following format:

```md
<role>:
- <condition>
  - [ ] <result>
  - ...
- ...
```

A checked-off user story has already been implemented.

As a combination of the role, condition, and result text, each user story should read much like instructions for using the app. The user story text will be fed to a chatbot in order to help answer users' questions about the app.

Where mouse actions are specified, the actions should generally also be possible via corresponding keyboard actions, e.g. hover -> tab-focus.

---

### Layout/general

As a user:
- when I am using the app:
  - [ ] I can resize the app window, and the app's layout adjusts accordingly
  - [x] the app follows my system's light or dark theme
  - [x] from the theme menu at the bottom of the screen, I can choose to follow the system or to always use the light or the dark theme; the menu's icon shows the choice, which is kept on the device
  - [ ] I can change the size of the app's text from the "Text size" menu at the bottom of the screen, in steps from 75% to 175%, and return to 100% (not in the browser, where the browser's own zoom applies)
  - [ ] *on desktop*, I can see a menu bar with options:
    - easyImmerse menu: About, Preferences, Quit
    - File menu: New project, Open project, Save project, Export flashcards, Import/export project, Exit
    - Edit menu: Undo, Redo, Cut, Copy, Paste
    - View menu: Toggle fullscreen, Toggle subtitles panel, Toggle waveform visualization
    - Window menu: Minimize, Zoom, Bring all to front
- when I open the app for the first time:
  - [ ] I am prompted to select a language for the app's interface
  - [ ] I see a short, human-written introduction to immersion and review, which I can skip
  - [ ] I am invited to open a library item or add my own media, without being asked to create an account
- when I first reach a point where another easyImmerse component would help:
  - [ ] I am told about that component at that point, e.g. the desktop app when a media format is unsupported in the browser, cloud or LAN sync when I import/export a project, etc.
  - [ ] I can dismiss the suggestion, and it is not shown again unless I choose to see it again in the settings

---

### Home screen

As a user:
- when I am on the home screen:
  - [x] I see a list of my recent projects (if I have any), most recently opened first
  - [x] I see a button to create a new project
- when I click on a project in the list:
  - [x] I am taken to the project's screen
- when I click on the "Create new project" button:
  - [x] the new project form opens
- when I open the new project form:
  - [x] my last created project's language and settings are pre-filled in the form
  - [x] I can enter the project settings.
- when I submit the new project form:
  - [x] I am taken to the new project's screen

---

### Project settings

As a user:
- when I'm editing a project's settings:
  - [ ] I can change the following settings:
    - project name
    - target language
    - translation language (defaulting to my interface language)
    - flashcard settings:
      - which fields to include by default in new flashcards (with presets for beginner, intermediate, and advanced learners)
      - which of the included fields appear on the front of a card (vs. the back)
      - default tags for new flashcards, and whether each flashcard is also tagged with its media file's name (on by default)
      - whether I'd like easyImmerse to log when I delete any flashcard that was previously exported to Anki (on by default).
      - whether to try filling in the audio fields with TTS in the absence of an audio track
  - [x] I see a preview of an example flashcard with the current settings, which updates as I change the settings
  - [x] on a narrow screen, the example flashcard stays in view under the preset as a small card that I can expand
- when a flashcard field is marked as included by default:
  - [x] I see beside the checkbox and indication of which side of the card it is on, and I can move it to the other side with a click
  - [x] a screen reader names the field together with its side, for example "Screenshot on the front"
- when I change which fields are included by default, or change which side of the card a field is on:
  - [x] the example flashcard shows the change
  - [x] the preset shows as *Custom* if the fields no longer match a preset
- when I select the *beginner* flashcard preset in the new project form:
  - [x] the pronunciation fields are included by default
  - [x] the front of a card shows the sentence audio and the screenshot
- when I select the *intermediate* flashcard preset in the new project form:
  - [x] the pronunciation fields are excluded by default
  - [x] the front of a card shows the sentence audio and the screenshot
- when I select the *advanced* flashcard preset in the new project form:
  - [x] the L1 translation field is excluded by default
  - [x] the L2 definition field is included by default
  - [x] the front of a card shows the word, the sentence and the screenshot

---

### Project screen and saving projects

As a user:
- when I am on the project screen:
  - [x] I see the open project's name
  - [x] I see a list of the project's media files
  - [x] the list's heading is a menu that narrows it to videos, audio or ebooks, each choice counting its files
  - [x] I can click on a media file to open it
  - [x] I can remove a media file from the project through the menu on its row
  - [ ] the menu bar has an option to save the project
  - [x] I see a button to edit the project's settings
  - [x] the status of dictionaries is indicated, according to the languages of my project flashcard settings
  - [x] I can see the project flashcards panel
- when I click on the "Add media" button:
  - [x] I am prompted to select a media file to add to the project
- when a media-source plugin is active:
  - [x] I can see a button tagged with the plugin name button beside "Add media", which opens the plugin's media-import interface
- when I submit within the plugin's media-adding interface:
  - [x] I see progress for the operation of adding resources
- when I add a media file to the project:
  - [x] I see the new media file in the list of media files
  - [x] the new media file is opened
- when I click "Remove" next to a media file:
  - [x] the media file is removed from the project's list; the user's files are left alone
- when I save the project via the menu bar or keyboard shortcut:
  - [ ] the project's name, language, media files registry, etc. are saved to disk or online, according to the environment and settings
- while I am working in a project:
  - [ ] my work is saved automatically at regular intervals, so an unexpected crash does not lose it
- when I try to close the app while a flashcard has unsaved changes or is still being saved:
  - [x] I am warned and can keep the app open, on desktop, on the web and in the browser extension
- when I open the app after it closed unexpectedly:
  - [ ] the last automatically saved state of my project is reloaded
- when the last automatically saved state cannot be loaded:
  - [ ] I am told about the problem, and the app falls back to the most recent earlier autosave that loads

---

### Video player

As a user:
- when a video has been opened:
  - [x] I see a video player
  - [x] I can pause and resume playback through player controls, keyboard shortcuts, or double-clicking on the video
  - [x] I can seek to a different time in the video via the playback bar
  - [ ] I can skip forward or backward (by cue timings if any subtitles tracks are open) via player controls
  - [x] I can adjust the volume of the audio track
  - [x] I can mute and unmute the audio with the button next to the volume
  - [x] I can choose the playback speed from a button in the player controls that shows the current speed, such as "1x", and opens a menu of speeds
  - [ ] I can open the player subtitles menu with a button, showing options for:
    - toggling the visibility of the target language track (disabled if absent)
    - toggling the visibility of the translation track (disabled if absent)
    - opening the subtitles appearance dialog
  - [x] the footer shows a button for toggling fullscreen mode
  - [x] I can toggle fullscreen mode with the F key or by double-clicking on the video
  - [ ] the footer shows a button for toggling the visibility of the subtitles panel
  - [ ] the footer shows a button for toggling the visibility of the waveform visualization
- when I open a media file for the first time, and the audio tracks correspond neatly to both or either of the project's target or translation languages:
  - [x] the tracks are automatically opened as the target- and/or translation-language tracks
- when I open a media file for the first time, and the audio tracks do NOT correspond neatly to both or either of the project's target or translation languages:
  - [ ] I am prompted to select a track for each target- and translation-language slot
-  *on desktop*, when I open a media file for the first time, and subtitles files in the same folder sharing the files name are present:
  - [x] the subtitles files are added, so as to be immediately available in the subtitles track selection dropdowns
- when I open a media file for the first time, and the immediately available subtitles tracks correspond neatly to both or either of the project's target or translation languages:
  - [x] the tracks are automatically opened as the target- and/or translation-language tracks
- when I open a media file for the first time, and the immediately available tracks do NOT correspond neatly to both or either of the project's target or translation languages:
  - [ ] I am prompted to select a track for each target- and translation-language slot, with the first lines of each track shown so I can tell them apart
- when a subtitles track is added:
  - [ ] its language is detected from any metadata, and on external files, tags in the filename such as `.ja.srt` or `.jpn.srt` 
- when subtitles tracks are present:
  - [x] I can choose among the embedded subtitle tracks and any external subtitles files, for the target language and for the translation
- when NO subtitles tracks are opened:
  - [x] I can skip forward or backward by a small amount via player controls or the Left/Right arrow keys
- when subtitles tracks are opened, and NO word in the subtitles has keyboard focus:
  - [x] I can skip forward or backward to the next or previous cue via player controls or the Left/Right arrow keys
- when subtitles tracks are opened:
  - [x] I can skip forward or backward to the next or previous cue via player controls, the Left/Right arrow keys, or the Up/Down arrow keys
  - [x] I can hide the video's subtitles from the Subtitle options menu in the player controls
- when multiple audio tracks are present:
  - [x] I can switch between different audio tracks
- when subtitles are present at the current time:
- when the video has been paused, or when I've just moved the pointer over the video area, NOT including the subtitles band:
  - [x] the player controls and the header appear over the video (to hide again after a few seconds of no pointer movement)
- when the video has been paused, or when I've just moved the pointer over the video area, including the subtitles band:
  - [ ] the lookup and new-flashcard buttons appear over the subtitles band (to hide again after a few seconds of no pointer movement)
- when the video is streaming:
  - [ ] I can see how much of the file the player loaded in the seek bar
- when I open a media file I have played before:
  - [x] playback resumes where I left off, unless I had stopped within a few seconds of the start or the end
- when I open a video or audio file my system cannot play directly, and I haven't turned off the conversion notice setting:
  - [x] a dialog appears informing me that the file will be converted as it plays, with a "Don't show this again" box that starts ticked
- when I open a video or audio file my system cannot play directly:
 - [x] playback starts within a few seconds, and I can jump to any point before the conversion has finished
  - [x] the converted file is kept on disk, so it plays at once the next time
- when a video or audio file has several video or audio tracks:
  - [x] I choose which tracks to play before the first play, and my choice is remembered for that file
  - [x] a "Tracks" button in the player lets me change the choice later, and the player continues from the same position
- when a video is playing:
  - [x] a "Screenshot" button captures the current frame
- when a file cannot be played:
  - [x] I see "The media could not be played." followed by one plain sentence saying why, for example "This video's picture is too tall to convert."
- when a subtitles track is opened and visible:
  - [ ] I see it in a band at the bottom or below the picture
  - [x] I see the subtitles in a band right under the picture, or across the picture's lower edge, above the player controls, when the window is too short and wide to fit the band and the controls underneath; the band keeps its height from cue to cue, sits on black under the picture, like the video, and on a translucent dark backdrop over it, and the text carries a shadow so it stays readable
  - [x] moving the mouse anywhere over the subtitle band, even its empty parts, does not bring the player controls back
- when I open the subtitles appearance dialog from the menu in the player controls:
  - [x] I can change the background's opacity and the text's shadow, size and colour
  - [ ] I can see a live preview
- when I submit the subtitles appearance dialog:
  - [ ] the choice is kept on the device for every file
  - [x] I see indications of the cue timings in the waveform visualization, and can click on them to seek the video to that cue
- when both a target-language subtitles track and a translation subtitles track are opened:
  - [x] I see the target-language subtitles above the translation subtitles
- when a media source plugin is active:
  - [x] I can see chip with the plugin title next to the media file's name, and click it to open the plugin's media interface for that file.


---

### Subtitles band

- when a flashcard with target-language sentence text has a clip at the current time:
  - [ ] that text is shown as the *active* target-language cue text
- when a flashcard with translation subtitles cue text has a clip at the current time:
  - [ ] that text is shown as the *active* translation cue text
- when both a flashcard's target-language sentence text and an open target-language subtitles track's cue text have clips at the current time:
  - [ ] the flashcard's text is shown as the *active* target-language cue text
- when both a flashcard's translation subtitles cue text and an open translation subtitles track's cue text have clips at the current time:
  - [ ] the flashcard's text is shown as the *active* translation cue text
- when only an open target-language subtitles track has a clip at the current time:
  - [ ] that text is shown as the *active* target-language cue text
- when only an open translation subtitles track has a clip at the current time:
  - [ ] that text is shown as the *active* translation cue text
- when a target-language cue text is active:
  - [ ] the cue text shows in large text in the middle of the band
- when a translation subtitles cue text is active:
  - [ ] the cue text shows in smaller text
- when both a target-language subtitles cue and a translation subtitles cue are active:
  - [ ] the target-language cue text shows above the translation cue text
- when a word in the active target-language cue text correspond to a flashcard's word field:
  - [ ] it is marked with an underline
  - [ ] it names the flashcard in its tooltip

---

### Audio player

As a user:
- when an audio file has been opened:
  - [x] I see an audio player
  - [ ] I see a visualization of the album art, if present in the audio file
  - [x] I can control the audio in the same ways as a video
- when I open an audio file for the first time:
  - [ ] given multiple audio tracks, a lone track in the language of the project is automatically selected, or else I am prompted to select a track
  - [ ] given embedded subtitles or automatically found subtitles/timing-enhanced transcript resources, a lone track in the language of the project is automatically selected as the target language subtitles/timing-enhanced transcript, or else I am prompted to select a track
  - [ ] given embedded subtitles or automatically found subtitles/timing-enhanced transcript resources, a lone track in my language is automatically selected as the translation subtitles/timing-enhanced transcript, or else I am prompted to select a track
  - [x] given an unsupported audio format, I am prompted to allow the file to be converted to a supported format

---

### Waveform visualization

- when a video or audio file is opened:
  - [x] I see a waveform visualization of the audio track around the current time; parts not yet loaded show a quiet line
- when a subtitles track/timing-enhanced transcript is opened:
  - [x] I see indications of the cue/segment timings in the waveform visualization, and can click on them to seek the audio to that cue/segment
  - [x] I can distinguish those segments corresponding to flashcards from those that do not
- when I click on a point in the waveform visualization:
  - [x] the audio seeks to that point
- when I click on a segment in the waveform visualization:
  - [x] the audio seeks to the start of that segment
- when I double-click/double-tap on a segment in the waveform visualization corresponding to a flashcard:
  - [x] the flashcard is opened for editing
- while a flashcard is open for editing:
  - [ ] the flashcard's segment is emphasized in the waveform visualization
  - [x] I can move the endpoints of the flashcard's segment in the waveform visualization, and the flashcard's audio timings are updated accordingly
  - [x] I can move the point in the waveform visualization corresponding to the flashcard's screenshot, and the flashcard's screenshot is updated accordingly
- when I turn the mouse wheel over the waveform visualization, pinch it, or use the zoom control in its corner:
  - [x] the view zooms between two seconds and five minutes, or the whole file when it is shorter
- when the waveform visualization has keyboard focus:
  - [x] the arrow keys move the view by a second (ten with Shift), and Home and End jump to the ends of the file
- when the waveform visualization is at its closest or widest zoom level:
  - [x] the corresponding zoom button is disabled
- *on desktop*, when I open the View menu:
  - [ ] I can show or hide the waveform visualization

---

### Subtitles panel

As a user:
- while the subtitles panel is open:
  - [x] I see the subtitles displayed in the panel, with one card per cue
  - [ ] in each subtitle cue card, I see the target language in large text and the translation a size smaller under it
  - [ ] I can see which cues correspond to flashcards, and which words inside those cues correspond to their word fields
  - [ ] it is docked to the side of the video player, or at the top of the audio player
- when cue text is active in the video/audio player:
  - [x] the card corresponding to the cue now is highlighted
- when the user scrolls to cues at a different time than the current media time:
  - [ ] the panel ceases to automatically scroll to match the current media time
  - [ ] a button appears to allow the user to return to the current media time
- while the user hasn't scrolled away from the current media time:
- [ ] the panel scrolls automatically to keep the highlighted cue card in view
  - [ ] I can click on a card to seek the media to the start of that cue
- when the open media file has no subtitles:
  - [x] I see a button to add a subtitles file from disk
  - [ ] I see a button to generate subtitles automatically
- when I click on the "Add subtitles" button:
  - [x] I can add a subtitles file from disk as the target-language or translation subtitles
- when I open the dropdowns for tracks:
  - [ ] I can select any available track for the target-language and translation subtitles tracks

---

### Ebook/text reader

As a user:
- when an ebook or text file is opened:
  - [x] I can read the text in the ebook/text reader, laid out in pages (two side by side on a wide screen) or as one scrolling column
  - [x] I can navigate through the pages and chapters of the ebook with the arrow keys (while no text field/lookup text has keyboard focus), a swipe, the scroll wheel, a tap at either side of the page, or the progress slider
  - [x] I can search for specific words or phrases in the text, ignoring capitals and accents, and jump to each result
  - [x] I can open the table of contents via a button
  - [x] I can change the font size and style of the text, the line spacing and length, the justification, and the theme (light, sepia, or dark)
  - [x] I can search with Ctrl+F or Cmd+F, which searches the whole book rather than only the page on screen
- while I am reading:
  - [x] the toolbar and progress bar get out of the way when I turn a page or scroll down
  - [x] the toolbar and progress bar come back when I move the mouse near the top or bottom edge, scroll up, or tap the middle of the page
  - [x] showing or hiding the toolbar and progress bar does not move the text
- when I close and reopen an ebook or text file:
  - [x] I am returned to my last reading position
  - [x] the text looks as I last set it: theme, font, size, spacing, and layout
- when the ebook or text file has been aligned with an audio file:
  - [x] I can Ctrl-click (Cmd-click on a Mac) on a sentence/segment to play the matching audio
  - [x] I can also play a sentence/segment from the play button in the dictionary pop-up's sentence row, or with R while the mouse pointer is on one of its words
  - [x] the sentence/segment currently being spoken is highlighted during playback
- when a translation is opened:
  - [x] I can switch between
      - target language text only
      - translation text only
- when the ebook or text file has been aligned with a translation, and the target-language text is open:
  - [x] I can click and hold, or tap and hold, on a sentence/segment to see the matching translation
  - [x] the translation is shown in the dictionary pop-up's sentence row, opened at the word I held, and the sentence/segment it covers is highlighted
  - [x] I can also show or hide the matching translation from the sentence row's translation button, or with T while the mouse pointer is on one of its words
- when the ebook or text file is shown in a bilingual view, so that the translation is already on screen:
  - [x] the sentence row offers no translation, and holding a sentence/segment looks the word up as a tap would
- when the ebook or text file has been aligned with a translation:
  - [x] I can switch between the single-language views and two bilingual views:
      - interlinear view
      - parallel view
- when I have opened an ebook, and I also have a translation of it as a separate ebook or text file:
  - [ ] I can choose to combine the two into a bilingual ebook
- when I choose to combine the two ebooks into a bilingual ebook:
  - [ ] I am prompted to choose an alignment provider: the easyImmerse cloud or an installed plugin
  - [ ] I see the progress of the alignment, and can keep using the app in the meantime
  - [ ] the alignment result is saved so I can reopen the bilingual ebook in future sessions
- when I choose to make a bilingual ebook but no alignment provider is available:
  - [ ] I am told how to set one up, by subscribing or installing a plugin

---

### Dictionary lookup and translation

As a user:
- when I mouse over text in the target-language subtitles or reader text, or give keyboard focus to target-language subtitles or reader text:
  - [x] text is highlighted, with the highlight limited to the word boundaries for that specific language, based on its spacing/punctuation rules, system tokenization rules, and/or the words present in active dictionaries
- when a word in the target-language subtitles has keyboard focus:
  - [x] the first word is highlighted
- when I click or tap on a word in the target-language subtitles or reader text, or press Enter/Space/L while a word is highlighted (and no text field has focus):
  - [x] the dictionary pop-up opens at the highlighted word, with the word's definitions, if available
  - [ ] any audio/video playback is either looped (if the word is in the subtitles/timing-enhanced text) or paused (if no timing is available)
- when the highlight moves while the dictionary pop-up is open:
  - [x] the pop-up moves to the new word and shows its definitions, if available
- when the dictionary popup is open, and I click or tap on the highlighted word in the target-language subtitles or reader text or press Enter/Space/L (while no text field has focus):
  - [x] the pop-up closes
- when I hold a tap/a click on a word in the target-language subtitles or text, and the word's sentence/segment or cue has a translation available but not already on screen:
  - [x] the dictionary pop-up opens at the word with its sentence/segment translation shown
- when I press the lookup button, or L while no word is under the mouse pointer or has keyboard focus (and no text field has focus):
  - [x] the dictionary pop-up opens, with focus on its search field, where I can type a word to look up

---

### Highlighting words via keyboard

- when I press the Right and Left arrow keys:
  - [x] the highlight moves forward and backward through words
- when I hold down Shift and press the Right and Left arrow keys in a language written without spaces (such as Japanese or Chinese):
  - [x] the start of the highlight moves one character at a time
- when I press Escape:
  - [x] the highlight is removed
- when I press the Up and Down arrow keys:
  - [x] any playback skips to the previous or next cue, and the highlight and keyboard focus move to that cue's first word
  - [ ] the highlight moves to the last word of the previous/first of the next subtitles cue or reader text segment
- when focus is on the cue text in the video/audio player, and the cue text changes
  - [x] the highlight moves to the first word of the new cue
- when I press an arrow key so as to navigate past the first/last word of the subtitles or reader text page:
  - [x] the highlight moves to the first/last word of the next/previous subtitles cue or page, and the media skips to that cue/page
- when the target-language subtitles or text are written from right to left:
  - [ ] the arrow keys move the highlight in the script's own reading direction, so that Left moves it forward and Right backward

---

### Dictionary pop-up

As a user:
- when I double-click or double-tap a word in the pop-up's definitions, or follow an in-dictionary definition link:
  - [x] a lookup is performed for that word
- when I edit the word in the pop-up's search field and press Enter or the maginifier button:
  - [x] a lookup is performed for the new word
- when the pop-up is showing entries for the word that triggered its opening, and I click/tap the magnifier button:
  - [x] the pop-up's search field is selected for editing, and field's text is selected so I can replace it with a new lookup query
- when I click the thin bar at the bottom of the pop-up:
  - [x] I can expand/shrink the pop-up
- when the pop-up opens or moves between words:
  - [ ] it is at its default compact size
- when there are no results for the word in the pop-up:
  - [x] I can see a link to the dictionary settings
- when I click the flashard button in the pop-up's header, or on one of its entries:
  - [x] I can create a flashcard from that word or entry
- when the word shown in the pop-up belongs to a sentence/segment or cue with audio:
  - [x] I can see the sentence above the entries
  - [x] I can play the the sentence/segment/cue via a play button next to the sentence
- when the word shown in the pop-up belongs to a sentence/segment or cue with a translation that is not already on screen:
  - [x] I can see a translation button by the sentence
- when I click the sentence's translation button:
  - [x] the translation is shown/hidden
- when I have shown or hidden the translation, and the pop-up later moves to another word or reopens on the same screen:
  - [x] the translation is still shown or hidden as I left it
- when I press R while no text field has focus:
  - [x] the current subtitles cue or text audio segment is replayed
- when I press T while no text field has focus:
  - [x] the translation of the current subtitles cue or text audio segment is shown/hidden
- when I press T while no text field has focus, and no word is under the mouse pointer or has keyboard focus:
  - [x] the pop-up opens on its search field, with the translation of the sentence/segment being spoken or of the current cue
- when I press Escape while the dictionary pop-up is expanded:
  - [x] it returns to its compact size
- when I press Escape while the dictionary pop-up is compact:
  - [x] the pop-up closes
  - [x] keyboard focus returns to where it was before the pop-up opened
- when I click the pop-up's close button, click or tap the word it shows, or click or tap outside the pop-up and not on a word in the target-language subtitles or text:
  - [x] the dictionary pop-up is closed
- when I close the dictionary pop-up:
  - [x] any audio/video playback paused or looped due to the pop-up's opening is resumed/played as normal

---

### Flashcard creation

As a user:
- when a flashcard for a word is created:
  - [x] the word, its pronunciation, and the L1 and L2 definitions are filled from the word's definitions (unless I have already typed in the field before the definitions had a chance to load)
  - [x] the fields are shown according to my flashcard settings
- when I try to create a flashcard from where I am in the media/text is created, with the C or E key:
  - [x] on the media screen, it is a flashcard for the word under the mouse pointer or with keyboard focus, or, when there is none, a flashcard with no word from the cue shown now
  - [x] in an ebook or text, it is a flashcard for the word under the mouse pointer, with that word's sentence/segment
  - [x] when there is no such word or cue to make it from, nothing happens
- when a new flashcard is created and saved at once (rather than opened in the flashcard-editing form):
  - [x] it is saved with definitions (if they are available within a few second)
  - [x] a brief notice names the new flashcard and offers Undo
  - [x] a flashcard already open in the flashcard-editing form stays open
- when I double-click or double-tap on a word in the target-language subtitles or text:
  - [x] a flashcard for the word is created and saved at once
- when I press Shift+Enter or Shift+Space while a word in the target-language subtitles has keyboard focus:
  - [x] a flashcard for the word is created and saved at once
- when I press the flashcard button in the dictionary pop-up's header:
  - [x] a flashcard for the word is created from every entry and saved at once
- when I press the flashcard button on one of the dictionary pop-up's entries:
  - [x] a flashcard for the word is created from that entry alone and saved at once
- when I hold a tap on a word in the dictionary pop-up:
  - [x] a flashcard for the word is created and saved at once
- when I press the new-flashcard button over the subtitles:
  - [x] a flashcard with no word is created from the cue shown now and saved at once; the button's tooltip names the C key
- when I press C while no text field has focus:
  - [x] a flashcard from where I am in the media/text is created and saved at once
  - [x] in an ebook or text, nothing happens while a panel or the flashcard-editing form is open
- when I press E while no text field has focus, and no flashcard is open in the flashcard-editing form:
  - [x] a flashcard from where I am in the media/text is created and opened in the flashcard-editing form, where it is saved only when I save it or leave it
- when I press E while a flashcard is open in the flashcard-editing form:
  - [x] nothing happens, and the open flashcard is left as it is


---

### Flashcard form

- when the flashcard-editing form is open:
  - [ ] the corresponding segment of audio/video is looped
  - [x] I can edit the text fields of the flashcard
  - [x] I can see the a segment of the audio track's waveform visualization corresponding to that card's audio clip, if present
  - [ ] I can move the clip's edges to change the clip's start and end times
  - [ ] I can move the point in the waveform visualization corresponding to the flashcard's screenshot
  - [x] I can toggle whether to include the screenshot by clicking it or its checkbox; an excluded screenshot is shown faded
  - [x] I enter tags as chips, separated by commas or Enter
  - [x] fields excluded in my flashcard settings are hidden
  - [x] I can add a field excluded in my flashcard settings back to the flashcard, from the list behind the "Add a field" button
  - [x] I can save the flashcard and close the form
  - [x] I can delete the flashcard and close the form
  - [x] I can close the form without saving; changes I discard this way can be brought back with Undo for a short while
- when an unfocused text field has many lines of text:
  - [x] it shows only a few lines, with a faded edge
- when a focused text field has many lines of text:
  - [x] it shows all its text
- when I delete the contents of a field of the flashcard-editing form that can be filled from the dictionary:
  - [ ] I am offered an option to fill it again from the lookup
- when a flashcard is created from a word:
  - [ ] the fields are filled according to my flashcard settings, translation settings, and TTS settings
    - word (taken from the dictionary lemma)
    - L1 definition (taken from the dictionary entries, if available)
    - L2 definition (taken from the dictionary entries, if available)
    - word pronunciation
    - text context (taken from the subtitle cue or ebook/text segment containing the word)
    - text context translation (taken from the translation subtitles or machine translation of the ebook/text segment containing the word)
    - text context pronunciation
    - audio context (taken from the audio clip of the subtitle cue or ebook/text segment containing the word)
    - screenshot (taken from a video frame within the timing of the subtitle cue containing the word)
    - tags
- when I create a flashcard from a word, but not from a specific dictionary entry:
  - [x] the L1 and/or L2 fields are filled with the definitions from all matching dictionary entries
- when I create a flashcard from a specific dictionary entry:
  - [x] the L1 or L2 field is filled with the definition from that entry, rather than all matching entries
- while the dictionary pop-up is open but no dictionary is enabled for the project's language:
  - [x] the dictionary pop-up prompts me to set up a dictionary
- when I have made flashcards without having saved my work:
  - [ ] I see an indication that my work is unsaved, and a button to save it
- when I have made flashcards without having logged in:
  - [ ] I see an indication that my work is not backed up, and a button to log in or sign up

---

### Dictionaries

As a user:
- when I open the dictionaries settings:
  - [x] I see a list of my dictionaries, with each one's language(s) and format
  - [ ] I can add a dictionary from the easyImmerse registry
  - [x] I can remove a dictionary
- when I add a dictionary that is to be stored locally:
  - [ ] I can see the import progress visualized in the progress bar and as a number of entries out of the total which have been processed so far
    - The bar fills to the share of the dictionary's files read, for Yomitan dictionaries so far, and the entries stored so far are counted; the total number of entries is not known before the import ends.
  - [x] when I leave the dictionaries settings, the import goes on, and the footer shows the file being added and how far it is; clicking it brings me back to the dictionaries settings
  - [x] if the import fails while I am elsewhere, the footer says so until I have seen the failure in the dictionaries settings
- when a dictionary fails to be added:
  - [ ] a notice informing me of the failure stays on the screen until dismissed
- when I attempt to add a dictionary that is already in my list:
  - [x] I am told that it is already present, and the addition is not repeated
- when I have more than one dictionary enabled for a language:
  - [ ] I can set the order in which their entries appear in the dictionary pop-up
- when I add a dictionary from a table file (CSV, TSV or Tabfile):
  - [x] I see a preview of its first rows, with what each column holds
  - [x] I can change what a column holds, and whether the first row is a header, before importing
- when I add a dictionary in a format the app does not support:
  - [x] I am told which formats are supported, and that a plugin may add support for others
- when I remove a dictionary:
  - [x] I am asked to confirm first, and told that the removal cannot be undone
  - [ ] I can see the progress of the removal.


As a web app user:
- when I add a dictionary from a file:
  - [ ] it is saved in my browser's storage, together with its images, sounds and stylesheet
  - [ ] it is still in my list of dictionaries after I reload or reopen the app, including while offline
  - [ ] I can look words up in it without any connection to a server
- when I add a dictionary that is too large for the storage my browser allows:
  - [ ] I am told that it could not be saved and how much space it needs, and that the desktop app has no such limit
- when I remove a dictionary:
  - [ ] its storage space on my device is freed

---

### Sending cards to Anki

As a user:
- when updates are waiting in the Anki updates queue:
  - [x] they are sent as soon as easyImmerse connects to Anki, and I see whether it succeeded
  - [x] if a send failed while Anki stayed connected, I see that the sync failed and can try again
- when an earlier export has removed cards from the Anki updates queue:
  - [x] I see how many cards are new and how many have changed since that export, or since the queue was last emptied
- when I save a flashcard while AnkiConnect is on, but Anki is not connected:
  - [x] I see that Anki could not be reached
  - [x] the change is added to the project's Anki updates queue
- when AnkiConnect is on, and easyImmerse connects to Anki:
  - [x] the updates in the queue are sent to Anki, and I see whether they succeeded

---

### Project flashcards panel

As a user:
- when no flashcard of this project has reached Anki, and I have not reviewed any in the easyImmerse SRS:
  - [x] I can see three buttons in this order:
    - a button to start reviewing flashcards in the easyImmerse SRS
    - a button to set up AnkiConnect for direct export to Anki
    - a button to export an Anki deck package
- when AnkiConnect is on for the project, OR when AnkiConnect is off though flashcards of this project have reached Anki through AnkiConnect before:
  - [x] I can see whether Anki is connected
  - [x] I can see any updates waiting in the Anki updates queue
  - [x] I can open a "More options" menu with buttons to export an Anki deck package and to start reviewing flashcards in the easyImmerse SRS
- when AnkiConnect is off, and flashcards of this project have reached Anki through a deck package:
  - [x] I can see what waits in the Anki updates queue and the button to export an Anki deck package
  - [x] I can open a "More options" menu with buttons to set up AnkiConnect and to start reviewing flashcards in the easyImmerse SRS
- when flashcards are waiting in the Anki updates queue, and I have no reviews in the easyImmerse SRS due in the future for flashcards of this project:
  - [x] I see a preview of the first-created flashcard in the Anki updates queue
- when AnkiConnect is off, and I have reviews in the easyImmerse SRS due in the future for flashcards of this project:
  - [ ] I can see the front of the next flashcard due for review, and a button to continue reviewing
  - [ ] I can open a "More options" menu with buttons to export an Anki deck package and to set up AnkiConnect
- when I click the button to set up AnkiConnect for direct export to Anki:
  - [x] I see what to install, and that Anki must be running
- when I switch on AnkiConnect for the project:
  - [x] it stays on for the project until I turn it off
  - [x] the flashcards in the Anki updates queue are sent to Anki at once, as long as Anki is running and connected
- when AnkiConnect is on, and Anki gets connected:
  - [x] any updates waiting in the Anki updates queue are sent to Anki at once, and I see whether it succeeded
- when I save a flashcard while AnkiConnect is on, and Anki is connected:
  - [x] the flashcard is sent directly to Anki
  - [x] any updates waiting in the Anki updates queue are sent along with it
  - [x] if the flashcard already has a note in Anki, that note is updated in place
  - [x] I see whether the save to Anki succeeded
- when I delete a flashcard, or undo the creation of a new one, while AnkiConnect is on:
  - [x] the flashcard's note in Anki, if it has one, is deleted at once
  - [x] I see whether the note's deletion from Anki succeeded
- when I delete a flashcard, or undo the creation of a new one, while AnkiConnect is on BUT Anki cannot be reached:
  - [x] I am told that the note will be deleted from Anki the next time Anki is connected
  - [x] the deletion is added to the Anki updates queue
- when I am asked to confirm the deletion of a flashcard, and AnkiConnect is on:
  - [x] if the flashcard has a note in Anki (or may have one from a package I imported) I am told that the note will be deleted from Anki too
- when I am asked to confirm the deletion of a flashcard that reached Anki, and AnkiConnect is off:
  - [x] I am told that its note stays in Anki until I delete it there, since a package cannot delete notes
  - [x] when the project settings allow it, I am told that the deletion will wait in the Anki updates queue on the project screen, with a copiable search query to help me find the note via Anki's search functionality, until I delete the note or turn AnkiConnect on
- when I am asked to confirm the deletion of a flashcard that was included in an earlier Anki package export:
  - [x] I am told that importing one of those old packages into Anki would bring the card back
- when deletions are waiting in the Anki updates queue, and AnkiConnect is off:
  - [x] I see them listed by word
  - [x] I can copy a search that finds their notes in Anki's browser
  - [x] I can mark them as done, which clears the list
  - [x] I am told that a package cannot delete notes from Anki, so I must delete them there myself, or turn on AnkiConnect to have them deleted for me
- when AnkiConnect is on for the project:
  - [x] I see the status of the AnkiConnect connection, checked when I open the project
  - [x] I see how many cards in the Anki updates queue are new and how many have changed, the same counts shown when exporting an Anki package
  - [x] I see how many deleted flashcards still have notes in Anki
  - [x] I see a preview of the earliest-created flashcard in the Anki updates queue
  - [x] I do not need to press a button to send flashcards to Anki
  - [x] I can turn AnkiConnect off with a switch
- when sending flashcards to Anki through AnkiConnect fails:
  - [x] I can try again with a button
- when I see a preview of a flashcard in the Anki updates queue:
  - [ ] I see its screenshot, as the card in Anki would show it
  - [ ] I can play its audio clip
- when a flashcard reached Anki without its audio clip or screenshot, because easyImmerse could not read the media file at the time:
  - [ ] I see it listed among the flashcards whose media is missing in Anki
  - [ ] once easyImmerse can read the media file again, I can bring the missing audio clip or screenshot into Anki
- when AnkiConnect is on for the project, but Anki is not connected:
  - [x] I see helpful suggestions for getting AnkiConnect working, and a button to check again
- when AnkiConnect is on for the project, but Anki refuses the connection from easyImmerse:
  - [x] I am told how to allow easyImmerse to connect, including the address AnkiConnect must allow

---

### Exporting flashcard decks

As a user:
- when I choose to export my flashcards to Anki:
  - [x] I can choose to export all cards
  - [x] I can choose to export only the cards in the Anki updates queue (this being the default option; this queue contains the cards added, or changed since they last reached Anki through AnkiConnect or through an export that removed them from the queue)
  - [x] I see how many cards each of these choices would include
  - [x] I can choose to export only cards from specific media files, each listed with its number of cards
  - [ ] I can choose to export all cards from a selected media file, or only specific cards from that media file
  - [x] I can choose to keep the cards in the Anki updates queue after the export (this being the default option *only when AnkiConnect is on*; the point is to let me back up my deck or share it with someone, and still make a targeted update to my own Anki deck later)
  - [x] I am told that importing a package again adds the new cards and refreshes the others, keeping their review progress
  - [x] I am told that a package cannot delete notes from Anki, so when I delete a flashcard that was exported as part of a package, I must delete its note in Anki myself, and that AnkiConnect keeps my collection in sync instead
- when I choose to export my flashcards to Anki, and some of the cards were first added to Anki through AnkiConnect, rather than from a package:
  - [x] I am warned that importing the package into the same Anki collection would add a second copy of each of those cards, because Anki does not recognize them as the notes AnkiConnect created
  - [x] I am told that I can find the doubled notes with Notes > Find Duplicates in Anki's browser, searching the "easyImmerse id" field
- when I export my flashcards as an Anki deck package:
  - [x] on desktop, I am prompted to choose where to save the package, including its media
  - [x] on mobile, I am prompted to choose where to save the package, including its media
  - [x] in a browser, the package, including its media, is downloaded
  - [x] I see how many flashcards were exported, and how many audio clips or screenshots could not be included
  - [x] only once the package has been saved or downloaded in full, the cards are removed from the Anki updates queue unless I chose to keep them there
- when I send my flashcards to Anki through AnkiConnect:
  - [x] I see how many flashcards were sent successfully, and how many Anki refused
  - [x] I see how many audio clips or screenshots could not be included

---

### Importing and exporting projects

As a user:
- when I choose to export a project:
  - [ ] I am prompted to choose where to save a project file containing the project's settings, flashcards, and media files registry
  - [ ] I can choose whether to include the media files and dictionaries in the project file
- when I choose to import a project:
  - [ ] I am prompted to select a project file
  - [ ] the imported project appears in my list of projects
- when an imported project references media files not included in the project file:
  - [ ] I am prompted to locate missing media files

---

### Reviewing flashcards

To be implemented after MVP.

As a user:
- when I export flashcards that I have reviewed in easyImmerse to Anki:
  - [ ] each card keeps its review progress, and is due in Anki on the same day it would be due in easyImmerse, in my own time zone

---

### easyImmerse library

As a user:
- when I open the easyImmerse library:
  - [ ] I see videos, audiobooks, and ebooks, which I can filter by language
  - [ ] I can see an item's description, length, and difficulty before opening it
- when I choose a library item:
  - [ ] the item is added to the current project, or a new project is created for the item's language + difficulty
  - [ ] the item opens with its subtitles already set up
- when I am offline:
  - [ ] library items I have opened before are still available
- when I create flashcards from a library item:
  - [ ] the flashcards are saved in my project, and I can export them to Anki or review them in the easyImmerse SRS
  - [ ] I cannot edit the flashcard
  - [ ] the audio is not included in the flashcard

---

### Dragging and dropping files

- when I drag and drop a media file or subtitles file into the app while a project is open:
  - [ ] the file is added to the current project
- when I drag and drop a media file or subtitles file into the app while NO project is open, but there are existing projects:
  - [ ] I am prompted to choose whether to add the file to an existing project or create a new project for it
- when I drag and drop a dictionary file into the app:
  - [ ] the dictionary is added to the app
  - [ ] I am prompted to choose to use this dictionary for either the target language or the translation language of the open project, if one is open

---

### Web/mobile app and local files

As a web/mobile app user:
- when I open the web/mobile app for the first time:
  - [ ] I am informed that I can use local files and the easyImmerse library without logging in
- when I open the web app while offline:
  - [ ] the app loads, and I can use my previously added local files and dictionaries
- when I open a media file the browser cannot play:
  - [ ] I am told the format is not supported in the browser, and that the desktop app can play it
- when I open a media file from my computer in the web app:
  - [x] it plays from the browser's memory; it is never converted and has no waveform visualization

As a web app user:
  - [ ] I can install the app as a Progressive Web App

As a web/mobile app user connected to my own server (self-hosted or on the local network):
- when I add a media file from the browser:
  - [ ] I can upload it to the server to make it available on other devices
  - [ ] I can choose to delete the local copy of the file after it is uploaded, to save space on my device
- when I add a media file from the browser, but it is in a format not widely supported:
  - [ ] I am notified that the server will convert it to a widely supported format, and that the original file will not be kept if I choose to delete it after upload

As a web/mobile app user who is not logged in:
- when I add a resource (media file, subtitles file, dictionary file, etc.) to the app:
  - [ ] the file stays on my device and is not uploaded anywhere
  - [ ] I see a warning that the resources are only available on this device, will be cleared if my browser data is cleared (either by me or by an automatic cleanup), and that I should back them up if I want to keep them or use them on other devices
- while I have locally stored resources:
  - [ ] I see an indication of how much storage space they are using, and can delete them to free up space
- when I open the app with locally stored resources:
  - [ ] I am warned that the resources are only available on this device, will be cleared if my browser data is cleared (either by me or by an automatic cleanup), and that I should back them up if I want to keep them or use them on other devices

---

### Account and cloud sync

As a user:
- when I choose to sign up or log in:
  - [ ] I can create an account with my email address
  - [ ] I can log in to a self-hosted easyImmerse server by entering its address, instead of using the easyImmerse cloud
  - [ ] I can keep using all offline features of the app without an account
- when I subscribe:
  - [ ] I can choose the amount I pay on a sliding scale
  - [ ] I can manage or cancel my subscription from the account settings

As a privileged user (a subscriber or a self-hosted server account holder):
- when I am logged in on a device:
  - [ ] my projects, flashcards, review history, and dictionaries are synchronized with the cloud
  - [ ] changes I make on one device appear on my other devices
  - [ ] my preferences follow me to my other devices (except those that belong to one device, such as the theme)
  - [ ] I can choose which media files are uploaded to the cloud
- when I open the cloud storage settings:
  - [ ] I see how much of my storage quota is used, and can delete files from the cloud
- when a change conflicts with one made on another device:
  - [ ] the more recent change is kept, and I am notified

---

### LAN sync

As a desktop app user:
- when I click the button for local network sync:
  - [ ] I see a QR code and an address for pairing with another easyImmerse app on the same local network

As a web/mobile app user:
- when I click the button for local network sync:
  - [ ] I see a QR code scanner and an input field for entering an address to pair with another easyImmerse app on the same local network
- when I scan the QR code or enter the address of another easyImmerse app on the same local network:
  - [ ] the two devices are paired, and my projects, flashcards, and dictionaries are synchronized between them
  - [ ] media files on the desktop can be played on the paired device without copying them

---

### Desktop app, local server, and self-hosting

As a desktop app user:
- when I open the server settings:
  - [ ] I can configure the server's address and port
  - [ ] I can set up authentication for the server
  - [ ] I can start and stop the server
  - [ ] I can see the server's status, including whether it is running and whether it is reachable from other devices on the local network
  - [ ] I can see the server's logs, including any errors or warnings
  - [ ] I can configure whether to start the server automatically when the app starts
- when I close the app with the server running:
  - [ ] the server continues to run in the background, and I can see its status in the system tray or menu bar
- when I use the CLI:
  - [ ] I can manage the server
  - [ ] I can configure my settings
- when I visit the download page, install, or first open the desktop app on a computer without a hardware video encoder:
  - [ ] I am told that converting unsupported video needs an ffmpeg build with a software H.264 encoder, and I am guided through installing one and choosing it in the settings
- when a video cannot be converted because my computer has no usable video encoder:
  - [ ] I am told how to install a suitable ffmpeg build and choose it in the settings
- when I open the media conversion settings:
  - [ ] I can choose my own ffmpeg build for media conversion
  - [ ] I can choose the quality of converted video, trading picture quality against the disk space used by the conversion cache
- when I am running an unauthenticated local server:
  - [ ] I am warned that anyone on the local network can access my projects, flashcards, and dictionaries, and that I should set up authentication if I want to keep them private
- when I am running an authenticated local server:
  - [ ] I can create and manage user accounts, and assign them different roles:
    - library user: can access my library, sync projects, and sync their flashcards
    - privileged user: can also sync projects, flashcards, and dictionaries, and access services like translation
    - administrator: can also manage the server, user accounts, my library, dictionaries available to users, and services like translation available to users

As a standalone server user:
- when I install the server without the desktop app:
  - [ ] I can start and stop it from the command line, and configure it through a config file or command-line options
  - [ ] the server offers the same user account management as the desktop app's server

---

### Machine translation

As a user:
- when I ask for the translation of a subtitle cue or a sentence/segment that has none, from the dictionary pop-up's sentence row (with T, or by holding a tap or the mouse button on a word of it):
  - [ ] the text is translated into my language
- when a subtitle cue has been translated:
  - [ ] the translation appears below the target-language cue, as with dual subtitles
- when a passage of ebook/text has been translated:
  - [ ] the translation appears in the dictionary pop-up's sentence row, as an aligned translation would
- when I have not subscribed, and have not set up a translation plugin:
  - [ ] translations use a free online service with a limited number of translations
  - [ ] when the limit is reached, I am told how to get more translations: subscribing, adding my own API key for a paid translation service, or adding a plugin
- when I use a translation plugin:
  - [ ] translations use that service, and easyImmerse imposes no limit on them
- when I enable automatic translation in the settings:
  - [ ] all text currently in view is translated without my having to select it

As a subscriber:
- when I translate text:
  - [ ] translations count against a monthly? quota, whose remaining balance I can see in my account settings

---

### Plugins

As a desktop app user:
- when I open the plugins settings:
  - [ ] I see a list of installed plugins, and can enable, disable, or remove each one
  - [ ] I can install a plugin from a file or from the plugin directory
  - [ ] I can install a plugin from a URL or from disk, with security warnings
- when a plugin is installed:
  - [ ] the plugin can add dictionary formats
  - [ ] the plugin can add media processing steps
  - [ ] the plugin can add text-to-speech providers
  - [ ] the plugin can add speech-to-text providers
  - [ ] the plugin can add translation providers
  - [ ] the plugin can add flashcard export formats
- when an installed plugin requires configuration, e.g. an API key for a cloud service or the path to a local tool like Whisper:
  - [ ] I can enter the configuration in the plugin's settings
  - [ ] I am told when the configuration is missing or invalid


#### Speech-to-text

As a user:
- when I choose to generate subtitles/a transcript for a video/audio file:
  - [ ] I am prompted to choose a speech recognition provider: the easyImmerse cloud or an installed plugin
  - [ ] I see the progress of the generation, and can keep using the app in the meantime
- when I choose to generate subtitles for a video file:
  - [ ] the generated subtitles are opened as the target-language subtitles when complete
  - [ ] the generated subtitles are saved alongside the media file for future use
- when I choose to generate a transcript for an audio file:
  - [ ] the generated transcript is opened as the target-language timed text when complete
  - [ ] the generated transcript is saved alongside the audio file for future use
- when no speech recognition provider is available:
  - [ ] I am told how to set one up: subscribing  or installing a plugin


#### Text-to-speech

As a user:
- when I open the text-to-speech settings:
  - [ ] I can choose a text-to-speech provider for the project's target language: the device's built-in voices, the easyImmerse cloud, or an installed plugin
  - [ ] I can preview the selected voice


#### Audio and transcript alignment

As a user:
- when I have opened an audio file without timed text, and I have a transcript or ebook of it:
  - [ ] I can choose to align the transcript/ebook with the audio
  - [ ] I am prompted to choose an alignment provider: the easyImmerse cloud or an installed plugin
  - [ ] I see the progress of the alignment, and can keep using the app in the meantime
  - [ ] the timing-enhanced transcript is opened as the target-language timed text when complete
  - [ ] the timing-enhanced transcript is saved alongside the audio file for future use
- when I have opened an audio file without timed text, and I have no transcript of it:
  - [ ] I am offered to generate a transcript with speech recognition
- when I choose to align a transcript but no alignment provider is available:
  - [ ] I am told how to set one up: subscribing or installing a plugin

### App settings

As a user:
- when I am on the settings screen:
  - [x] I can turn on "Keep audio lossless when converting", so later conversions keep the audio at full quality at the cost of more disk space
  - [x] I can open the subtitles appearance dialog
  - [x] I can read the open-source licenses of the bundled components, including the bundled ffmpeg's notices and those of every Rust crate and JavaScript package that ships
  - [ ] I can change the app's theme between light and dark
  - [ ] I can set whether to honor the system's light/dark theme preference
  - [ ] I can change the language of the app's interface
  - [ ] I can view and change keyboard shortcuts
  - [ ] I can enable AnkiConnect
  - [ ] I can configure the storage location for app data
- *on desktop*, when I select Preferences from the app menu:
  - [ ] the settings screen opens
- when a media conversion server is set:
  - [x] I see how much disk the media cache uses of what it may use, with a line explaining about the cache
  - [x] I can clear the media cache via the "Clear media cache" button
  - [x] I can set the cache's maximum size, from automatic (five percent of the disk) to a fixed number of gigabytes, and the choice is kept on the server
- when NO media conversion server is set:
  - [ ] the "Clear media cache" button is absent
- when I use the keyboard shortcut (e.g. Cmd + ,):
  - [ ] the settings screen opens

---

### Browser extension

As a browser extension user:
- when I am on a web page
  - [ ] I can mouse over or tap on a word to see its definition in the dictionary pop-up
  - [ ] I can click a button to create a flashcard for it, with the surrounding sentence as context
- when I am watching a YouTube video with captions in the target language (to be implemented after MVP):
  - [ ] I can mouse over or tap on a word in the captions to see its definition, and the video pauses until I close the pop-up
  - [ ] I can click or double-tap on a word in the captions to create a flashcard, with the caption as text context and the matching audio and screenshot clipped from the video
- when I open the extension's settings:
  - [ ] I can choose which project new flashcards are added to
  - [ ] I can use dictionaries stored in the extension without connecting to a server
  - [ ] I can connect the extension to the easyImmerse cloud or my own server to sync flashcards and dictionaries
- when I install a dictionary in the extension without having set up sync:
  - [ ] the dictionary is stored in the browser
- when I set up sync with a local server while dictionaries are stored in the extension:
  - [ ] I am offered to switch to the same dictionary on the server, to save space and speed up imports
- when I accept switching a dictionary to the local server:
  - [ ] the server gets the dictionary from its original source, or exported from the extension when the source is unavailable
  - [ ] the extension's own copy is deleted once the server has the dictionary
