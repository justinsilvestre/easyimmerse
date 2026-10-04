/// How wasmtime runs plugin code: compiled to native code, or through the
/// Pulley interpreter for platforms that forbid just-in-time compilation.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum ExecutionMode {
    Native,
    Interpreter,
}

/// Whether this platform forbids just-in-time compilation, so that only the interpreter can run plugins.
/// iOS refuses to execute memory an app has written.
pub const PLATFORM_FORBIDS_JIT: bool = cfg!(target_os = "ios");

const EXECUTION_ENV_VAR: &str = "EASYIMMERSE_PLUGIN_EXECUTION";

impl ExecutionMode {
    /// Reads `EASYIMMERSE_PLUGIN_EXECUTION`; `interpreter` selects the interpreter,
    /// and any other value or an unset variable selects native execution.
    /// On a platform that forbids just-in-time compilation, the variable is ignored and the result is always the interpreter.
    pub fn from_env() -> Self {
        Self::resolve(
            PLATFORM_FORBIDS_JIT,
            std::env::var(EXECUTION_ENV_VAR).ok().as_deref(),
        )
    }

    /// The mode's name as it appears in the environment variable.
    pub fn name(self) -> &'static str {
        match self {
            Self::Native => "native",
            Self::Interpreter => "interpreter",
        }
    }

    fn resolve(platform_forbids_jit: bool, value: Option<&str>) -> Self {
        match value {
            _ if platform_forbids_jit => Self::Interpreter,
            Some("interpreter") => Self::Interpreter,
            _ => Self::Native,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::ExecutionMode;

    #[test]
    fn selects_the_interpreter_when_the_variable_says_interpreter() {
        assert_eq!(
            ExecutionMode::resolve(false, Some("interpreter")),
            ExecutionMode::Interpreter
        );
    }

    #[test]
    fn selects_native_execution_when_the_variable_is_unset() {
        assert_eq!(ExecutionMode::resolve(false, None), ExecutionMode::Native);
    }

    #[test]
    fn selects_native_execution_for_any_other_value() {
        assert_eq!(
            ExecutionMode::resolve(false, Some("jit")),
            ExecutionMode::Native
        );
    }

    #[test]
    fn selects_the_interpreter_where_jit_is_forbidden_even_when_the_variable_says_native() {
        assert_eq!(
            ExecutionMode::resolve(true, Some("native")),
            ExecutionMode::Interpreter
        );
    }

    #[test]
    fn selects_the_interpreter_where_jit_is_forbidden_when_the_variable_is_unset() {
        assert_eq!(
            ExecutionMode::resolve(true, None),
            ExecutionMode::Interpreter
        );
    }

    #[test]
    fn names_the_interpreter_mode_as_the_variable_spells_it() {
        assert_eq!(ExecutionMode::Interpreter.name(), "interpreter");
    }
}
