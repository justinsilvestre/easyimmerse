use std::net::{Ipv4Addr, SocketAddr};

use easyimmerse_api::server_control::{DesktopServerStatus, ServerRunState};

use crate::server_addresses::{is_lan_reachable, listener_urls};

/// Describes the public listener, which is bound to `public_addr` while it runs,
/// given the machine's LAN addresses.
pub fn status_of(
    state: ServerRunState,
    public_addr: Option<SocketAddr>,
    lan_addresses: &[Ipv4Addr],
    serves_web_app: bool,
) -> DesktopServerStatus {
    let running_addr = public_addr.filter(|_| state == ServerRunState::Running);
    let urls = running_addr.map_or_else(Vec::new, |addr| listener_urls(addr, lan_addresses));
    let lan_reachable = running_addr.is_some_and(|addr| is_lan_reachable(addr, lan_addresses));
    let pairing_url = urls.first().filter(|_| lan_reachable).cloned();
    DesktopServerStatus {
        state,
        urls,
        lan_reachable,
        serves_web_app,
        pairing_url,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    const HOME: Ipv4Addr = Ipv4Addr::new(192, 168, 1, 5);

    fn running_on(bind: &str) -> DesktopServerStatus {
        status_of(
            ServerRunState::Running,
            Some(bind.parse().unwrap()),
            &[HOME],
            true,
        )
    }

    fn stopped() -> DesktopServerStatus {
        status_of(ServerRunState::Stopped, None, &[HOME], true)
    }

    #[test]
    fn lists_the_lan_urls_while_running_on_every_interface() {
        assert_eq!(
            running_on("0.0.0.0:8787").urls,
            vec!["http://192.168.1.5:8787"]
        );
    }

    #[test]
    fn is_lan_reachable_while_running_on_every_interface() {
        assert!(running_on("0.0.0.0:8787").lan_reachable);
    }

    #[test]
    fn pairs_through_the_first_lan_url() {
        assert_eq!(
            running_on("0.0.0.0:8787").pairing_url,
            Some("http://192.168.1.5:8787".to_string())
        );
    }

    #[test]
    fn lists_the_loopback_url_while_running_on_loopback() {
        assert_eq!(
            running_on("127.0.0.1:8787").urls,
            vec!["http://127.0.0.1:8787"]
        );
    }

    #[test]
    fn offers_no_pairing_while_running_on_loopback() {
        assert_eq!(running_on("127.0.0.1:8787").pairing_url, None);
    }

    #[test]
    fn lists_no_urls_while_stopped() {
        assert!(stopped().urls.is_empty());
    }

    #[test]
    fn is_not_lan_reachable_while_stopped() {
        assert!(!stopped().lan_reachable);
    }

    #[test]
    fn reports_whether_it_serves_the_web_app_while_stopped() {
        assert!(stopped().serves_web_app);
    }
}
