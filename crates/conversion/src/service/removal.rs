//! Removing cache files without disturbing the conversions in use.

use std::collections::HashSet;
use std::time::Duration;

use super::ConversionService;
use crate::cache_trash::{CacheTrash, Removal};
use crate::error::ConversionError;
use crate::key::ConversionKey;

/// How long after its last request a conversion stays in use, so that a paused player can resume without converting again.
const IN_USE_WINDOW: Duration = Duration::from_secs(10 * 60);

impl ConversionService {
    /// Finds removals and carries out those whose conversions are not in use, on a thread where blocking is allowed.
    /// Returns how many were carried out.
    pub(super) async fn remove(
        &self,
        find: impl FnOnce() -> std::io::Result<Vec<Removal>> + Send + 'static,
    ) -> Result<usize, ConversionError> {
        let service = self.clone();
        let removed = tokio::task::spawn_blocking(move || {
            let removals = find()?;
            service.carry_out(&removals)
        });
        Ok(removed.await??)
    }

    fn carry_out(&self, removals: &[Removal]) -> std::io::Result<usize> {
        let mut trash = CacheTrash::open(&self.inner.cache_dir)?;
        let mut removed = 0;
        for removal in removals {
            let mut move_paths = || {
                removal
                    .paths
                    .iter()
                    .try_for_each(|path| trash.move_in(path))
            };
            if self.unless_in_use(removal.key.as_ref(), &mut move_paths)? {
                removed += 1;
            }
        }
        trash.empty()?;
        Ok(removed)
    }

    /// Runs `action` unless the conversion under `key` is registered and in use.
    /// Holds the registry meanwhile, so that no request can start using the conversion until `action` finishes.
    /// Returns whether `action` ran.
    fn unless_in_use(
        &self,
        key: Option<&ConversionKey>,
        action: &mut dyn FnMut() -> std::io::Result<()>,
    ) -> std::io::Result<bool> {
        let conversions = self.conversions();
        let Some(conversion) = key.and_then(|key| conversions.get(key)) else {
            return action().map(|()| true);
        };
        let outcome = conversion.unless_in_use(IN_USE_WINDOW, action);
        outcome.transpose().map(|ran| ran.is_some())
    }

    pub(super) fn keys_in_use(&self) -> HashSet<ConversionKey> {
        let conversions = self.conversions();
        let in_use = conversions
            .iter()
            .filter(|(_, conversion)| conversion.is_in_use(IN_USE_WINDOW));
        in_use.map(|(key, _)| key.clone()).collect()
    }
}
