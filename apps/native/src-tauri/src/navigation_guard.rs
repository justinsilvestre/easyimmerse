use tauri::Url;

/// Decides whether the main window may navigate to `url`.
/// Only the app's own pages are allowed: the bundled front end, the Vite dev server,
/// and the embedded server.
/// The window injects the API token into every page it loads,
/// so a remote page must never load there.
pub fn is_app_url(url: &Url) -> bool {
    match url.scheme() {
        "tauri" => true,
        "http" => url.host_str().is_some_and(is_local_host),
        _ => false,
    }
}

fn is_local_host(host: &str) -> bool {
    matches!(host, "tauri.localhost" | "localhost" | "127.0.0.1")
}

#[cfg(test)]
mod tests {
    use super::*;

    fn allows(text: &str) -> bool {
        is_app_url(&Url::parse(text).unwrap())
    }

    #[test]
    fn allows_the_bundled_front_end_on_macos_and_linux() {
        assert!(allows("tauri://localhost/index.html"));
    }

    #[test]
    fn allows_the_bundled_front_end_on_windows() {
        assert!(allows("http://tauri.localhost/index.html"));
    }

    #[test]
    fn allows_the_dev_server() {
        assert!(allows("http://localhost:1421/"));
    }

    #[test]
    fn allows_the_embedded_server() {
        assert!(allows("http://127.0.0.1:8787/health"));
    }

    #[test]
    fn refuses_a_remote_page() {
        assert!(!allows("https://example.com/"));
    }

    #[test]
    fn refuses_a_remote_page_that_only_mentions_localhost() {
        assert!(!allows("http://localhost.example.com/"));
    }

    #[test]
    fn refuses_a_file_url() {
        assert!(!allows("file:///etc/passwd"));
    }
}
