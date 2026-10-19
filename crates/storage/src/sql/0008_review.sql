-- The schedule of each flashcard that has been answered in the built-in review.
-- A flashcard without a row is a new card. The row is derived from the flashcard's latest row in `review_log`.
CREATE TABLE review_cards (
    flashcard_id TEXT PRIMARY KEY REFERENCES flashcards(id) ON DELETE CASCADE,
    project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    -- learning, review or relearning.
    state TEXT NOT NULL,
    due_at_ms INTEGER NOT NULL,
    stability REAL NOT NULL,
    difficulty REAL NOT NULL,
    interval_ms INTEGER NOT NULL,
    reps INTEGER NOT NULL,
    lapses INTEGER NOT NULL,
    learning_step INTEGER NOT NULL,
    last_reviewed_at_ms INTEGER NOT NULL
);

CREATE INDEX review_cards_by_due ON review_cards (project_id, due_at_ms);

-- Every answer, which the export turns into Anki's review log. Rows are only ever added, or removed by undoing the latest answer.
-- Each row also holds the card's schedule after the answer, from which undoing the next answer restores it.
CREATE TABLE review_log (
    answered_at_ms INTEGER NOT NULL,
    flashcard_id TEXT NOT NULL REFERENCES flashcards(id) ON DELETE CASCADE,
    project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    -- again, hard, good or easy.
    rating TEXT NOT NULL,
    -- The phase the card was answered in: learning, review or relearning.
    kind TEXT NOT NULL,
    elapsed_ms INTEGER NOT NULL,
    duration_ms INTEGER NOT NULL,
    stability REAL NOT NULL,
    difficulty REAL NOT NULL,
    interval_ms_before INTEGER NOT NULL,
    interval_ms_after INTEGER NOT NULL,
    desired_retention REAL NOT NULL,
    -- The phase the answer put the card in, and the rest of its schedule after the answer.
    state TEXT NOT NULL,
    due_at_ms INTEGER NOT NULL,
    reps INTEGER NOT NULL,
    lapses INTEGER NOT NULL,
    learning_step INTEGER NOT NULL,
    PRIMARY KEY (project_id, answered_at_ms)
);

CREATE INDEX review_log_by_flashcard ON review_log (flashcard_id, answered_at_ms);

-- The new cards and the reviews a project's review shows on a local day beyond the daily limits, as the user asked for.
CREATE TABLE review_day_allowances (
    project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    -- The local day, counted from the day that began at 4 a.m. on 1 January 1970.
    day_key INTEGER NOT NULL,
    extra_new_cards INTEGER NOT NULL,
    extra_reviews INTEGER NOT NULL,
    PRIMARY KEY (project_id, day_key)
);

-- The flashcards the user set aside from the review. A flashcard without a row is reviewed as its schedule says.
CREATE TABLE review_holds (
    flashcard_id TEXT PRIMARY KEY REFERENCES flashcards(id) ON DELETE CASCADE,
    project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    -- buried or suspended.
    kind TEXT NOT NULL,
    -- When a buried card's local day ends, after which the row no longer holds it. Null for a suspended card.
    until_ms INTEGER
);

-- The FSRS parameters fitted to the user's answers across every project. At most one row; without it the defaults schedule.
CREATE TABLE review_parameters (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    -- A JSON array of numbers. Null while the first fit runs, or when it failed.
    weights_json TEXT,
    fitted_at_ms INTEGER NOT NULL
);
