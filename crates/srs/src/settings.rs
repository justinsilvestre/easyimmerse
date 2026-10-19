//! The fixed scheduling settings. The review has nothing to configure; a user who wants to tune them exports to Anki.

pub const MINUTE_MS: u64 = 60_000;
pub const DAY_MS: u64 = 86_400_000;

/// The chance of remembering a card when it comes due that FSRS chooses intervals for.
pub const DESIRED_RETENTION: f64 = 0.90;
/// The longest interval, in days, as in Anki.
pub const MAX_INTERVAL_DAYS: u32 = 36_500;
/// The one learning step of a new card, and the one relearning step of a forgotten card.
pub const STEP_MS: u64 = 10 * MINUTE_MS;
/// How long before it is due a learning card may be shown when nothing else waits.
pub const LEARN_AHEAD_MS: u64 = 20 * MINUTE_MS;
pub const NEW_CARDS_PER_DAY: u64 = 20;
/// The most reviews a day shows unless the user asks for more, as in Anki. Reviews due beyond it wait for later days,
/// which spreads a backlog over several of them, and no new cards are introduced while any wait.
pub const REVIEWS_PER_DAY: u64 = 200;
/// The number of times the user forgets a card under review that makes it a leech, as in Anki.
pub const LEECH_LAPSES: u32 = 8;
/// Answer durations are capped as Anki caps them, since a longer one means the user stepped away.
pub const MAX_ANSWER_DURATION_MS: u64 = 60_000;
