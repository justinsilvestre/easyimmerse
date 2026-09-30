use easyimmerse_plugin_api::base::easyimmerse::plugin::fs::Host;
use easyimmerse_plugin_api::base::easyimmerse::plugin::types::PluginError;

use crate::host_state::HostState;
use crate::imports::to_guest_error;

impl Host for HostState {
    fn read_file(&mut self, path: String) -> wasmtime::Result<Result<Vec<u8>, PluginError>> {
        let resolved = match self.grants.resolve_granted_path(&path) {
            Ok(resolved) => resolved,
            Err(error) => return Ok(Err(to_guest_error(error))),
        };
        Ok(std::fs::read(resolved).map_err(|error| PluginError::Io(error.to_string())))
    }

    fn write_file(
        &mut self,
        path: String,
        contents: Vec<u8>,
    ) -> wasmtime::Result<Result<(), PluginError>> {
        let resolved = match self.grants.resolve_granted_path(&path) {
            Ok(resolved) => resolved,
            Err(error) => return Ok(Err(to_guest_error(error))),
        };
        Ok(std::fs::write(resolved, contents).map_err(|error| PluginError::Io(error.to_string())))
    }
}
