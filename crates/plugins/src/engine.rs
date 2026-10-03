use wasmtime::{Config, Engine};

use crate::error::PluginError;
use crate::execution_mode::{ExecutionMode, PLATFORM_FORBIDS_JIT};

/// Builds an engine with fuel metering and the component model enabled.
pub fn build_engine(mode: ExecutionMode) -> Result<Engine, PluginError> {
    let mut config = Config::new();
    config.consume_fuel(true).wasm_component_model(true);
    match mode {
        ExecutionMode::Native => check_native_execution(PLATFORM_FORBIDS_JIT)?,
        ExecutionMode::Interpreter => configure_interpreter(&mut config)?,
    }
    Ok(Engine::new(&config)?)
}

/// Refuses native execution where the platform forbids just-in-time compilation,
/// since wasmtime would otherwise fail only when it first runs the compiled code.
fn check_native_execution(platform_forbids_jit: bool) -> Result<(), PluginError> {
    if platform_forbids_jit {
        return Err(PluginError::NativeUnavailable);
    }
    Ok(())
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
    use super::{build_engine, check_native_execution};
    use crate::error::PluginError;
    use crate::execution_mode::ExecutionMode;

    #[cfg(not(target_os = "ios"))]
    #[test]
    fn builds_a_native_engine() {
        assert!(build_engine(ExecutionMode::Native).is_ok());
    }

    #[test]
    fn allows_native_execution_where_jit_is_allowed() {
        assert!(check_native_execution(false).is_ok());
    }

    #[test]
    fn refuses_native_execution_where_jit_is_forbidden() {
        assert!(matches!(
            check_native_execution(true),
            Err(PluginError::NativeUnavailable)
        ));
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
            Err(PluginError::InterpreterUnavailable)
        ));
    }
}
