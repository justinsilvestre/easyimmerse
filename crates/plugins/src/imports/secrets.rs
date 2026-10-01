use easyimmerse_plugin_api::base::easyimmerse::plugin::secrets::Host;

use crate::host_state::HostState;

impl Host for HostState {
    fn get(&mut self, name: String) -> wasmtime::Result<Option<String>> {
        Ok(self.grants.setting_values.get(&name).cloned())
    }
}

#[cfg(test)]
mod tests {
    use std::collections::HashMap;

    use super::*;
    use crate::grants::CapabilityGrants;

    fn state_with_setting(key: &str, value: &str) -> HostState {
        HostState::new(CapabilityGrants {
            setting_values: HashMap::from([(key.to_string(), value.to_string())]),
            ..CapabilityGrants::default()
        })
    }

    #[test]
    fn returns_the_value_the_user_entered_for_a_setting() {
        let mut state = state_with_setting("api_key", "k-123");
        assert_eq!(
            state.get("api_key".to_string()).unwrap(),
            Some("k-123".to_string())
        );
    }

    #[test]
    fn returns_none_for_an_unknown_setting() {
        let mut state = state_with_setting("api_key", "k-123");
        assert_eq!(state.get("other".to_string()).unwrap(), None);
    }
}
