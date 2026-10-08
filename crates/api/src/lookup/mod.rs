//! Dictionary lookups at one or many positions of a text, sharing one set of storage queries.
//!
//! The single and the batch lookup routes both build their results here, so that they always agree.

mod batch_pools;
mod batch_response;
mod defining_dictionary_ids;
mod distinct;
mod group_by;
mod kanji_rows;
mod lookup_pool;
mod lookup_rows;
mod position_lookup;
mod term_rows;

pub use batch_pools::BatchPools;
pub use batch_response::{BatchLookupResponse, PositionLookups, TextLookups};
pub use defining_dictionary_ids::defining_dictionary_ids;
pub use lookup_pool::LookupPool;
pub use lookup_rows::LookupRows;
pub use position_lookup::PositionLookup;
