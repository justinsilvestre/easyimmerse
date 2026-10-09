//! Plugin components compiled once per process and shared by every call to the plugin.

use std::collections::HashMap;
use std::sync::{Arc, Mutex, OnceLock, PoisonError};

use easyimmerse_plugins::{CompiledPlugin, ExecutionMode, PluginError, PluginPackage, sha256_hex};

/// Identifies one compiled component: the digest of the `plugin.wasm` bytes it was compiled
/// from and the name of the execution mode it was compiled for. A changed component has a
/// new digest, so it is never served from an older compile.
type CompileKey = (String, &'static str);

/// The slot holding the value compiled for one key, empty until a compile succeeds.
type CompileSlot<T> = Arc<Mutex<Option<Arc<T>>>>;

/// The compiled component of `package` for `mode`, compiled on the first call and reused
/// by every later call while `plugin.wasm` keeps the same bytes.
pub fn compiled_plugin(
    package: &PluginPackage,
    mode: ExecutionMode,
) -> Result<Arc<CompiledPlugin>, PluginError> {
    static CACHE: OnceLock<CompileCache<CompiledPlugin>> = OnceLock::new();
    let bytes = package.read_component()?;
    CACHE
        .get_or_init(CompileCache::default)
        .get_or_compile_bytes(&bytes, mode.name(), |bytes| {
            CompiledPlugin::from_bytes(bytes, mode)
        })
}

/// Values compiled at most once per key.
pub struct CompileCache<T> {
    slots: Mutex<HashMap<CompileKey, CompileSlot<T>>>,
}

impl<T> Default for CompileCache<T> {
    fn default() -> Self {
        Self {
            slots: Mutex::new(HashMap::new()),
        }
    }
}

impl<T> CompileCache<T> {
    /// The value compiled from `bytes` for the execution mode named `mode`, compiling it with
    /// `compile` when no earlier call has.
    pub fn get_or_compile_bytes<E>(
        &self,
        bytes: &[u8],
        mode: &'static str,
        compile: impl FnOnce(&[u8]) -> Result<T, E>,
    ) -> Result<Arc<T>, E> {
        self.get_or_compile((sha256_hex(bytes), mode), || compile(bytes))
    }

    /// The value stored under `key`, or the result of `compile` once it succeeds. Two first
    /// calls with the same key compile only once, while calls with other keys do not wait.
    pub fn get_or_compile<E>(
        &self,
        key: CompileKey,
        compile: impl FnOnce() -> Result<T, E>,
    ) -> Result<Arc<T>, E> {
        let slot = self.slot(key);
        let mut value = slot.lock().unwrap_or_else(PoisonError::into_inner);
        if let Some(value) = value.as_ref() {
            return Ok(Arc::clone(value));
        }
        let compiled = Arc::new(compile()?);
        *value = Some(Arc::clone(&compiled));
        Ok(compiled)
    }

    fn slot(&self, key: CompileKey) -> CompileSlot<T> {
        let mut slots = self.slots.lock().unwrap_or_else(PoisonError::into_inner);
        Arc::clone(slots.entry(key).or_default())
    }
}

#[cfg(test)]
mod tests {
    use std::cell::Cell;
    use std::sync::mpsc;
    use std::time::Duration;

    use super::*;

    fn key(digest: &str) -> CompileKey {
        (digest.to_string(), "native")
    }

    fn compile_twice(cache: &CompileCache<u32>, first: &str, second: &str) -> u32 {
        let compiles = Cell::new(0);
        let compile = || {
            compiles.set(compiles.get() + 1);
            Ok::<_, ()>(0)
        };
        cache.get_or_compile(key(first), compile).unwrap();
        cache.get_or_compile(key(second), compile).unwrap();
        compiles.get()
    }

    #[test]
    fn compiles_once_for_two_calls_with_the_same_key() {
        let cache = CompileCache::default();
        assert_eq!(compile_twice(&cache, "abc", "abc"), 1);
    }

    #[test]
    fn compiles_again_for_a_changed_digest() {
        let cache = CompileCache::default();
        assert_eq!(compile_twice(&cache, "abc", "def"), 2);
    }

    #[test]
    fn returns_the_stored_value_to_a_second_call() {
        let cache = CompileCache::default();
        let first = cache.get_or_compile(key("abc"), || Ok::<_, ()>(1)).unwrap();
        let second = cache.get_or_compile(key("abc"), || Ok::<_, ()>(2)).unwrap();
        assert!(Arc::ptr_eq(&first, &second));
    }

    #[test]
    fn compiles_again_after_a_failed_compile() {
        let cache = CompileCache::<u32>::default();
        let _ = cache.get_or_compile(key("abc"), || Err(()));
        assert_eq!(
            cache.get_or_compile(key("abc"), || Ok::<_, ()>(1)),
            Ok(Arc::new(1))
        );
    }

    #[test]
    fn compiles_the_new_bytes_after_a_rebuild() {
        let cache = CompileCache::default();
        let compile = |bytes: &[u8]| Ok::<_, ()>(bytes.to_vec());
        cache
            .get_or_compile_bytes(b"old", "native", compile)
            .unwrap();
        let rebuilt = cache.get_or_compile_bytes(b"new", "native", compile);
        assert_eq!(rebuilt, Ok(Arc::new(b"new".to_vec())));
    }

    #[test]
    fn answers_a_cached_key_while_another_key_compiles() {
        let cache = &CompileCache::default();
        cache
            .get_or_compile(key("cached"), || Ok::<_, ()>(1))
            .unwrap();
        let (started, wait_for_start) = mpsc::channel();
        let (release, wait_for_release) = mpsc::channel::<()>();
        let (answer, wait_for_answer) = mpsc::channel();
        let answered = std::thread::scope(|scope| {
            scope.spawn(move || {
                cache.get_or_compile(key("slow"), || {
                    started.send(()).unwrap();
                    wait_for_release.recv().unwrap();
                    Ok::<_, ()>(2)
                })
            });
            wait_for_start.recv().unwrap();
            scope.spawn(move || answer.send(cache.get_or_compile(key("cached"), || Err(()))));
            let answered = wait_for_answer.recv_timeout(Duration::from_secs(1)).ok();
            release.send(()).unwrap();
            answered
        });
        assert_eq!(answered, Some(Ok(Arc::new(1))));
    }

    #[test]
    fn shares_compiled_plugins_across_threads() {
        fn assert_send_sync<T: Send + Sync>() {}
        assert_send_sync::<CompileCache<CompiledPlugin>>();
    }
}
