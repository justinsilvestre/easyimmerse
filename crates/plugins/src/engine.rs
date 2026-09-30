use wasmtime::{Config, Engine};

use crate::error::PluginError;
use crate::execution_mode::ExecutionMode;

/// Builds an engine with fuel metering and the component model enabled.
pub fn build_engine(mode: ExecutionMode) -> Result<Engine, PluginError> {
    let mut config = Config::new();
    config.consume_fuel(true).wasm_component_model(true);
    if mode == ExecutionMode::Interpreter {
        configure_interpreter(&mut config)?;
    }
    Ok(Engine::new(&config)?)
}

#[cfg(feature = "interpreter")]
fn configure_interpreter(config: &mut Config) -> Result<(), PluginError> {
    config.target(pulley_target())?;
    Ok(())
}

#[cfg(not(feature = "interpreter"))]
fn configure_interpreter(_config: &mut Config) -> Result<(), PluginError> {
    Err(PluginError::InterpreterUnavailable)
}

/// The Pulley target triple matching the host's pointer width and byte order.
#[cfg(feature = "interpreter")]
fn pulley_target() -> &'static str {
    match (
        cfg!(target_pointer_width = "64"),
        cfg!(target_endian = "big"),
    ) {
        (true, false) => "pulley64",
        (true, true) => "pulley64be",
        (false, false) => "pulley32",
        (false, true) => "pulley32be",
    }
}

#[cfg(test)]
mod tests {
    use super::build_engine;
    use crate::execution_mode::ExecutionMode;

    #[test]
    fn builds_a_native_engine() {
        assert!(build_engine(ExecutionMode::Native).is_ok());
    }

    #[cfg(feature = "interpreter")]
    #[test]
    fn builds_an_interpreter_engine_when_the_feature_is_on() {
        assert!(build_engine(ExecutionMode::Interpreter).is_ok());
    }

    #[cfg(not(feature = "interpreter"))]
    #[test]
    fn refuses_the_interpreter_when_the_feature_is_off() {
        assert!(matches!(
            build_engine(ExecutionMode::Interpreter),
            Err(crate::error::PluginError::InterpreterUnavailable)
        ));
    }
}
