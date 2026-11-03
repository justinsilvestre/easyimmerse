# UX refinements

A user story says what the product does. A refinement says how the product deals with something in its medium that would otherwise make a story feel wrong even when it is implemented as written: a browser's media element, Anki's import model, a pointer that moves faster than a lookup answers, a phone with no keyboard. Each entry keeps the reasoning behind a choice that the code and the stories alone would not explain, so that later work neither undoes the choice nor makes it again.

Each entry has a title that states the behavior in a short sentence, and three parts, written in the present tense:

- *Limitation*: what in the medium causes the problem. It is true whatever our code does.
- *Behavior*: what the product does about it, as it is now, never against an earlier version.
- *Reason*: why this choice, given only where another choice was plausible. A tuned number, such as a delay or a budget, always gets a Reason that says what it trades off, so that whoever adjusts it knows what to re-balance.

A checked entry describes what the product does. An unchecked entry describes a limitation that has been identified and an approach that has been chosen but not built. A question that has not been decided does not belong here, and neither does a measurement taken on one machine on one day; a target belongs in [Principles](#principles).

A title ends in a platform list in parentheses, such as "(web, desktop)", when the behavior exists only there. No list means every platform.

Principles that apply to the whole app are listed under [Principles](#principles). A principle that applies to one area alone opens that area's section, before its entries. A section with many entries groups them under sub-headings.

What a user can see the product do belongs in [user stories](user-stories.md). A story the product does not follow is a question to settle, not a refinement. A defect goes in [bug reports](bug-reports.md), and a stopgap kept knowingly goes in the code follow-ups notes.

The sections follow the order and the names of the user stories.

## Principles

These are the standards the refinements are measured against.

- Status within a second, progress beyond ten: lookups, conversion, imports and saves each show state at once; anything longer shows how far it is and can be cancelled (NN/g response times).
- Every automatic or destructive step can be undone (NN/g user control).
- One gesture for one meaning across subtitles, the transcript panel, the reader and the extension; the same name for the same thing on every screen (NN/g consistency).
- Hover is never the only way: every hover lookup has a tap and a keyboard path (Apple HIG, WCAG 2.1.1).
- Touch targets of 44 points, 48 on Android, 24 CSS pixels at the least on the web (Apple HIG, Material 3, WCAG 2.5.8).
- The immersion screens show the media, the subtitles and the lookup, and nothing else until asked (NN/g minimalist design; the product's own "introduce gradually").
- The cue is the unit of study: keys, seeks and flashcards work on whole cues, not on seconds.
- Contrast 4.5:1 for text and 3:1 for controls and focus rings; a visible focus ring on everything; Escape closes and returns focus (WCAG 1.4.3, 1.4.11, 2.4.7).
- Motion: about 100 ms for feedback, 150 to 250 ms for pop-ups and notices, 300 to 500 ms for panels, and none when the system asks for less (Material 3, WCAG 2.3.3).
- Loading: nothing under a second, content-shaped placeholders up to ten, a progress bar beyond (NN/g skeleton screens).
- Empty states explain and offer one main action; error states say what happened and what to do next, where it happened (NN/g).

## Layout/general

### Notices and menus

- [x] **Notices appear in one place and pause while in use**
  - *Limitation*: A notice shown where it was caused shifts the content around it, one that disappears on a timer removes its buttons before a keyboard user reaches them, and screen readers announce nothing on their own.
  - *Behavior*: Notices appear in one region of the app. Screen readers announce a failure at once, as an alert, and other notices politely. A brief notice stays for ten seconds, and the countdown pauses while the pointer is over it or keyboard focus is in it, so its buttons can be reached by keyboard. A notice that reports a failure stays until it is dismissed.
  - *Reason*: (to be recorded: what ten seconds trades off)
- [x] **Closing a dialog returns focus to the control that opened it**
  - *Limitation*: When a dialog closes, the browser leaves keyboard focus nowhere, so the next Tab starts from the top of the page.
  - *Behavior*: Closing the conversion notice or the track choice returns keyboard focus to the control that opened it.
- [x] **Menus close on a press outside**
  - *Limitation*: A menu that closes when its button loses focus never closes in a browser that gives a clicked button no focus.
  - *Behavior*: Menus close on a press outside them.

### App frame

- [x] **The Sync and Profile menus each have one purpose**
  - *Limitation*: A thin footer cannot hold six unrelated controls, and a single button that both shows the backup state and opens a menu of pages mixes two purposes.
  - *Behavior*: The Sync menu at the left of the footer tells where the user's work is and whether it is safe. Its icon shows where the work is, and turns the warning colour while the work cannot be backed up. Its popover says the same in words, offers the one fix, and lists only the steps that would change the answer. The Profile menu at the right of the header is about the user and their preferences: it shows the account or the way to log in, the theme, and Settings. Neither menu has Help, which is a row in Settings.
- [x] **The footer stays one line tall**
  - *Limitation*: A task appearing in the footer would change its height and shift the screen above it, and several tasks do not fit beside the buttons of a phone-width screen.
  - *Behavior*: The footer is always shown and one line tall. It shows the tasks under way on other screens: a dictionary import, a media-source fetch, and flashcard saves waiting on the server. They are shown side by side where the footer has room, and combined into one button with a menu where it does not; three or more are always combined. Each says what it is doing and, when it can tell, how far it is. A failed one stays until it is dismissed on its own page. Clicking one opens the page where it is shown in full, and it is removed from the footer while that page is open.

### Devices

- [x] **Icon buttons grow for fingers** (touch)
  - *Limitation*: Icon buttons of 32 pixels suit a pointer but are smaller than the 44 points a finger needs.
  - *Behavior*: Icon buttons grow to 44 pixels for coarse pointers.
- [x] **All animations shorten when the system asks for reduced motion**
  - *Limitation*: Respecting the system's reduced-motion setting in each animation separately leaves most animations unhandled.
  - *Behavior*: A global rule shortens every transition and animation when the system asks for reduced motion.
- [x] **Bars leave room for the notch and home indicator** (phone)
  - *Limitation*: A phone's notch and home indicator cover the edges of the viewport.
  - *Behavior*: The viewport covers the whole screen, and the headers, footers, player controls and the notices region add padding to stay clear of the notch and home indicator.
- [x] **Placeholder shapes are shown while content loads**
  - *Limitation*: A project list or a project takes a moment to load, and a line of text shown meanwhile moves the layout when the content replaces it.
  - *Behavior*: Placeholders in the shape of the content are shown until it loads, with a status that screen readers announce.
- [x] **The app warns before closing with unsaved work** (web, extension, desktop)
  - *Limitation*: A browser or a desktop window can ask before it closes, but mobile systems close an app without asking it first, so unsaved work is lost when the app is closed there.
  - *Behavior*: While the open flashcard has unsaved changes, a flashcard is being saved or waiting for definitions to be saved, or any flashcard is listed as not saved, the app warns before it closes: the browser's own leave-page prompt on the web and in the extension, and a confirmation dialog on desktop. On macOS, Quit in the app menu closes the window the same way, so it asks too; quitting from the Dock or by logging out still ends the app without asking.
  - *Reason*: Keeping unsaved work on mobile would need the project's work to be stored on the device, as the autosave stories describe.

## Project settings

- [x] **The target and translation languages must differ**
  - *Limitation*: A project whose translation language is its target language has nothing to translate into, so its translation subtitles and L1 definitions would repeat the target language.
  - *Behavior*: When the same language is chosen for both, the project form shows "Choose a different language from the target language." under the translation language, and the form cannot be submitted until one of them changes.

## Project screen and saving projects

- [x] **Subtitle files next to a media file are added with it**
  - *Limitation*: A subtitle file in the same folder as a media file would otherwise have to be added by hand after it, and its language is tagged in its name, often with a three-letter code such as `jpn` that never matches a project's two-letter `ja`.
  - *Behavior*: When a media file is added by path, the server lists its folder and adds the subtitle files with the same name as tracks. The name may add a language tag and the usual `forced`, `sdh` or `cc` suffixes. Three-letter codes count as their two-letter equivalents, for files next to the video and for embedded tracks alike. Tracks found inside and next to the file are given roles in one step: a role already set is kept, a subtitle file next to the video gets a role first, and an embedded track gets a role left empty when it is the only embedded track in its language. Picture-based tracks, such as those of DVDs and Blu-rays, are not shown.
- [x] **Embedded subtitle tracks are extracted when the file is added**
  - *Limitation*: Extracting a text track from a media file takes about a second per track, and the extraction of a track can fail.
  - *Behavior*: Text tracks are extracted while the file is added, so adding a file with many text tracks is slow. The media file is saved before any track is extracted. When a track cannot be extracted, it is left out, and the media file and its other tracks are still added.

## Video player

Player keys follow YouTube where they can, and cue-level keys are added because the cue is the unit of study.

### Streams

- [x] **Unsupported formats are converted as they stream**
  - *Limitation*: A browser plays only some video and audio formats, and an audio format must allow seeking to arbitrary timestamps for playback to follow subtitle timings.
  - *Behavior*: When a media file is opened, its format is checked against a list of the formats the browser can play. With the user's consent, the app streams the file in a compatible format where a server can convert it.
- [x] **Conversion runs ahead of playback**
  - *Limitation*: A conversion that ran to the end of the file would keep a processor core busy while the video is paused, and one that stopped at the current playback position would make every play wait.
  - *Behavior*: A conversion writes about five minutes of media ahead of the newest request and then stops. A request within a minute ahead of the running conversion lets it continue; a seek further away restarts it at the segment before the one requested. A request waits up to sixty seconds for its segment before the player is told to retry.
  - *Reason*: (to be recorded: what five minutes, one minute and sixty seconds trade off)
- [x] **Converted media is cached up to a size limit**
  - *Limitation*: Converted media is large, and a disk filled by it would hurt the rest of the system.
  - *Behavior*: Converted media is kept on disk between sessions, within a budget of five percent of the disk (at least 1 GiB, at most 100 GiB) and never within the last five percent of free space (at least 2 GiB, at most 20 GiB). Clearing the cache from Settings keeps the conversions that are playing right now. Removing a media file removes its cached conversions unless another media file points at the same source file.
  - *Reason*: (to be recorded: what the percentages and their bounds trade off)
- [x] **The seek bar shows what has loaded**
  - *Limitation*: A stream being converted arrives in pieces, so a seek past what has arrived has to wait.
  - *Behavior*: The seek bar shows behind its slider which parts of the file the player has loaded.

### Seeking

- [x] **Seeks aim half a frame past the asked time**
  - *Limitation*: A media element asked to seek exactly to a frame boundary sometimes shows the previous frame.
  - *Behavior*: Every seek the app makes, as from a click on a cue or on the waveform, targets the asked time plus half a frame at the file's frame rate, or half of a sixtieth of a second when the rate is unknown. The time shown, and the choice of which cue is current, use the asked time.
- [x] **Position kept across a track switch**
  - *Limitation*: A converted file has a different playlist per track choice, so switching tracks reloads the stream.
  - *Behavior*: The player remembers the position before the old stream is removed, and seeks back to it once the new stream has loaded its metadata.
- [x] **Playback resumes where it stopped**
  - *Limitation*: A media file opened again starts from the beginning unless its position is kept somewhere.
  - *Behavior*: A media file resumes where playback last was. The position is stored as a preference, like the reading place in a book: when playback pauses, every fifteen seconds while it plays, and when the file is closed. A file left within five seconds of its start or end starts over.
  - *Reason*: Within five seconds of the start or the end there is nothing to resume. (to be recorded: what fifteen seconds trades off)
- [x] **Arrow keys move the seek bar by a second**
  - *Limitation*: A native range input over a file's length in milliseconds moves by a millisecond per arrow key and announces a bare number.
  - *Behavior*: The seek bar's arrow keys move one second, and it announces its time.
- [x] **Space presses a focused button without toggling playback**
  - *Limitation*: Space activates a focused button as well as the page's own shortcut.
  - *Behavior*: While a button has focus, Space only presses that button, so it does not also toggle playback.
- [x] **A click on the video pauses at once, and a double-click toggles fullscreen**
  - *Limitation*: A single click and a double-click on the same surface cannot be told apart without delaying every single click.
  - *Behavior*: A single click plays or pauses at once. A double-click toggles fullscreen, and its second click undoes what the first did, as on video sites.
- [ ] **First tap reveals the controls** (phone)
  - *Limitation*: On a phone a tap on the video pauses it, while the platform convention is that the first tap reveals the controls.
  - *Behavior*: The first tap on the picture reveals the controls instead of pausing.

### Picture and controls

- [x] **The picture is as large as fits without distortion**
  - *Limitation*: The space left for the picture beside the subtitles panel and the other panels rarely has the same proportions as the video.
  - *Behavior*: The picture is enlarged or reduced to the largest size that fits that space without changing its proportions. The rest of the space is black.
- [x] **The controls hide while the video plays**
  - *Limitation*: Controls over the picture must hide while the video plays, but must stay visible during keyboard use. Focus left on a toggle after a click would keep them visible indefinitely. A bar that shrinks in height moves the subtitles. Looking words up is no reason to show the controls.
  - *Behavior*: The header and the player controls are shown over the picture, and hide while the video plays and the pointer does not move, so the subtitles panel has the full height and the picture never moves. The bar keeps its space and only fades out. Only visible keyboard focus keeps the controls shown. Moving the pointer over the subtitles, and the pause caused by an open pop-up, do not show them again.
- [x] **The header and controls are on translucent black**
  - *Limitation*: A bar over the picture must let the picture show through and stay readable over it, and a tinted translucent background colours the picture's edges.
  - *Behavior*: The header and the player controls have a translucent, blurred black background. The Profile button at the right of the header shows and hides with the controls, and has no warning state, so it does not draw attention over the picture.
- [x] **In fullscreen, the footer hides with the controls**
  - *Limitation*: In fullscreen, a footer that stays visible takes a strip of the screen away from the picture.
  - *Behavior*: In fullscreen, the footer is shown over the player area, under the controls, and shows and hides with them. Its height counts as part of theirs, so the picture keeps its place. It uses the player area's dark colours whatever the app theme.
- [x] **Only the picture and its bars stay dark in a light theme**
  - *Limitation*: The picture and the bars over it must be dark whatever the theme, but a dark theme forced on the whole screen would also darken the subtitles panel and the footer.
  - *Behavior*: Only the picture and the bars over it stay dark; the rest follows the theme, and the pop-up is rendered outside the dark area.
- [x] **The video has no context menu**
  - *Limitation*: The browser's context menu on a video offers its native controls, which would then be drawn behind the app's.
  - *Behavior*: The context menu is turned off on the video.

## Subtitles band

Captions follow the BBC subtitle guidelines: at most two lines of about 40 characters, high contrast on a translucent box, never under the controls.

### Layout

- [x] **The subtitles go under the picture when there is room**
  - *Limitation*: The player area must hold the picture, the subtitle band and the player controls, and a short, wide window cannot hold all three one under another without shrinking the picture.
  - *Behavior*: The band goes under the picture when the player area has room for it there, with the controls below a picture as wide as the player area. Otherwise it goes over the lower edge of the picture, above the controls.
    - Under the picture, the player area keeps the height of the controls free at its bottom, and the picture and the band are centred together in the rest, with the band right under the picture.
    - Over the picture, the controls are also shown over its lower edge.
    - The controls take no room of their own in the layout, so the picture never moves when they show or hide.
    - When the side panel is placed under the player area, as on a phone, the player area is only as tall as the picture, the band and the controls, and the panel has the rest.
    - The picture of an audio file has no known proportions, so its band always goes underneath.
- [x] **The subtitles' backdrop fades in over the picture**
  - *Limitation*: A band shown over the picture would cut across it with a hard edge, and a gap would appear under the subtitles whenever the controls hide.
  - *Behavior*: Over the picture, the band's backdrop fades in from transparent above the subtitles and continues behind the controls to the bottom of the player area. Under the picture, the band has a black background, like the video, so the subtitles' background opacity shows only over the picture.
  - *Reason*: The app's own dark colour under the band would set it apart from the black around the video.
- [x] **The subtitles have a box of fixed height**
  - *Limitation*: Subtitles that take the size of each cue keep moving under the pointer and leave little room to point at a word, and subtitles of one size are too small on a large monitor or too large on a phone.
  - *Behavior*: The subtitles are in one box across the bottom of the picture, with a fixed height for the lines it shows. The whole box responds to the pointer for lookups, so moving the mouse over it leaves the controls hidden. The text scales with the width of the picture, from a phone's size to about two and a half times it.
- [x] **The lookup and new-flashcard buttons stay in the band's top-right corner**
  - *Limitation*: The two buttons need a place that does not change with the cue and does not cover the words.
  - *Behavior*: They are in the band's top-right corner, over the subtitle box, so that the box keeps its size. With no subtitles under them, they get a row of their own. A long cue that fills the box can extend under them while they show.
- [x] **The text shadow is set on each word**
  - *Limitation*: Browsers give buttons no text shadow of their own, so the words that can be looked up, which are buttons, would lose the shadow the rest of the line has; in Japanese that would leave only the punctuation shadowed.
  - *Behavior*: The shadow is set on every word.

### Cues

- [x] **A cue stays shown until the next one starts**
  - *Limitation*: A cue that disappears at its end time cannot be read or looked up once the line has been spoken.
  - *Behavior*: A cue stays shown until the next one starts, but only while playback continues through its end. A seek to a time after the cue's end, whether from the app or from the player's own controls, ends it, so a seek into a gap between cues shows no cue from long before. Every place that shows the cue follows the same rule, so a subtitles panel opened while a cue is kept shown marks that cue.
- [ ] **Small timing differences between a clip and its cue are ignored**
  - *Limitation*: A flashcard's clip rarely matches its cue's timing exactly, so the short stretches where the clip and the cue do not overlap would each count as a span of their own, and the cue text would flicker as playback passes them.
  - *Behavior*: Such short stretches do not replace the active cue; the cue that overlaps the clip stays active.
- [ ] **Cues of the target-language and translation tracks are paired**
  - *Limitation*: A target-language track and a translation track divide the same dialogue into cues differently, so their cues do not match one to one.
  - *Behavior*: When both tracks are open, cues from the two are paired, allowing for the differences in how they divide the dialogue, and seeking by cue uses the timings of the paired cues. With only the target-language track open, seeking uses that track's own cue timings.

## Waveform visualization

- [x] **The waveform waits until the file's length is known**
  - *Limitation*: Until the server has examined the file or the player has reported a duration, the file's length is unknown, and a request for peaks past its end would fail.
  - *Behavior*: The waveform strip shows no time span and requests nothing until one of the two is known.
- [x] **The waveform moves to a seek's target at once**
  - *Limitation*: The player reports a seek's new time only once it has the data for it, which for a stream still being converted can take a while.
  - *Behavior*: The strip moves its view to the target at once, before the player reports it, so the waveform around the target starts loading immediately.
- [x] **The waveform loads in thirty-second pieces**
  - *Limitation*: The peaks of a long file are too many to fetch at once, and a server restart during loading would otherwise leave gaps.
  - *Behavior*: The strip loads the waveform in thirty-second pieces, at most three at a time, and keeps every piece it has loaded in memory for the rest of the session, so that returning to a part of the file needs no new request. A piece whose request failed is requested again after a few seconds.
  - *Reason*: (to be recorded: what thirty seconds and three at a time trade off)
- [x] **The waveform is drawn as bars on a canvas**
  - *Limitation*: An SVG waveform costs an element per peak, so a long view is slow to lay out; and when more peaks are in view than fit as separate bars, choosing anew which peak each bar shows makes the waveform flicker as it scrolls.
  - *Behavior*: The strip and the clip editor both draw the waveform on a canvas as evenly spaced bars, mirrored around the middle. The canvas stays a single element with a fixed number of drawing steps however many peaks are in view. Each bar shows the loudest of its peaks, and the bars keep the same peaks as the strip follows playback. Silence is a thin line, and audio not loaded yet a faint one.
  - *Reason*: The strip's background stays dark in both themes because its overlays are drawn for a dark background; the clip editor's follows the theme.
- [x] **A click on a cue seeks to its start**
  - *Limitation*: A click on a cue in the strip's row of cues would seek to whatever time inside the cue was clicked.
  - *Behavior*: It seeks to the cue's start.
  - *Reason*: The cue is the unit of study.
- [ ] **Dragging a handle to the edge scrolls the waveform**
  - *Limitation*: A clip can extend beyond the visible span of the waveform, and a handle cannot be dragged past the strip's edge.
  - *Behavior*: Dragging a handle near the edge scrolls the waveform, so the clip can be extended beyond the visible span.

## Subtitles panel

- [x] **The subtitles panel follows playback until the user scrolls it**
  - *Limitation*: A panel that scrolls to the active cue on every cue change moves the line the user is reading out of view.
  - *Behavior*: The panel follows playback until the user scrolls the active cue out of view, then shows a "Back to current line" button, and follows again once the user seeks from a cue.
- [x] **Only the cue card with the active word is redrawn**
  - *Limitation*: A media screen with hundreds of cue cards, all redrawn on every hover and every playback update, makes lookups feel slow; the cost is in rendering, not in the network.
  - *Behavior*: Hover lookups go through the store without a hook, the cue cards are memoised with stable callbacks, and only the card that has the active word receives it.
- [x] **Hidden screen-reader text does not stretch the panel**
  - *Limitation*: Every clickable text contains a screen-reader announcement positioned off screen; positioned relative to the panel, a few hundred of them make the page longer.
  - *Behavior*: Each announcement is positioned relative to its own text.
- [x] **A flashcard's word is underlined where it was taken from**
  - *Limitation*: A word that appears twice in a cue cannot be marked at the right occurrence from the word and the cue alone, and marks computed on every render would give the memoised cards new inputs.
  - *Behavior*: The word a flashcard was made from is marked with a dotted underline in the band and in the panel. The flashcard records where in the cue its word was taken from, and the underline marks that occurrence. The position is dropped only when the word is edited to something that is no longer at that place, and such a flashcard marks the first occurrence instead. The marks are computed once per cue.

## Ebook/text reader

The reader follows Baymard's reading metrics: lines of 50 to 75 characters, line height 1.4 to 1.6, 4.5:1 contrast in all three themes, and a tap on a word never turns the page.

- [x] **The word under the pointer is found without changing the text's markup**
  - *Limitation*: Wrapping every word of a long chapter in its own element makes the chapter slow to lay out.
  - *Behavior*: The word under the pointer is found from the browser's caret position, and highlighted with the CSS Custom Highlight API, which leaves the text's markup alone.
- [x] **A word is looked up once the mouse stops on it**
  - *Limitation*: A pointer moving across the text passes over many words it is not aimed at, and looking each one up would make the dictionary pop-up flicker.
  - *Behavior*: The mouse must stay on a word for about a tenth of a second before it is looked up.
  - *Reason*: A tenth of a second is longer than the pointer stays on a word it is passing over, and short enough that the lookup still feels immediate.

## Dictionary lookup and translation

- [x] **Lookups for nearby text are fetched ahead in batches**
  - *Limitation*: A lookup sent for each word the pointer passes makes a quick movement across a line send many requests at once and show a series of entries, while fetching a whole file's lookups at once makes the user wait for a big batch and loads the server.
  - *Behavior*: Lookups for whole cues or paragraphs are fetched ahead in one batch request, so hovering and clicking read from the cache, and moving the pointer across that text sends no requests. In a media file the range is the cue shown, the cues overlapping the next sixty seconds of playback, and the cue cards in view in the panel; in the reader, the visible paragraphs plus about one screen above and below. The range follows playback and scrolling; the whole file or page is never fetched. The pop-up follows the pointer after it stays still for 40 ms.
  - *Reason*: The range balances what is easiest on the server and the database against what a user may have to wait for. 40 ms is well under the hundred milliseconds that feedback may take. (to be recorded: what sixty seconds and one screen trade off)
- [ ] **Entries whose words are apart in the sentence are found**
  - *Limitation*: An entry such as „von … an", "pick … up" or « ne … pas » begins with one word and continues with another later in the sentence, so a lookup of its first word alone does not find it.
  - *Behavior*: The entry is found when its later words follow in the same sentence, and all of its words are highlighted.
  - *Reason*: The matching may be simple: looking up „arbeitet" in „Er arbeitet von heute an" may still offer anarbeiten, with „an" highlighted, as long as looking up „von" offers „von … an".
- [ ] **German particle verbs are found when the particle is mid-clause**
  - *Limitation*: Lookup finds a separated particle verb only when the particle ends its clause, so „Fang endlich an mit der Arbeit!" does not lead to anfangen.
  - *Behavior*: A simple check of the word after a particle in the middle of a clause finds such verbs: another preposition suggests a verb particle, and an article, a pronoun or a noun suggests a preposition, as in „Ich denke an dich".
  - *Reason*: The check is adopted only if it finds such verbs without adding many wrong matches.
- [ ] **Lookup requests need no CORS preflight**
  - *Limitation*: Each lookup request from a browser or the desktop webview needs an extra CORS preflight request first, since the bearer token makes the request non-simple and the preflight cache is keyed by the full URL.
  - *Behavior*: The token is sent in a way that keeps the request simple, so no preflight is sent.

## Highlighting words via keyboard

- [x] **The mouse and keyboard share one lookup cursor**
  - *Limitation*: The mouse highlight, the keyboard's starting character and the target of the L key are three separate states unless they are made one, and the page's shortcuts cannot tell which keys a focused word has already handled.
  - *Behavior*: The subtitles keep one lookup cursor, which the mouse and the keyboard move to the same places and which is highlighted the same way in the band and the panel. From a focused word, the arrow keys move the cursor through the cue and look up ahead as a still mouse does, L looks up from the cursor, and Escape removes it. The keys are mapped to "forward" and "backward" along the text in one place, so that right-to-left scripts can reverse them later.
- [x] **Only the lookup cursor is highlighted**
  - *Limitation*: Two highlights at once, the character under the pointer and the pop-up's word, confuse more than they help.
  - *Behavior*: Only the lookup cursor is highlighted. An open pop-up moves to the matched characters once the lookup answers, so the highlight and the pop-up agree.
- [x] **Arrow keys move by a word in Japanese and Chinese**
  - *Limitation*: Japanese and Chinese are written without spaces, so a cursor that moves by a character makes moving through a sentence slow, and the word boundaries are known only from lookups.
  - *Behavior*: The arrow keys move by a word. Forward moves past the characters the lookup matched, or one character until it answers. Backward moves to the start of the word before the cursor. That word is found by splitting the text into words from its start with lookups, as moving forward would split it. These lookups are cached, so moving back over words just moved forward over is immediate. Shift with an arrow moves one character.
- [x] **A tap puts the cursor on the tapped character**
  - *Limitation*: A tap focuses a piece of text only after the finger lifts, so it would count as keyboard focus and move the cursor to that text's first character before the tapped character is looked up.
  - *Behavior*: A tap leaves the cursor at the tapped character.

## Dictionary pop-up

- [x] **A dictionary's stylesheet applies only to its own entries**
  - *Limitation*: A dictionary's own stylesheet (Yomitan's `styles.css`, the `.css` next to an MDict or StarDict dictionary) is written for a whole page, and may load remote resources, run code or draw outside its entries.
  - *Behavior*: The stylesheet styles that dictionary's definitions and nothing else. It is sent with each lookup, so entries are never shown unstyled first. Before it is applied, every selector is limited to that dictionary's definitions, and anything that could load a remote resource, run code or draw outside the definition is removed. Class names in dictionary markup are kept with a prefix, so they cannot match the app's own styles.
- [x] **Dictionary colours are adjusted for the dark theme**
  - *Limitation*: Dictionaries are designed for white pages.
  - *Behavior*: In the dark theme, their text colours are lightened and their background colours darkened, keeping each colour's hue, so that their entries stay readable. Where the browser cannot compute these colours, the dictionary's own colours are shown.
- [x] **Inside the pop-up, a double-click looks a word up**
  - *Limitation*: A single click inside the pop-up is also meant for the clickable elements of a Yomitan entry.
  - *Behavior*: Inside the pop-up only a double-click, double tap or Shift+Enter looks a word up.
- [x] **The pop-up opens on the side of its word with more room**
  - *Limitation*: A pop-up placed beside its word has room on only one side, and an expanded one that kept clear of its word could grow only where the word leaves room.
  - *Behavior*: When compact, the pop-up opens on the side of the word with more room, without covering the word. When expanded, it is as tall as the window less a margin, and may cover its word. In both cases it is centred on the word and moved as needed to stay inside the window. The media screen and the reader use the same rule.
- [x] **The pop-up moves smoothly between words on the same side**
  - *Limitation*: A pop-up that moves instantly from word to word is hard to follow, but an animation between the two sides of the text looks wrong.
  - *Behavior*: The pop-up moves in an animation of about 150 ms when it moves to another word on the same side of the text, and moves instantly when it changes sides or first opens. Reduced-motion settings turn the animation off. The reader's pop-up follows the same rule.
  - *Reason*: 150 ms is the lower end of what the principles give a pop-up's motion.
- [x] **Opening Settings closes the pop-up**
  - *Limitation*: Settings opens over the screen, which would leave a pop-up under it that cannot be closed.
  - *Behavior*: The pop-up closes as soon as Settings covers its screen.

## Flashcard creation

- [x] **Definitions are copied as Markdown**
  - *Limitation*: A definition copied from an entry as plain text loses the breaks between list items.
  - *Behavior*: Definitions on a flashcard are copied as Markdown from the entries, so that lists stay lists.
- [ ] **Flashcards store a reference to registry entries**
  - *Limitation*: A flashcard that stores the full text of its dictionary entry takes space on the device and in the cloud for text the dictionary already has.
  - *Behavior*: A flashcard made with a dictionary from the easyImmerse registry stores a reference to the entry instead of the entry's full text.

## Flashcard form

### Saving

- [x] **A save waits up to ten seconds for definitions**
  - *Limitation*: A flashcard's definitions sometimes arrive from the dictionaries after its form has opened, so a Save pressed before then would save it without them.
  - *Behavior*: If Save is pressed before they arrive, the form says it is waiting for definitions, and its fields, Close and Delete are unavailable until the save is done or has failed. The flashcard is saved once the definitions arrive, with them filling the fields not typed in. If they cannot be found, or have not arrived within ten seconds, the flashcard is saved as it is. Changing the word before its definitions arrive means they no longer belong to the flashcard, so they are not added and Save does not wait for them. Moving on to another flashcard is still possible, and saves the waiting one in the background.
  - *Reason*: (to be recorded: what ten seconds trades off)
- [x] **A flashcard opened during its save shows what was sent**
  - *Limitation*: While a save is under way, or waiting for an earlier save to finish, the list does not yet show what was sent.
  - *Behavior*: Opening such a flashcard shows the content last sent for it. Undo of a save restores what the flashcard had just before that save.
- [x] **A save with no answer for thirty seconds counts as failed**
  - *Limitation*: A request whose connection hangs never answers, and stopping the request does not stop a server that has already received it, so the save may still succeed.
  - *Behavior*: A save request that has had no answer within thirty seconds counts as failed: the app stops waiting for it, and the form says so and can be edited again, or a flashcard no longer in the form is listed among those not saved. Deletions, Undos and rollbacks time out after thirty seconds in the same way, and a notice says they failed. A new flashcard keeps the id it is created with from its first save, through Retry and Open, so that sending it again replaces a save that succeeded late instead of duplicating it. If the flashcard is then discarded, with Discard or with Close without saving, the possible save is reverted: a new flashcard is deleted, and a saved one gets back what it had before. Undo of the discard still brings the edits back.
  - *Reason*: (to be recorded: what thirty seconds trades off)
- [x] **The footer shows saves that take over two seconds**
  - *Limitation*: A save the server is slow to answer gives no sign until it fails.
  - *Behavior*: Once a save has waited about two seconds, the footer says "Saving 2 flashcards…" until the saves succeed or fail. It has no page to open, so it is text, not a button.
  - *Reason*: (to be recorded: what two seconds trades off)

### Leaving the form

- [x] **Leaving a flashcard saves it in the background**
  - *Limitation*: A form that asks before it is left interrupts the user at every move between flashcards, and one that drops its edits loses work.
  - *Behavior*: When the user leaves a flashcard, because another flashcard is started or opened or the screen is left, it is saved in the background as it is, so that moving on never loses work and never asks a question first. This applies to a new flashcard even if it was never changed. A saved flashcard that was not changed is left alone.
    - A brief notice names the flashcard and has an Undo button, which deletes a new flashcard or restores the earlier content of a saved one. No notice appears for a flashcard whose Save had already been pressed.
    - Only a flashcard's latest save can be undone: its Undo is removed once a later save of it starts, and once it opens in the form, where undoing would change it while it is being edited. An Undo is sent after any save of the same flashcard that is still under way, so the two cannot arrive in the wrong order.
    - A flashcard whose Save was pressed while waiting for definitions keeps waiting in the background, until ten seconds after Save was pressed, and is then saved with whatever arrived. A new flashcard left while its definitions are still loading waits for them in the same way, for up to ten seconds. So does a flashcard requested from a word whose definitions have not arrived when the user moves on, whether it was to be saved at once or opened in the form: when the screen is left, the pop-up is closed, another word is looked up or searched, or another flashcard is requested.
- [x] **The confirmation for deleting a flashcard focuses Cancel**
  - *Limitation*: Pressing Enter out of habit activates the focused button of a confirmation.
  - *Behavior*: The confirmation of a flashcard's deletion puts the focus on Cancel.

### Failed saves

- [x] **Failed saves are collected in one status line**
  - *Limitation*: A notice per failed save would accumulate, and the edits of a failed save exist nowhere but in the app.
  - *Behavior*: Flashcards whose background save failed are kept, with their edits, in one status line that stays until they are handled, such as "3 flashcards not saved". The line expands into a list of those flashcards, each with Retry, Open and Discard, and has a Retry all button. Nothing is retried until the user asks.
    - A lost connection, a request with no answer or a server error puts a flashcard in the list. So does a refusal that may not happen again: the user signed out or not allowed for now, a request the server stopped waiting for, or too many requests. A save the server refuses outright, which sending again cannot fix, gets a notice of its own with Open and Discard and no Retry. It is left out of the status line while that notice shows, so that it is not reported twice. Once the notice is dismissed, or Open is pressed on it, the flashcard is counted in the status line, listed without Retry.
    - While a flashcard's Retry is under way, the list shows it as saving, and its Discard is unavailable.
    - Open puts the flashcard back in the form, going back to its media screen if the user has left it, and saves the flashcard open there as if the user had moved on from it. The flashcard stays listed until the form has it, however long its screen takes to load. If the project or its media files fail to load, or the media file no longer exists, a notice says the flashcard could not be opened, and it stays listed. If the user goes elsewhere before the screen appears, the flashcard stays listed and is no longer waiting to open. Opening a listed flashcard from the waveform or the flashcard list opens it the same way, with its edits. A flashcard without a media file has no Open, in the list or on its notice.
    - A Retry requested while a flashcard waits to open, or an Open requested during its Retry, leaves it waiting to open, so that it still opens if the Retry fails. A flashcard is either listed or open in the form, never both. When a background save of the flashcard open in the form fails, the form keeps it: the form shows a failure line until the next attempt, and its edits, which are newer, count as changed. The Undo of its Discard does not list it again while it is open in the form.
    - Open during a Retry opens the flashcard at once with the content being sent, as for any flashcard whose save is under way, and removes it from the list, since the form now has the edits. If that Retry then fails, the flashcard is not listed again: the open form counts as unsaved work.
    - A flashcard opened from the list counts as changed, since its edits are saved nowhere: closing it without saving discards it with Undo.
    - The waveform draws a listed flashcard with its listed edits, including one never saved. A flashcard's timing is edited only while it is open in the form: the waveform's handles move the open flashcard's clip and screenshot time with the same effect as the form's own fields. A save of a listed flashcard from the form removes it from the list, since the form has the user's latest edits.
    - Only Discard deletes the edits, after which a brief notice has an Undo button, which lists the flashcard again. The × only collapses the list, or hides the notice of a refused save, after which the flashcard is listed.
    - Screen readers announce the line when it first appears and whenever its count changes, and its list can be reached by keyboard like the rest of the page.

### Layout

- [x] **Text fields resize only when their text or width changes**
  - *Limitation*: A text field that grows with its text, and measures itself after every render by shrinking to no height, briefly shrinks the form's scrolling area and lets the browser reset its scroll position, so the form would scroll to the top whenever the media screen updates.
  - *Behavior*: The fields measure themselves only when their text or width changes, and keep their height while they do.

## Dictionaries

- [x] **Dictionary imports run in the background**
  - *Limitation*: Importing a large dictionary takes minutes, and the desktop webview's request stops waiting after about a minute while the server finishes the import, so a retry would import the dictionary twice; and leaving the page while the import runs would leave the user with no way to see it.
  - *Behavior*: Imports are background jobs whose status the screen checks regularly, with the entries stored so far. A failure stays on the screen, and a dictionary with the title of one already imported is refused. The import continues on other screens: the footer shows it with a link back to the page, and a Yomitan import shows the percentage of its files read.
- [x] **A dictionary being removed says "Removing…"**
  - *Limitation*: The server deletes a dictionary in one step with no progress to report, which for a large one takes several seconds.
  - *Behavior*: The row says "Removing…" with its buttons disabled until it is gone. If the removal fails, the row returns to normal and the user is told.

## Exporting flashcard decks and sending cards to Anki

- [x] **The Anki template shows only the fields with values**
  - *Limitation*: Which fields a flashcard includes varies from card to card, while an Anki template is fixed per note type.
  - *Behavior*: The Anki template shows whichever fields have values. A field left out of a flashcard is exported empty, as the preview shows it, so which fields a flashcard includes never changes the exported deck, and the included fields can change for an existing deck.
- [x] **A card with an empty front shows the word and sentence there**
  - *Limitation*: A flashcard made from an ebook has no audio and no screenshot, so a front made of those fields would be blank.
  - *Behavior*: When none of the front fields of a card has a value, the front shows the word and the sentence instead, and the back leaves them out, since the front already shows them. The example flashcard in the project form, the card on the project screen and the exported Anki card all follow this rule.
- [x] **Each project gets one Anki note type, created once**
  - *Limitation*: Anki creates a note type at the first import of a package and never changes it from a later one.
  - *Behavior*: Each project has its own note type in Anki, named "easyImmerse: " followed by the project's name, with the front and back chosen in easyImmerse. Importing again, or sending again, never changes it, so once the cards are in Anki, their look is changed in Anki.
  - *Reason*: The layout chosen in easyImmerse is only the starting point.
- [x] **A renamed project gets a second Anki deck**
  - *Limitation*: Anki matches an imported deck by its name.
  - *Behavior*: A project renamed after its first export gets a second deck.
- [x] **Importing again refreshes the notes in Anki**
  - *Limitation*: Anki accepts an imported note only when it is newer than its own copy.
  - *Behavior*: Every note in a package is dated at the time of the export. Importing a flashcard again refreshes its note in Anki from the flashcard as it is now, including an audio clip or screenshot that an earlier export had to leave out, and never changes the card's progress. An edit made to the note's fields in Anki is replaced by the flashcard's content.
- [x] **The app helps delete the notes of deleted flashcards from Anki**
  - *Limitation*: A package cannot tell Anki to delete a note.
  - *Behavior*: The app says so wherever a deletion is concerned: in the export dialog, in the confirmation of a deletion, and beside the list of deleted flashcards on the project screen. The search that the project screen copies finds the notes by their easyImmerse id field, however they were added, with one term per deleted flashcard joined with `OR`. The field name contains a space, so each term is quoted whole, as in `"easyImmerse id:0123…"`.
    - While AnkiConnect is off, a deleted flashcard that had reached Anki, through a package that removed it from the Anki updates queue or through AnkiConnect, stays listed until the user marks it done, or until AnkiConnect, turned on again, deletes its note.
    - While AnkiConnect is on, it deletes the notes itself, whether they came from a package or from AnkiConnect, since it finds them by their easyImmerse id field. It also looks for a note of a deleted flashcard that only went out in packages that kept it in the queue, and clears the deletion when it finds none.
- [x] **The export dialog warns before notes are doubled**
  - *Limitation*: Anki gives a note added through AnkiConnect a random GUID, which AnkiConnect can neither set nor read, so importing a package into that Anki adds a second copy of each such note, and of the note type.
  - *Behavior*: The export dialog warns before this happens. A note that came from a package keeps its GUID when AnkiConnect later updates it, since AnkiConnect finds notes by their easyImmerse id field, so those cards are never doubled.
- [x] **A deletion during a send waits for the send to finish**
  - *Limitation*: A flashcard deleted while its save is still being sent through AnkiConnect has no note the app knows of yet, but the send may be creating one.
  - *Behavior*: The deletion waits for the project's send to finish and then asks Anki to delete the note, so that no note is left behind. If the note was never created, the result does not name the flashcard as one Anki failed to delete.

## Reviewing flashcards

Review follows Anki where a user expects it: Space shows the answer, the buttons can show the next interval, and context appears only after the answer is shown.

- [x] **Cards are rated with two buttons**
  - *Limitation*: Four rating buttons encourage the one habit the scheduling algorithm cannot make up for, which is pressing Hard for a forgotten card.
  - *Behavior*: A card is rated with two buttons, Forgot and Remembered. The four-button layout exists for a later setting.
  - *Reason*: The FSRS authors find two buttons as accurate as four.
- [x] **Review reads cards from the project's list**
  - *Limitation*: A session that kept its own copies of the cards would show outdated content after an edit made elsewhere, and would show a card deleted elsewhere.
  - *Behavior*: The review session keeps only each card's id and schedule, and reads the card's content from the project's cached list of flashcards. An edit made elsewhere shows on the card at once, and a deleted card is skipped.

## Sync menu

- [x] **The missing-backup warning is shown once**
  - *Limitation*: A permanent "Not backed up" sign every time the app opens contradicts the product's offline-first approach.
  - *Behavior*: A person who never set up a backup is told once, in a card at the top of the home screen when the first flashcard is made, and can dismiss it for good. A backup that stops working is a fault, so it keeps the warning colour on the Sync icon until it is fixed.

## Plugins

- [x] **A plugin's fetch continues after the project is left**
  - *Limitation*: If the app stopped tracking a media-source plugin's fetch when the user left the project, the file would appear later with nothing to say whether or when it arrived.
  - *Behavior*: A fetch continues on other screens as a dictionary import does, also when the project is left while the plugin is still responding to the button that starts it. The footer shows the project's name with the fetch's latest step and percentage, and a click returns to the project with the fetch's window open. A failure stays until that window is closed. A file that arrives while the project is not open is announced in a notice instead of being opened.

## App settings

- [x] **Settings opens over the screen**
  - *Limitation*: A Settings screen that replaced the media screen would remove the player and lose its position.
  - *Behavior*: The media screen stays loaded, and cannot be used, under the Settings overlay, so Back restores the player exactly, including the position it had reached, and a video keeps playing while a setting is changed.
- [x] **The media cache section stays blank while its status loads**
  - *Limitation*: The media cache's status takes a moment to read, and the line saying the cache is unavailable, shown meanwhile, would flash on every open.
  - *Behavior*: The section shows nothing under its heading while its status loads. A server that cannot convert, or no server at all, gets the one-line unavailable state; any other failure to read the status is shown as such.
- [x] **Sizes are shown in units of 1000 bytes**
  - *Limitation*: Disk sizes can be counted in units of 1000 or of 1024 bytes, and the two give different numbers for the same size.
  - *Behavior*: Sizes are shown in units of 1000 bytes (kB, MB, GB). A size under ten units is rounded to one decimal place, such as "1.5 kB", and a larger one to a whole number.
