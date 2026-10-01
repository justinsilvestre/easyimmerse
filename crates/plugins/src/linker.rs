use easyimmerse_plugin_api::base::PluginBase;
use wasmtime::Engine;
use wasmtime::component::{HasSelf, Linker};

use crate::error::PluginError;
use crate::host_state::HostState;

/// Builds a linker offering WASI 0.2 and the five `easyimmerse:plugin` host
/// interfaces. Every plugin world is linked against this same set.
pub fn new_linker(engine: &Engine) -> Result<Linker<HostState>, PluginError> {
    let mut linker = Linker::new(engine);
    wasmtime_wasi::p2::add_to_linker_sync(&mut linker)?;
    PluginBase::add_to_linker::<HostState, HasSelf<HostState>>(&mut linker, |state| state)?;
    Ok(linker)
}
