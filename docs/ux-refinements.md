# UX refinements

## Video and audio playback

- [ ] On desktop/mobile, a specification of video and audio formats compatible with the target browser environment should be referenced when opening a media file. On user consent, the app should stream the media file in a compatible format. It is important that the audio format allows seeking to arbitrary timestamps, so playback can be controlled accurately based on e.g. subtitles timings.

## Subtitles

- [ ] When both target-language and translation subtitles are available, cues from both tracks should be paired sensibly, e.g. accounting for differences in segmentation of dialogue. Whereas seeking via cue timings with just the target-language subtitles open happens based on that track's cue timings, the timings of the combined cues should be used when both tracks are open.
- [ ] In the subtitles overlay, when in between cues, the last cue should remain visible until the next cue is reached, so that the user has more time to read the cue/perform actions on it.

## Creating flashcards

- [ ] When creating a flashcard from a subtitle cue, the flashcard should be created with the fields filled according to the user's flashcard settings. When a field is excluded in the flashcard settings, the flashcard form should not show that field by default. However, when editing a flashcard, the user should be able to add an excluded field back in (though the UI for this should be designed carefully to avoid cluttering the flashcard form).
- [ ] These settings should make no difference in the Anki exports; the Anki template will be what determines what fields show based on which fields have values/are empty. This way, the flashcard settings can be changed for existing decks without complicating the Anki export process.
- [ ] As the user creates flashcards, their work should be saved automatically and periodically, so that e.g. an unexpected app crash does not result in lost work. On opening the app after it was closed unexpectedly, the app should reload the last saved project state, and if there are errors loading the state, the user should be informed and the app should work backwards to see if a previous autosave state can be loaded instead.

## Dictionaries

- [ ] A registry of tested dictionary files will be maintained, and the app will provide a way to download and install them. Using these dictionaries will have the added benefit of saving space on the user's device and in the cloud, since fields populated from these dictionaries will only need a reference to the dictionary entry, rather than storing the full text of the entry.
- [ ] When a dictionary is installed via an extension, and no sync has been set up, the dictionary will be imported into IndexedDB. If sync with a local server is set up, the extension user will be offered to switch to using a dictionary from the local server to save space + allow faster imports, and the indexedDB copy will be deleted once the server is set up with the same dictionary (from the same source or by exporting directly from indexedDB, if the source isn't available).