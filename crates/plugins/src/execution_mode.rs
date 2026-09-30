/// How wasmtime runs plugin code: compiled to native code, or through the
/// Pulley interpreter for platforms that forbid just-in-time compilation.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum ExecutionMode {
    Native,
    Interpreter,
}

const EXECUTION_ENV_VAR: &str = "EASYIMMERSE_PLUGIN_EXECUTION";

impl ExecutionMode {
    /// Reads `EASYIMMERSE_PLUGIN_EXECUTION`; `interpreter` selects the interpreter and
    /// any other value or an unset variable selects native execution.
    pub fn from_env() -> Self {
        Self::from_env_value(std::env::var(EXECUTION_ENV_VAR).ok().as_deref())
    }

    fn from_env_value(value: Option<&str>) -> Self {
        match value {
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
            ExecutionMode::from_env_value(Some("interpreter")),
            ExecutionMode::Interpreter
        );
    }

    #[test]
    fn selects_native_execution_when_the_variable_is_unset() {
        assert_eq!(ExecutionMode::from_env_value(None), ExecutionMode::Native);
    }

    #[test]
    fn selects_native_execution_for_any_other_value() {
        assert_eq!(
            ExecutionMode::from_env_value(Some("jit")),
            ExecutionMode::Native
        );
    }
}
