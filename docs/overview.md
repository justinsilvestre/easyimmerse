# easyImmerse

A free cross-platform software suite for learning languages through native media.

Users can easily turn videos, audiobooks, ebooks, and more into effective language-learning materials.

While you watch, listen, or read, features like instant word lookups help you learn new vocabulary fast, without interrupting your flow.
Automatically generated rich media flashcards make sure you remember what you've learned, and allow you to review your learnings on the go.

## offline-first, cloud-capable

Unlike similar apps, easyImmerse **treats your data as your own**. No cloud account or subscription is required to use the app, and you can use it completely offline with your own local files on your computer or mobile device.

For those who would like to support development of the app, a **sliding-scale subscription** unlocks a cloud-sync feature that makes it easy to access your data from any device. But a **self-hosting** option is also available for those who want to keep their data completely private.

## Components

There are several ways to use easyImmerse. This is a matter of not only convenience and accessibility for users, but also of data sovereignty and offline-first design. Rather than forcing users into a single platform, and controlling their access to specific data and features based on payment, easyImmerse gives users the freedom to choose how they want to use the app, and where they want to store their data.

This freedom comes with a tradeoff: understanding all the components of the easyImmerse ecosystem, how they relate to each other, and how to use them effectively can be a bit overwhelming.

Therefore, we aim to **introduce users gradually** to all these components and features, rather than exposing them all at once. We aim to **meet users where they are**, i.e. let them start with whatever component they deem most convenient.

### Web app

The web app is the easiest way to get started with easyImmerse.

Without having to log in, you can start immersing + generating flashcards in two ways:
- **watch/listen to/read media from the easyImmerse library**, which includes a variety of videos, audiobooks, and ebooks in multiple languages.
- **use your own local media files** as well as dictionary files by dragging and dropping them into the app. This feature works offline after the first load, since the app is a Progressive Web App (PWA).

Subscribers can also:
- **access and manage their own media files and dictionaries on the cloud**, keeping their library and progress synchronized with their other devices.

### Desktop app

The desktop app is available for Windows, macOS, and Linux. It offers the most full-featured experience, covering all the features of the web app, plus some extra ones:
- **media compatibility**: the desktop app can play a wider variety of media files, including files too large for browsers to handle, and in formats that browsers do not support.
- **LAN sync**: the desktop app can act as a local server synchronizing their data between devices on the same network without using the cloud (for example, by generating a QR code and scanning it with your phone connected to the same WiFi network).
- **app server**: self-hosting users can run the desktop app to serve the complete full-featured web app on the internet, or just the API for media playback, dictionary lookups, etc. for use with the mobile app or browser extension.
- **plugin support**: the desktop app can be extended with plugins, which allow users to customize the app to their needs, and even add new features. For example, a plugin could allow users to use a different dictionary format, process media in different ways, or generate flashcards in a different format.

### Mobile app

The mobile app is available for Android and iOS. It offers the same main features as the desktop app, but in a convenient mobile form factor.

### Browser extension

The browser extension is available for Chrome, and Firefox. It brings key features of easyImmerse to any website, allowing quick word lookups and flashcard generation from text and media on the web (for example, on YouTube, and eventually other platforms).

### Standalone server

The app server feature available in the desktop app can be used on its own without the GUI for tech-savvy users wanting to self-host the app somewhere, without the cruft of the desktop app.

## easyImmerse workflows

### Basic immersion workflow

The basic idea of easyImmerse is to *immerse* and *review*.

easyImmerse supports immersion by making it easy to *look up words* and *translate phrases/sentences* in a **fast, seamless manner** while watching videos, listening to audiobooks, or reading ebooks in a **distraction-free environment**. The app aims to *get out of your way* so you can understand and enjoy the story. Concentrating on the message, not the language, is the best thing you can do not only for your enjoyment, but also for your language learning.

#### Looking up words

When you encounter a word you don't know, whether in the subtitles of a video or in the text of an article, you can look it up in the app with a tap or a mouse-hover. 

#### Creating flashcards

Unlike ordinary flashcards, easyImmerse flashcards include rich context around your target words. For instance, a flashcard created from a video file will include not only the word and the surrounding sentence, but also the audio and a screenshot clipped straight from the video. You'll be able to review these flashcards on any device, either within easyImmerse or in the popular free SRS app Anki.

SRS stands for Spaced Repetition System, which is a tried-and-true method for memorizing new vocabulary. SRS apps are powerful, but getting started with them can be daunting. easyImmerse takes away the friction by providing you with sensible defaults to make sure the deck you build is an effective learning tool.

#### Machine translation

When working without a translation (in text or subtitles), you can trigger machine translation by taping and hold on a piece of text, and receive a translation of the selected phrase or sentences. The translation will appear below the target-language text in the video view (as with dual subtitles), or in a pop-up window in the ebook view.

By default, the app uses a free online translation service, which limits the number of translations. But subscribers have a generous monthly quota of translations, and anyone can bring their own API key for a paid translation service of their choice. (If translations are especially important to your workflow, you can have the app automatically translate all the text in view.)

### Video immersion

On opening a video, the app shows a video player like a normal video player, but adds a waveform visualization of the audio track.

When subtitles are available, they are displayed on top of the video, as you're probably used to. Tap or hover over words in the subtitles to see their definitions, and click or double-tap on them to add them to your flashcard deck. No need to manually pause the video so you don't miss anything--the app handles that for you. Close the definition pop-up and the video will resume automatically.

Besides the on-screen display, subtitles are also available in a scrollable list to the side of the video. This lets you easy navigate through lines of dialogue, so you can easily go back to hear what someone said, without finicking with awkward rewind/fast-forward controls.

#### Working without subtitles

For videos that do not have subtitles, the app can generate them automatically using speech recognition software. Since this requires a lot of processing power, this feature requires either a paid easyImmerse subscription or the use of a plugin. With the plugin, you can either provide an API key for a cloud speech recognition service or use a tool like OpenAI's Whisper running on your own computer.

But you don't need subtitles to use easyImmerse. You can look up words outside the subtitles view by pressing the lookup button and typing them in yourself, and you can add them to your flashcard deck as well.

### Ebook immersion

On opening an ebook or text file, the app shows an ebook reader specially designed for language learning. As with video subtitles, you can tap or hover over words to see their definitions, and click or double-tap on them to add them to your flashcard deck.

#### Making bilingual ebooks

If you happen to have a translation of your ebook, you can use the app to combine the two ebooks into a bilingual ebook. Since this requires a lot of processing power, this feature requires either a paid easyImmerse subscription or the use of a plugin.

### Audio immersion

On opening an audio file, the app shows an audio player with a waveform visualization of the audio track. Since audio files don't usually come bundled with subtitles, easyImmerse provides some features to help you supplement your audio with timed text.

#### Combining audio with transcripts / ebooks

There are several ways to get a transcript of your audio file. Podcasts often provide transcripts, and audiobooks are often available in ebook format. You can also generate a transcript from your audio file within easyImmerse using speech recognition software.

Once you have a transcript, you can load it into the app alongside your audio file, and after some processing, you'll be able to navigate through your audio by clicking sentences in your ebook or transcript. This operation requires a lot of processing power, so it requires either a paid easyImmerse subscription or the use of a plugin. With the plugin, you can either provide an API key for a cloud speech recognition service or use a tool like OpenAI's Whisper running on your own computer.

### Reviewing flashcards

After creating flashcards during your immersion, you'll want to periodically review them. To do this, you have several options.

#### Anki export

Anki is a free and open-source SRS app that is widely used by language learners. easyImmerse can export your flashcards to Anki, so you can review them on any device with the Anki app installed. Anki works on Windows, macOS, Linux, Android, and iOS, and is free on all platforms except iOS, where it costs a small one-time fee.

#### AnkiConnect

AnkiConnect is a plugin for Anki that allows other apps to communicate with it. easyImmerse can use AnkiConnect to send flashcards directly to Anki without having to export and import files manually.

#### easyImmerse SRS

For those who don't want to download another app, easyImmerse has its own built-in SRS system that allows you to review your flashcards directly within the app. This system isn't as full-featured as Anki, but it integrates proven SRS algorithms that help you review your flashcards at the right time to maximize retention.

Users who want to customize their review experience may want to switch to Anki later, so easyImmerse allows you to export your flashcards to Anki at any time.

### Setting up dictionaries

### Using plugins

#### Local subtitles generation and machine translation


