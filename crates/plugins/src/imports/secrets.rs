use easyimmerse_plugin_api::base::easyimmerse::plugin::secrets::Host;

use crate::host_state::HostState;

impl Host for HostState {
    fn get(&mut self, name: String) -> wasmtime::Result<Option<String>> {
        Ok(self.secrets.get(&name).cloned())
    }
}
