import { describe, expect, it } from "vitest";
import { actions } from "../app/appAction.ts";
import { stateAfter } from "../app/stateAfter.ts";
import { startNew } from "../flashcards/flashcardsTestSupport.ts";
import { exampleKeyPress } from "./exampleKeyPress.ts";
import { bindAction, bindCommand } from "./keyBinding.ts";
import { selectMediaKeyBinding } from "./selectMediaKeyBinding.ts";

const openM1 = actions.openMediaFileRequested("p1", "m1");
const onScreen = () => stateAfter(openM1);
const withPopup = () => stateAfter(openM1, actions.lookupSearchOpened());
const withExpandedPopup = () =>
  stateAfter(openM1, actions.lookupSearchOpened(), actions.lookupSizeToggled());

const playToggle = bindAction(actions.playToggleRequested());
const lookupClosed = bindAction(actions.lookupClosed());

describe("selectMediaKeyBinding", () => {
  it("plays and pauses on Space", () => {
    const press = exampleKeyPress(" ");
    expect(selectMediaKeyBinding(onScreen(), press)).toEqual(playToggle);
  });

  it("leaves Space to a focused control, which it presses", () => {
    const press = exampleKeyPress(" ", { focus: "control" });
    expect(selectMediaKeyBinding(onScreen(), press)).toBeNull();
  });

  it("plays and pauses on K", () => {
    const press = exampleKeyPress("k");
    expect(selectMediaKeyBinding(onScreen(), press)).toEqual(playToggle);
  });

  it("plays and pauses on K with Shift held", () => {
    const press = exampleKeyPress("K", { isShifted: true });
    expect(selectMediaKeyBinding(onScreen(), press)).toEqual(playToggle);
  });

  it("plays and pauses on K while a control has focus", () => {
    const press = exampleKeyPress("k", { focus: "control" });
    expect(selectMediaKeyBinding(onScreen(), press)).toEqual(playToggle);
  });

  it("skips back to the previous cue on the left arrow", () => {
    const press = exampleKeyPress("ArrowLeft");
    expect(selectMediaKeyBinding(onScreen(), press)).toEqual(
      bindCommand({ type: "skipCue", direction: "back" }),
    );
  });

  it("skips forward to the next cue on the right arrow", () => {
    const press = exampleKeyPress("ArrowRight");
    expect(selectMediaKeyBinding(onScreen(), press)).toEqual(
      bindCommand({ type: "skipCue", direction: "forward" }),
    );
  });

  it("skips cues on the arrows while a control, such as one in the dictionary pop-up, has focus", () => {
    const press = exampleKeyPress("ArrowRight", { focus: "control" });
    expect(selectMediaKeyBinding(withPopup(), press)).toEqual(
      bindCommand({ type: "skipCue", direction: "forward" }),
    );
  });

  it("replays the cue shown now on R", () => {
    const press = exampleKeyPress("r");
    expect(selectMediaKeyBinding(onScreen(), press)).toEqual(
      bindCommand({ type: "replayCue" }),
    );
  });

  it("mutes and unmutes on M", () => {
    const press = exampleKeyPress("m");
    expect(selectMediaKeyBinding(onScreen(), press)).toEqual(
      bindAction(actions.muteToggleRequested()),
    );
  });

  it("fills the screen on F", () => {
    const press = exampleKeyPress("f");
    expect(selectMediaKeyBinding(onScreen(), press)).toEqual(
      bindCommand({ type: "toggleFullscreen" }),
    );
  });

  it("looks up from the lookup cursor on L", () => {
    const press = exampleKeyPress("l");
    expect(selectMediaKeyBinding(onScreen(), press)).toEqual(
      bindAction(actions.lookupCursorLookedUp()),
    );
  });

  it("saves a flashcard from the lookup cursor on C", () => {
    const press = exampleKeyPress("c");
    expect(selectMediaKeyBinding(onScreen(), press)).toEqual(
      bindCommand({ type: "startFlashcardAtCursor", destination: "save" }),
    );
  });

  it("saves a flashcard from the lookup cursor on C while a card is open in the editor", () => {
    const press = exampleKeyPress("c");
    expect(
      selectMediaKeyBinding(stateAfter(openM1, startNew("f1")), press),
    ).toEqual(
      bindCommand({ type: "startFlashcardAtCursor", destination: "save" }),
    );
  });

  it("opens a flashcard from the lookup cursor in the editor on E", () => {
    const press = exampleKeyPress("e");
    expect(selectMediaKeyBinding(onScreen(), press)).toEqual(
      bindCommand({ type: "startFlashcardAtCursor", destination: "editor" }),
    );
  });

  it("leaves E alone while a card is open in the editor", () => {
    const press = exampleKeyPress("e");
    expect(
      selectMediaKeyBinding(stateAfter(openM1, startNew("f1")), press),
    ).toBeNull();
  });

  it("leaves J alone", () => {
    const press = exampleKeyPress("j");
    expect(selectMediaKeyBinding(onScreen(), press)).toBeNull();
  });

  describe("when a key is not free for its shortcut", () => {
    it("leaves a key that the focused element has handled", () => {
      const press = exampleKeyPress("ArrowRight", { isHandled: true });
      expect(selectMediaKeyBinding(onScreen(), press)).toBeNull();
    });

    it("leaves a key typed into a field", () => {
      const press = exampleKeyPress("k", { focus: "formField" });
      expect(selectMediaKeyBinding(onScreen(), press)).toBeNull();
    });

    it("leaves the arrows to an open menu", () => {
      const press = exampleKeyPress("ArrowRight", { focus: "menu" });
      expect(selectMediaKeyBinding(onScreen(), press)).toBeNull();
    });

    it("leaves M to an open menu", () => {
      const press = exampleKeyPress("m", { focus: "menu" });
      expect(selectMediaKeyBinding(onScreen(), press)).toBeNull();
    });

    it("leaves a key pressed with Ctrl or Cmd to the browser", () => {
      const press = exampleKeyPress("f", { hasCommandKey: true });
      expect(selectMediaKeyBinding(onScreen(), press)).toBeNull();
    });

    it("leaves a key pressed with Alt to the browser", () => {
      const press = exampleKeyPress("k", { hasAltKey: true });
      expect(selectMediaKeyBinding(onScreen(), press)).toBeNull();
    });
  });

  describe("on Escape", () => {
    it("closes the dictionary pop-up", () => {
      const press = exampleKeyPress("Escape");
      expect(selectMediaKeyBinding(withPopup(), press)).toEqual(lookupClosed);
    });

    it("makes an expanded pop-up compact", () => {
      const press = exampleKeyPress("Escape");
      expect(selectMediaKeyBinding(withExpandedPopup(), press)).toEqual(
        bindAction(actions.lookupSizeToggled()),
      );
    });

    it("closes the pop-up from its own field", () => {
      const press = exampleKeyPress("Escape", { focus: "formField" });
      expect(selectMediaKeyBinding(withPopup(), press)).toEqual(lookupClosed);
    });

    it("closes the pop-up even after a focused word has handled the key", () => {
      const press = exampleKeyPress("Escape", { isHandled: true });
      expect(selectMediaKeyBinding(withPopup(), press)).toEqual(lookupClosed);
    });

    it("leaves the key to the browser while the pop-up is closed", () => {
      const press = exampleKeyPress("Escape");
      expect(selectMediaKeyBinding(onScreen(), press)).toBeNull();
    });
  });

  describe("while the screen is covered", () => {
    it("leaves every key alone beneath Settings", () => {
      const app = stateAfter(openM1, actions.settingsRequested());
      expect(selectMediaKeyBinding(app, exampleKeyPress("k"))).toBeNull();
    });

    it("leaves Escape to Settings while the pop-up is open beneath them", () => {
      const app = stateAfter(
        openM1,
        actions.lookupSearchOpened(),
        actions.settingsRequested(),
      );
      expect(selectMediaKeyBinding(app, exampleKeyPress("Escape"))).toBeNull();
    });

    it("leaves every key alone under a modal dialog", () => {
      const press = exampleKeyPress("k", { isDialogOpen: true });
      expect(selectMediaKeyBinding(onScreen(), press)).toBeNull();
    });
  });
});
