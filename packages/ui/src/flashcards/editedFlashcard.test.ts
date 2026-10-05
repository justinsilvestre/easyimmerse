import type { Flashcard, FlashcardDraft } from "@easyimmerse/types";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createCardSession,
  createFlashcardId,
  type EditedFlashcard,
  type EditedFlashcardAction,
  flashcardsOnWaveform,
  newFlashcardSegmentId,
  reduceEditedFlashcard,
  segmentIdOf,
} from "./editedFlashcard.ts";
import { exampleFlashcard } from "./exampleFlashcard.ts";

function createFlashcard(id: string): Flashcard {
  return {
    id,
    project_id: "p1",
    media_file_id: "m1",
    cue_index: null,
    content: exampleFlashcard,
    included_fields: ["word"],
    created_at_ms: 0,
    updated_at_ms: 0,
  };
}

function createDraft(): FlashcardDraft {
  return {
    media_file_id: "m1",
    cue_index: 1,
    content: { ...exampleFlashcard, word: "Katze" },
    included_fields: ["word", "tags"],
  };
}

function openedFlashcard(flashcard = createFlashcard("f1")): EditedFlashcard {
  const opened = reduceEditedFlashcard(null, {
    type: "opened",
    flashcard,
    session: createCardSession(),
  });
  if (opened === null) throw new Error("The flashcard did not open.");
  return opened;
}

const movedClip = { start_ms: 1000, end_ms: 3000 };

describe("reduceEditedFlashcard", () => {
  it("gives a started card the session its action carries", () => {
    const session = createCardSession();
    expect(
      reduceEditedFlashcard(null, {
        type: "started",
        flashcardId: createFlashcardId(),
        draft: createDraft(),
        session,
      })?.session,
    ).toBe(session);
  });

  it("gives an opened card the session its action carries", () => {
    const session = createCardSession();
    expect(
      reduceEditedFlashcard(null, {
        type: "opened",
        flashcard: createFlashcard("f1"),
        session,
      })?.session,
    ).toBe(session);
  });

  it("starts editing a draft with its content", () => {
    const edited = reduceEditedFlashcard(null, {
      type: "started",
      flashcardId: createFlashcardId(),
      session: createCardSession(),
      draft: createDraft(),
    });
    expect(edited?.editor.content.word).toBe("Katze");
  });

  it("starts editing a draft with its included fields", () => {
    const edited = reduceEditedFlashcard(null, {
      type: "started",
      flashcardId: createFlashcardId(),
      session: createCardSession(),
      draft: createDraft(),
    });
    expect(edited?.editor.includedFields).toEqual(["word", "tags"]);
  });

  it("opens a saved flashcard with its content", () => {
    expect(openedFlashcard().editor.content).toEqual(exampleFlashcard);
  });

  it("applies an editor action to the open flashcard", () => {
    const edited = reduceEditedFlashcard(openedFlashcard(), {
      type: "edited",
      action: { type: "clipChanged", clip: movedClip },
    });
    expect(edited?.editor.content.audio_context).toEqual(movedClip);
  });

  it("ignores an editor action while no flashcard is open", () => {
    const edited = reduceEditedFlashcard(null, {
      type: "edited",
      action: { type: "clipChanged", clip: movedClip },
    });
    expect(edited).toBeNull();
  });

  it("closes the open flashcard", () => {
    expect(
      reduceEditedFlashcard(openedFlashcard(), { type: "closed" }),
    ).toBeNull();
  });
});

describe("segmentIdOf", () => {
  it("gives a saved flashcard its own id", () => {
    expect(segmentIdOf(openedFlashcard())).toBe("f1");
  });

  it("gives a new flashcard the id reserved for it", () => {
    const edited = reduceEditedFlashcard(null, {
      type: "started",
      flashcardId: createFlashcardId(),
      session: createCardSession(),
      draft: createDraft(),
    });
    expect(edited && segmentIdOf(edited)).toBe(newFlashcardSegmentId);
  });
});

describe("flashcardsOnWaveform", () => {
  it("draws the saved flashcards while none is open", () => {
    const flashcards = [createFlashcard("f1"), createFlashcard("f2")];
    expect(flashcardsOnWaveform(flashcards, null)).toEqual([
      { id: "f1", content: exampleFlashcard },
      { id: "f2", content: exampleFlashcard },
    ]);
  });

  it("draws the open flashcard with its unsaved content", () => {
    const edited = reduceEditedFlashcard(openedFlashcard(), {
      type: "edited",
      action: { type: "clipChanged", clip: movedClip },
    });
    expect(
      flashcardsOnWaveform([createFlashcard("f1")], edited)[0]?.content
        .audio_context,
    ).toEqual(movedClip);
  });

  it("draws a new flashcard after the saved ones", () => {
    const edited = reduceEditedFlashcard(null, {
      type: "started",
      flashcardId: createFlashcardId(),
      session: createCardSession(),
      draft: createDraft(),
    });
    expect(
      flashcardsOnWaveform([createFlashcard("f1")], edited).map(({ id }) => id),
    ).toEqual(["f1", newFlashcardSegmentId]);
  });
});

describe("reduceEditedFlashcard on screenshotsAvailable", () => {
  const startDraft = (content: Partial<FlashcardDraft["content"]>) =>
    reduceEditedFlashcard(null, {
      type: "started",
      flashcardId: createFlashcardId(),
      session: createCardSession(),
      draft: {
        ...createDraft(),
        content: { ...createDraft().content, ...content },
      },
    });

  it("gives a new flashcard without a screenshot one from the middle of its clip", () => {
    const started = startDraft({ audio_context: movedClip, screenshot: null });
    const edited = reduceEditedFlashcard(started, {
      type: "screenshotsAvailable",
    });
    expect(edited?.editor.content.screenshot).toEqual({ at_ms: 2000 });
  });

  it("keeps a new flashcard's screenshot where it is", () => {
    const started = startDraft({
      audio_context: movedClip,
      screenshot: { at_ms: 2900 },
    });
    const edited = reduceEditedFlashcard(started, {
      type: "screenshotsAvailable",
    });
    expect(edited?.editor.content.screenshot).toEqual({ at_ms: 2900 });
  });

  it("gives no screenshot to a new flashcard without a clip", () => {
    const started = startDraft({ audio_context: null, screenshot: null });
    const edited = reduceEditedFlashcard(started, {
      type: "screenshotsAvailable",
    });
    expect(edited?.editor.content.screenshot).toBeNull();
  });

  it("leaves a saved flashcard as it is", () => {
    const opened = openedFlashcard({
      ...createFlashcard("f1"),
      content: { ...exampleFlashcard, screenshot: null },
    });
    expect(
      reduceEditedFlashcard(opened, { type: "screenshotsAvailable" }),
    ).toBe(opened);
  });
});

function startedFrom(draft: FlashcardDraft) {
  return reduceEditedFlashcard(null, {
    type: "started",
    flashcardId: createFlashcardId(),
    draft,
    session: createCardSession(),
  });
}

function awaiting(draft: FlashcardDraft) {
  return reduceEditedFlashcard(null, {
    type: "started",
    flashcardId: createFlashcardId(),
    session: createCardSession(),
    draft,
    awaitsLookup: true,
  });
}

/** The fields of a lookup that answered late. */
const fields = {
  word: "Katze",
  word_pronunciation: "ˈkat͡sə",
  l1_definition: "cat",
  l2_definition: "Haustier",
};

/** Applies the actions in turn. */
function reduceAll(
  edited: EditedFlashcard | null,
  ...actions: EditedFlashcardAction[]
) {
  return actions.reduce(reduceEditedFlashcard, edited);
}

describe("reduceEditedFlashcard on lookupAnswered", () => {
  it("fills the fields of the new flashcard it was made for", () => {
    const draft = createDraft();
    const edited = reduceEditedFlashcard(awaiting(draft), {
      type: "lookupAnswered",
      draft,
      fields,
    });
    expect(edited?.editor.content.l1_definition).toBe("cat");
  });

  it("leaves alone a field the user has typed in", () => {
    const draft = createDraft();
    const typed = reduceEditedFlashcard(awaiting(draft), {
      type: "edited",
      action: { type: "textChanged", key: "l1_definition", value: "kitty" },
    });
    const edited = reduceEditedFlashcard(typed, {
      type: "lookupAnswered",
      draft,
      fields,
    });
    expect(edited?.editor.content.l1_definition).toBe("kitty");
  });

  it("leaves alone a field the user has emptied", () => {
    const draft = createDraft();
    const typed = reduceEditedFlashcard(awaiting(draft), {
      type: "edited",
      action: { type: "textChanged", key: "word", value: "" },
    });
    const edited = reduceEditedFlashcard(typed, {
      type: "lookupAnswered",
      draft,
      fields,
    });
    expect(edited?.editor.content.word).toBe("");
  });

  it("replaces the word the user has not typed in, as with a dictionary form", () => {
    const draft = {
      ...createDraft(),
      content: { ...createDraft().content, word: "食べた" },
    };
    const edited = reduceEditedFlashcard(awaiting(draft), {
      type: "lookupAnswered",
      draft,
      fields: { ...fields, word: "食べる" },
    });
    expect(edited?.editor.content.word).toBe("食べる");
  });

  it("ignores an answer for another flashcard", () => {
    const edited = awaiting(createDraft());
    expect(
      reduceEditedFlashcard(edited, {
        type: "lookupAnswered",
        draft: createDraft(),
        fields,
      }),
    ).toBe(edited);
  });
});

describe("reduceEditedFlashcard on its way to being saved", () => {
  it("readies a card to send when Save is pressed", () => {
    const edited = reduceAll(startedFrom(createDraft()), {
      type: "saveRequested",
    });
    expect(edited?.stage).toBe("readyToSend");
  });

  it("readies an existing card to send when Save is pressed", () => {
    const edited = reduceAll(openedFlashcard(), { type: "saveRequested" });
    expect(edited?.stage).toBe("readyToSend");
  });

  it("makes a save wait for a lookup that has yet to answer", () => {
    const edited = reduceAll(awaiting(createDraft()), {
      type: "saveRequested",
    });
    expect(edited?.stage).toBe("awaitingLookupToSave");
  });

  it("readies a waiting save to send once the lookup answers", () => {
    const draft = createDraft();
    const edited = reduceAll(
      awaiting(draft),
      { type: "saveRequested" },
      { type: "lookupAnswered", draft, fields },
    );
    expect(edited?.stage).toBe("readyToSend");
  });

  it("readies a waiting save to send once the lookup fails", () => {
    const draft = createDraft();
    const edited = reduceAll(
      awaiting(draft),
      { type: "saveRequested" },
      { type: "lookupFailed", draft },
    );
    expect(edited?.stage).toBe("readyToSend");
  });

  it("keeps waiting when another card's lookup answers", () => {
    const edited = reduceAll(
      awaiting(createDraft()),
      { type: "saveRequested" },
      { type: "lookupAnswered", draft: createDraft(), fields },
    );
    expect(edited?.stage).toBe("awaitingLookupToSave");
  });

  it("keeps waiting when another card's lookup fails", () => {
    const edited = reduceAll(
      awaiting(createDraft()),
      { type: "saveRequested" },
      { type: "lookupFailed", draft: createDraft() },
    );
    expect(edited?.stage).toBe("awaitingLookupToSave");
  });

  it("ignores Save pressed again while the card is being sent", () => {
    const sending = reduceAll(
      startedFrom(createDraft()),
      { type: "saveRequested" },
      { type: "sendStarted" },
    );
    expect(reduceAll(sending, { type: "saveRequested" })).toBe(sending);
  });

  it("fills nothing from an answer that arrives while the card is being sent", () => {
    const draft = createDraft();
    const sending = reduceAll(
      awaiting(draft),
      { type: "saveRequested" },
      { type: "lookupFailed", draft },
      { type: "sendStarted" },
    );
    expect(reduceAll(sending, { type: "lookupAnswered", draft, fields })).toBe(
      sending,
    );
  });

  /** Sends the card that `edited` holds, returning it as it is while being sent. */
  function sendingFrom(edited: EditedFlashcard | null) {
    return reduceAll(
      edited,
      { type: "saveRequested" },
      { type: "sendStarted" },
    );
  }

  const sessionOf = (edited: EditedFlashcard | null) => {
    if (edited === null) throw new Error("No flashcard is open.");
    return edited.session;
  };

  it("closes the card once it is saved", () => {
    const sending = sendingFrom(startedFrom(createDraft()));
    expect(
      reduceAll(sending, { type: "saved", session: sessionOf(sending) }),
    ).toBeNull();
  });

  it("leaves open a card started after the one that was saved", () => {
    const sending = sendingFrom(startedFrom(createDraft()));
    const later = reduceAll(sending, {
      type: "started",
      flashcardId: createFlashcardId(),
      draft: createDraft(),
      session: createCardSession(),
    });
    expect(
      reduceAll(later, { type: "saved", session: sessionOf(sending) }),
    ).toBe(later);
  });

  it("leaves open a saved card reopened while an earlier save of it was under way", () => {
    const flashcard = createFlashcard("f1");
    const sending = sendingFrom(
      reduceEditedFlashcard(null, {
        type: "opened",
        flashcard,
        session: createCardSession(),
      }),
    );
    const reopened = reduceAll(sending, {
      type: "opened",
      flashcard,
      session: createCardSession(),
    });
    expect(
      reduceAll(reopened, { type: "saved", session: sessionOf(sending) }),
    ).toBe(reopened);
  });

  it("ignores edits while a save waits for the lookup", () => {
    const waiting = reduceAll(awaiting(createDraft()), {
      type: "saveRequested",
    });
    expect(
      reduceAll(waiting, {
        type: "edited",
        action: { type: "textChanged", key: "word", value: "飲む" },
      }),
    ).toBe(waiting);
  });

  it("adds no screenshot while the card is being sent, since the save under way would not hold it", () => {
    const draft = {
      ...createDraft(),
      content: {
        ...createDraft().content,
        screenshot: null,
        audio_context: { start_ms: 0, end_ms: 1000 },
      },
    };
    const sending = reduceAll(
      startedFrom(draft),
      { type: "saveRequested" },
      { type: "sendStarted" },
    );
    expect(reduceAll(sending, { type: "screenshotsAvailable" })).toBe(sending);
  });

  it("ignores edits while the card is being sent", () => {
    const sending = reduceAll(
      startedFrom(createDraft()),
      { type: "saveRequested" },
      { type: "sendStarted" },
    );
    expect(
      reduceAll(sending, {
        type: "edited",
        action: { type: "textChanged", key: "l1_definition", value: "late" },
      }),
    ).toBe(sending);
  });

  it("lets the user edit again once a save fails", () => {
    const sending = sendingFrom(startedFrom(createDraft()));
    const edited = reduceAll(sending, {
      type: "saveFailed",
      session: sessionOf(sending),
    });
    expect(edited?.stage).toBe("editing");
  });
});

describe("reduceEditedFlashcard when the word is changed before its lookup answers", () => {
  const typeWord = (word: string): EditedFlashcardAction => ({
    type: "edited",
    action: { type: "textChanged", key: "word", value: word },
  });

  it("stops awaiting the lookup", () => {
    const edited = reduceAll(awaiting(createDraft()), typeWord("飲む"));
    expect(edited?.stage).toBe("editing");
  });

  it("lets Save send at once afterwards", () => {
    const edited = reduceAll(awaiting(createDraft()), typeWord("飲む"), {
      type: "saveRequested",
    });
    expect(edited?.stage).toBe("readyToSend");
  });

  it("fills nothing from the answer that arrives afterwards", () => {
    const draft = createDraft();
    const edited = reduceAll(awaiting(draft), typeWord("飲む"), {
      type: "lookupAnswered",
      draft,
      fields,
    });
    expect(edited?.editor.content.l1_definition).toBe(
      createDraft().content.l1_definition,
    );
  });

  it("keeps awaiting the lookup when another field is typed in", () => {
    const edited = reduceAll(awaiting(createDraft()), {
      type: "edited",
      action: { type: "textChanged", key: "l1_definition", value: "to eat" },
    });
    expect(edited?.stage).toBe("awaitingLookup");
  });
});

describe("reduceEditedFlashcard's record of the user's changes", () => {
  const typeDefinition: EditedFlashcardAction = {
    type: "edited",
    action: { type: "textChanged", key: "l1_definition", value: "a pet" },
  };

  it("starts a new card unchanged", () => {
    expect(startedFrom(createDraft())?.isChanged).toBe(false);
  });

  it("marks a card changed once the user edits it", () => {
    expect(
      reduceAll(startedFrom(createDraft()), typeDefinition)?.isChanged,
    ).toBe(true);
  });

  it("marks a saved card changed once the user edits it", () => {
    expect(reduceAll(openedFlashcard(), typeDefinition)?.isChanged).toBe(true);
  });

  it("leaves a card unchanged when the lookup fills it", () => {
    const draft = createDraft();
    expect(
      reduceAll(awaiting(draft), { type: "lookupAnswered", draft, fields })
        ?.isChanged,
    ).toBe(false);
  });
});

describe("reduceEditedFlashcard on restored", () => {
  const typeDefinition: EditedFlashcardAction = {
    type: "edited",
    action: { type: "textChanged", key: "l1_definition", value: "a pet" },
  };

  function restore(card: EditedFlashcard | null) {
    if (card === null) throw new Error("No flashcard to restore.");
    return reduceAll(startedFrom(createDraft()), {
      type: "restored",
      card,
      session: createCardSession(),
    });
  }

  it("puts the card back with its edits", () => {
    const changed = reduceAll(startedFrom(createDraft()), typeDefinition);
    expect(restore(changed)?.editor.content.l1_definition).toBe("a pet");
  });

  it("opens the card for editing again", () => {
    const sending = reduceAll(
      startedFrom(createDraft()),
      typeDefinition,
      { type: "saveRequested" },
      { type: "sendStarted" },
    );
    expect(restore(sending)?.stage).toBe("editing");
  });

  it("gives the card the session its action carries", () => {
    const changed = reduceAll(startedFrom(createDraft()), typeDefinition);
    if (changed === null) throw new Error("No flashcard to restore.");
    const session = createCardSession();
    expect(
      reduceAll(null, { type: "restored", card: changed, session })?.session,
    ).toBe(session);
  });
});

describe("createFlashcardId", () => {
  afterEach(() => vi.restoreAllMocks());

  it("makes 32 lowercase hexadecimal digits without crypto.randomUUID, which needs a secure context", () => {
    vi.spyOn(crypto, "randomUUID").mockImplementation(() => {
      throw new Error("crypto.randomUUID needs a secure context");
    });
    expect(createFlashcardId()).toMatch(/^[0-9a-f]{32}$/);
  });
});
