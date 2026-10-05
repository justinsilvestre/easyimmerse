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
  - [ ] the app follows my system's light or dark theme
  - [ ] I can switch between a light and dark theme with the toggle at the bottom of the screen, and the app follows my system again the next time the system theme changes
  - [ ] I can choose in the settings to always use the light or the dark theme
  - [ ] I can change the size of the app's text from the "Text size" menu at the bottom of the screen, in steps from 75% to 175%, and return to 100% (not in the browser, where the browser's own zoom applies)
  - [ ] *on desktop*, I can see a menu bar with options:
    - easyImmerse menu: About, Preferences, Quit
    - File menu: New project, Open project, Save project, Export flashcards, Import/export project, Exit
    - Edit menu: Undo, Redo, Cut, Copy, Paste
    - View menu: Toggle fullscreen, Toggle distraction-free mode, Toggle subtitles panel, Toggle waveform visualization
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
  - [x] I can enter the project settings:
    - project name
    - target language
    - translation language (defaulting to my interface language)
    - flashcard settings:
      - which fields to include by default in new flashcards (with presets for beginner, intermediate, and advanced learners)
      - default tags for new flashcards, and whether each flashcard is also tagged with its media file's name (on by default)
      - whether to try filling in the audio fields with TTS in the absence of an audio track
  - [x] I see a preview of an example flashcard with the current settings, which updates as I change the settings
  - [x] on a narrow screen, the example flashcard stays in view under the preset as a small card that I can expand
- when I select the *beginner* flashcard preset in the new project form:
  - [x] the pronunciation fields are included by default
- when I select the *intermediate* flashcard preset in the new project form:
  - [x] the pronunciation fields are excluded by default
- when I select the *advanced* flashcard preset in the new project form:
  - [x] the L1 translation field is excluded by default
  - [x] the L2 definition field is included by default
- when I submit the new project form:
  - [x] I am taken to the new project's screen

---

### Project screen and saving projects

As a user:
- when I am on the project screen:
  - [x] I see the open project's name
  - [x] I see a list of the project's media files
  - [x] I can click on a media file to open it
  - [x] I can remove a media file from the project through the menu on its row
  - [ ] the menu bar has an option to save the project
  - [x] I see a button to edit the project's settings
  - [ ] the status of dictionaries is indicated, according to the languages of my project flashcard settings
- when I have not yet exported flashcards from this project or used the easyImmerse SRS for this project:
  - [ ] I see a button to export an Anki deck package for the project
  - [ ] I see a button to set up AnkiConnect for direct export to Anki
  - [ ] I see a button to start reviewing flashcards in the easyImmerse SRS
- when the last export/review action was to use the easyImmerse SRS:
  - [ ] I see a preview of the next flashcard to review, and a button to continue reviewing in the easyImmerse SRS
- when the last export/review action was to export an Anki deck package for the project:
  - [ ] I see an indication of whether/how many cards have yet to be exported to Anki, and a preview of the first-created unexported flashcard
  - [ ] I see a button to export new an Anki deck package for the project
- when the last export/review action was to use AnkiConnect:
  - [ ] I see an indication of the status of the AnkiConnect connection, and helpful suggestions if it is not working
  - [ ] I see an indication of whether/how many cards have yet to be sent to Anki, and a preview of the first-created unsent flashcard
  - [ ] I see a button to send new flashcards to Anki via AnkiConnect
- when I click on the "Add media" button:
  - [x] I am prompted to select a media file to add to the project
- when I add a media file to the project:
  - [x] I see the new media file in the list of media files
  - [x] the new media file is opened
- when I click "Remove" next to a media file:
  - [x] the media file is removed from the project's list; the file itself is left alone
- when I save the project via the menu bar or keyboard shortcut:
  - [ ] the project's name, language, media files registry, etc. are saved to disk or online, according to the environment and settings
- while I am working in a project:
  - [ ] my work is saved automatically at regular intervals, so an unexpected crash does not lose it
- when I open the app after it closed unexpectedly:
  - [ ] the last automatically saved state of my project is reloaded
- when the last automatically saved state cannot be loaded:
  - [ ] I am told about the problem, and the app falls back to the most recent earlier autosave that loads

---

### Video player

As a user:
- when a video has been opened:
  - [x] I see a video player
  - [x] I can pause and resume playback through player controls or keyboard shortcuts
  - [x] I can seek to a different time in the video via the playback bar
  - [ ] I can skip forward or backward by a small amount (or to the next/previous cue, if any subtitles tracks are open) via player controls or keyboard shortcuts
  - [x] I can adjust the volume of the audio track
  - [x] I can adjust the playback speed of the video
  - [x] I can switch between different audio tracks, when multiple are present
  - [ ] I can choose among the embedded subtitle tracks and any external subtitles files, for the target language and for the translation
  - [x] I can add a subtitles file from disk as the target-language or translation subtitles
  - [x] the player controls lie over the bottom of the video and hide while it plays and the pointer rests; they reappear when the pointer moves or playback pauses
  - [ ] the lookup and new-flashcard buttons stay available over the video, also in distraction-free mode
  - [ ] I can enter a distraction-free fullscreen mode, in which only the video and subtitles are shown
- when I open a video for the first time:
  - [ ] given multiple audio tracks, a lone track in the language of the project is automatically selected, or else I am prompted to select a track
  - [ ] given embedded subtitles or automatically found subtitles resources, a lone track in the language of the project is automatically selected as the target language subtitles, or else I am prompted to select a track, with the first lines of each track shown so I can tell them apart
  - [ ] given embedded subtitles or automatically found subtitles resources, a lone track in my language is automatically selected as the translation subtitles, or else I am prompted to select a track
  - [x] given an unsupported video or audio format, I am prompted to allow the file to be converted to a supported format
- when I open a video or audio file my system cannot play directly:
  - [x] the first time, I see a notice that the file will be converted as it plays, with a "Don't show this again" box; Cancel returns me to the project's media list
  - [x] playback starts within a few seconds, and I can jump to any point before the conversion has finished
  - [x] the converted file is kept on disk, so it plays at once the next time
- when a video or audio file has several video or audio tracks:
  - [x] I choose which tracks to play before the first play, and my choice is remembered for that file
  - [x] a "Tracks" button in the player lets me change the choice later, and the player continues from the same position
- when a video is playing:
  - [x] a "Screenshot" button captures the current frame
- when a file cannot be played:
  - [x] I see "The media could not be played." followed by one plain sentence saying why, for example "This video's picture is too tall to convert."
- when a subtitles track is opened:
  - [x] I see the subtitles displayed on top of the video
  - [x] I see indications of the cue timings in the waveform visualization, and can click on them to seek the video to that cue
- when both a target-language subtitles track and a translation subtitles track are opened:
  - [x] I see the target-language subtitles above the translation subtitles
  - [x] I can toggle between displaying the target-language and translation subtitles on top of the video, with the button in the player controls

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
  - [ ] the audio seeks to the start of that segment
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
- when the waveform visualization is shown:
  - [x] I can hide it with the button in its corner, and show it again with the strip under the player
- *on desktop*, when I open the View menu:
  - [ ] I can show or hide the waveform visualization

---

### Subtitles panel

As a user:
- when a subtitles track is opened:
  - [x] I can access the collapsible subtitles panel
- while the subtitles panel is open:
  - [x] I see the subtitles displayed in the panel, with one card per cue
  - [ ] it is docked to the side of the video player, or at the top of the audio player
  - [x] the card for the cue currently being spoken is highlighted, and the panel scrolls to keep it in view
  - [ ] I can click on a card to seek the media to the start of that cue
- when the open media file has no subtitles:
  - [x] I see a button to add a subtitles file from disk
  - [ ] I see a button to generate subtitles automatically

---

### Ebook/text reader

As a user:
- when an ebook or text file is opened:
  - [ ] I can read the text in the ebook/text reader
  - [ ] I can navigate through the pages and chapters of the ebook
  - [ ] I can search for specific words or phrases in the text
  - [ ] I can open the table of contents via a button
  - [ ] I can change the font size and style of the text
- when I close and reopen an ebook or text file:
  - [ ] I am returned to my last reading position
- when the ebook or text file has been aligned with an audio file:
  - [ ] I can click on a sentence/segment to play the matching audio
  - [ ] the sentence/segment currently being spoken is highlighted during playback
- when a translation is opened:
  - [ ] I can switch between
      - target language text only
      - translation text only
- when the ebook or text file has been aligned with a translation, and the target-language text is open:
  - [ ] I can click on a sentence/segment to see the matching translation
- when the ebook or text file has been aligned with a translation:
  - [ ] I can switch between the single-language views and two bilingual views:
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

### Dictionary lookup and flashcard creation

As a user:
- when I mouse over or tap on a word in the target-language subtitles or text:
  - [ ] I can see the definition of the word in the dictionary pop-up, if available
  - [ ] any audio/video playback is either looped (if the word is in the subtitles/timing-enhanced text) or paused (if no timing is available)
- while the dictionary pop-up is open:
  - [ ] I can click or double-tap on a word in the dictionary pop-up to create a flashcard for the word
- when I click or tap outside the pop-up and not on a word in the target-language subtitles or text:
  - [ ] the dictionary pop-up is closed
  - [ ] any paused audio/video playback is resumed, or any looping audio/video playback is played as normal
- when I click or double-tap on a word in the target-language subtitles or text:
  - [x] a flashcard is created for the word
  - [x] the fields are shown according to my flashcard settings
  - [x] the flashcard-editing form is opened
- when the flashcard-editing form is open:
  - [ ] the corresponding segment of audio/video is looped
  - [x] I can edit the text fields of the flashcard
  - [x] I see the waveform of the flashcard's audio clip in the form, where I can move the clip's edges and the time of its screenshot as in the waveform visualization
  - [x] I can toggle whether to include the screenshot by clicking it or its checkbox; an excluded screenshot is shown faded
  - [x] I enter tags as chips, separated by commas or Enter
  - [x] fields excluded in my flashcard settings are hidden
  - [x] I can add a field excluded in my flashcard settings back to the flashcard, from the list behind the "Add a field" button
  - [x] I can save the flashcard and close the form
  - [x] I can delete the flashcard and close the form
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
  - [ ] the L1 and/or L2 fields are filled with the definitions from all matching dictionary entries
- when I create a flashcard from a specific dictionary entry:
  - [ ] the L1 or L2 field is filled with the definition from that entry, rather than all matching entries
- when I press the lookup button or its keyboard shortcut:
  - [ ] the dictionary pop-up opens, with focus on a text input field where I can type a word to look up
- while the dictionary pop-up is open but no dictionary is enabled for the project's language:
  - [ ] the dictionary pop-up prompts me to set up a dictionary
- when I have made flashcards without having saved my work:
  - [ ] I see an indication that my work is unsaved, and a button to save it
- when I have made flashcards without having logged in:
  - [ ] I see an indication that my work is not backed up, and a button to log in or sign up
- when a flashcard is created and AnkiConnect is enabled and running:
  - [ ] the flashcard is sent directly to Anki, and I see an indication of whether it was successful
- when a flashcard is created and AnkiConnect is enabled but not running:
  - [ ] the flashcard is queued to be sent to Anki, and I see an indication of that
  - [ ] the flashcard is sent to Anki the next time AnkiConnect is reachable, and I see an indication of whether it was successful
- when a flashcard is created and AnkiConnect is not enabled:
  - [x] the flashcard is saved in the project

---

### Dictionaries

As a user:
- when I open the dictionaries settings:
  - [ ] I see a list of my dictionaries, with each one's language(s) and format
  - [ ] I can add a dictionary from the easyImmerse registry
  - [ ] I can add a dictionary from a file
  - [ ] I can remove a dictionary
- when I have more than one dictionary enabled for a language:
  - [ ] I can set the order in which their entries appear in the dictionary pop-up
- when I add a dictionary from a table file (CSV, TSV or Tabfile):
  - [ ] I see a preview of its first rows, with what each column holds
  - [ ] I can change what a column holds, and whether the first row is a header, before importing
- when I add a dictionary in a format the app does not support:
  - [ ] I am told which formats are supported, and that a plugin may add support for others

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

### Exporting flashcard decks

As a user:
- when I choose to export my flashcards to Anki:
  - [ ] I can choose to export all cards
  - [ ] I can choose to export only cards not yet exported
  - [ ] I can choose to export only cards from specific media files
  - [ ] I can choose to export all cards from a selected media file, or only specific cards from that media file
- when I choose to export my flashcards as an Anki deck package:
  - [ ] I am prompted to choose where to save the Anki deck package, including its media

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
- when I tap and hold, or click and hold on a subtitle cue or a passage of text without a translation:
  - [ ] the selected text is translated into my language
- when a subtitle cue has been translated:
  - [ ] the translation appears below the target-language cue, as with dual subtitles
- when a passage of ebook/text has been translated:
  - [ ] the translation appears in a pop-up, staying until I click or tap outside the pop-up
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
- when I open the settings screen:
  - [x] it opens over the current screen, from a Settings link in the footer; Back returns me to the screen as it was, so a video keeps playing while I change a setting
  - [x] *on macOS*, Preferences in the app menu (Cmd+,) opens it too
- when I am on the settings screen:
  - [x] I can turn on "Keep audio lossless when converting", so later conversions keep the audio at full quality at the cost of more disk space
  - [x] I see how much disk the converted videos use of what they may use, and a "Clear converted videos" button; without a server that can convert, the section is one line saying so
  - [x] I can read the open-source licenses of the bundled components, including the bundled ffmpeg's notices and those of every Rust crate and JavaScript package that ships
  - [ ] I can change the app's theme between light and dark
  - [ ] I can set whether to honor the system's light/dark theme preference
  - [ ] I can change the language of the app's interface
  - [ ] I can view and change keyboard shortcuts
  - [ ] I can enable AnkiConnect
  - [ ] I can configure the storage location for app data

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
