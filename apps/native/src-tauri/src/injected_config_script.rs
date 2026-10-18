use serde_json::Value;

/// The kind of platform the app runs on, as the page reads it.
const PLATFORM: &str = if cfg!(mobile) { "mobile" } else { "desktop" };

/// Builds the script that tells the page where the embedded server is and which kind of platform it runs on.
/// The values are JSON string literals, so a token or URL can never break out of the assignment.
pub fn injected_config_script(server_url: &str, token: &str) -> String {
    config_script(server_url, token, PLATFORM)
}

fn config_script(server_url: &str, token: &str, platform: &str) -> String {
    format!(
        "window.__EASYIMMERSE__ = Object.freeze({{ serverUrl: {}, token: {}, platform: {} }});",
        js_string_literal(server_url),
        js_string_literal(token),
        js_string_literal(platform)
    )
}

/// JSON encodes the string and additionally escapes `<`, so the literal is safe inside HTML too.
fn js_string_literal(value: &str) -> String {
    Value::String(value.to_string())
        .to_string()
        .replace('<', "\\u003c")
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn assigns_a_frozen_object_with_the_desktop_platform_on_desktop() {
        assert_eq!(
            injected_config_script("http://127.0.0.1:8787", "abc"),
            r#"window.__EASYIMMERSE__ = Object.freeze({ serverUrl: "http://127.0.0.1:8787", token: "abc", platform: "desktop" });"#
        );
    }

    #[test]
    fn names_the_platform_it_is_given() {
        let script = config_script("http://127.0.0.1:8787", "abc", "mobile");
        assert!(script.ends_with(r#"platform: "mobile" });"#));
    }

    #[test]
    fn does_not_let_a_script_tag_through() {
        let script = injected_config_script("http://127.0.0.1:8787", "</script><script>");
        assert!(!script.contains("</script>"));
    }

    #[test]
    fn escapes_quotes_so_the_literal_stays_intact() {
        let script = injected_config_script("http://127.0.0.1:8787", r#"a"b\c"#);
        assert!(script.contains(r#"token: "a\"b\\c", "#));
    }

    #[test]
    fn a_hostile_token_round_trips_through_a_json_parser() {
        let token = "</script>\"'\\\n<img>";
        let literal = js_string_literal(token);
        assert_eq!(serde_json::from_str::<String>(&literal).unwrap(), token);
    }
}
