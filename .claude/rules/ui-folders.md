---
paths:
  - "packages/ui/src/**"
---

# UI folders

A file's folder tells where in the app it appears. Place a file by the screens that use it, not by the topic it seems to belong to.

- `screens/<screen>/` holds one screen: its route-level component, its `*View`, and every piece that only this screen uses. A screen reached by more than one route, such as the project form for a new project and for an existing one, is one folder.
- `layout/` holds what wraps every screen: `ScreenLayout`, the header with its Profile menu, and the footer with its Sync menu and activities, along with what only these use.
- `components/<component>/` holds a component used on several screens, such as the dictionary pop-up or the media player, with everything that serves it. Components with closely related purposes that share many dependencies, such as the pieces that display a flashcard, may share one folder.
- `components/common/` holds general-purpose components only: pieces like `Button` or `ModalDialog` that serve no particular feature.
- `lib/` holds code with no components that several screens or components use. Files in a group, such as `lib/formatting/`, get a subfolder; others sit at the top of `lib/`.
- The top of `src/` holds the app's wiring: the entry point, the screen router, the React contexts, and the hooks that bind components to the store.
- `storybook/` and `testSupport/` hold tooling for stories and tests.

A piece shared by a few screens goes in a folder named for what it is, never in one of those screens' folders. When a file comes to be used on a second screen, move it out of the first screen's folder. When a shared file comes to be used by only one screen, move it into that screen's folder.

Do not create a folder for a single file, and do not group files by their kind, as a `hooks/` or `types/` folder would.

A story's title follows its folder, with each folder name written out in words, then the component's name: `Screens/Project Settings/ProjectForm`, `Layout/SyncMenu`, `Components/Dictionary Pop-up/DictionaryPopup`, `Components/Common/Button`.
