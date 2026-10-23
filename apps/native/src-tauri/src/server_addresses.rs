//! The addresses through which other devices reach the server,
//! and the `Host` header values the server must therefore accept.

use std::net::{IpAddr, Ipv4Addr, SocketAddr};

use easyimmerse_api::server_control::device_name_from_host_name;

/// The machine's IPv4 addresses that other devices on a network can reach,
/// with private network addresses such as `192.168.1.5` first, so that the first one suits a QR code.
pub fn lan_ipv4_addresses() -> Vec<Ipv4Addr> {
    let addresses = match if_addrs::get_if_addrs() {
        Ok(interfaces) => interfaces.iter().map(|interface| interface.ip()).collect(),
        Err(error) => {
            tracing::warn!("could not list the network interfaces: {error}");
            Vec::new()
        }
    };
    lan_ipv4_addresses_among(addresses)
}

/// The machine's host name in lower case, as browsers send it in the `Host` header.
pub fn host_name() -> Option<String> {
    let name = gethostname::gethostname().into_string().ok()?;
    (!name.is_empty()).then(|| name.to_lowercase())
}

/// The machine's host name made readable, as paired devices show it by default, such as `Xs MacBook Pro`.
pub fn default_device_name() -> Option<String> {
    let name = gethostname::gethostname().into_string().ok()?;
    let name = device_name_from_host_name(&name);
    (!name.is_empty()).then_some(name)
}

fn lan_ipv4_addresses_among(addresses: Vec<IpAddr>) -> Vec<Ipv4Addr> {
    let mut found: Vec<Ipv4Addr> = addresses
        .into_iter()
        .filter_map(|address| match address {
            IpAddr::V4(address) if is_lan_address(address) => Some(address),
            _ => None,
        })
        .collect();
    found.sort_by_key(|address| !address.is_private());
    found.dedup();
    found
}

fn is_lan_address(address: Ipv4Addr) -> bool {
    !address.is_loopback() && !address.is_link_local() && !address.is_unspecified()
}

/// The `Host` header values that the private listener on `private_port`
/// and the public listener bound to `public_bind` receive, followed by the configured ones.
pub fn expected_hosts(
    private_port: u16,
    public_bind: SocketAddr,
    lan_addresses: &[Ipv4Addr],
    host_name: Option<&str>,
    configured: &[String],
) -> Vec<String> {
    let public_port = public_bind.port();
    let mut hosts = loopback_hosts(private_port);
    hosts.extend(loopback_hosts(public_port));
    if !public_bind.ip().is_unspecified() {
        hosts.push(public_bind.to_string());
    }
    hosts.extend(lan_addresses.iter().map(|ip| format!("{ip}:{public_port}")));
    if let Some(name) = host_name {
        hosts.push(format!("{name}:{public_port}"));
        if !name.contains('.') {
            hosts.push(format!("{name}.local:{public_port}"));
        }
    }
    hosts.extend(configured.iter().cloned());
    without_repeats(hosts)
}

fn loopback_hosts(port: u16) -> Vec<String> {
    vec![format!("127.0.0.1:{port}"), format!("localhost:{port}")]
}

fn without_repeats(hosts: Vec<String>) -> Vec<String> {
    let mut kept: Vec<String> = Vec::with_capacity(hosts.len());
    for host in hosts {
        if !kept.contains(&host) {
            kept.push(host);
        }
    }
    kept
}

/// The URLs that reach a listener bound to `bound`:
/// one per LAN address for an unspecified address such as `0.0.0.0`,
/// and the bound address itself otherwise.
pub fn listener_urls(bound: SocketAddr, lan_addresses: &[Ipv4Addr]) -> Vec<String> {
    if bound.ip().is_unspecified() {
        let port = bound.port();
        lan_addresses
            .iter()
            .map(|ip| format!("http://{ip}:{port}"))
            .collect()
    } else {
        vec![format!("http://{bound}")]
    }
}

/// Whether other devices can reach a listener bound to `bound`.
pub fn is_lan_reachable(bound: SocketAddr, lan_addresses: &[Ipv4Addr]) -> bool {
    let ip = bound.ip();
    !ip.is_loopback() && (!ip.is_unspecified() || !lan_addresses.is_empty())
}

#[cfg(test)]
mod tests {
    use super::*;

    const HOME: Ipv4Addr = Ipv4Addr::new(192, 168, 1, 5);
    const VPN: Ipv4Addr = Ipv4Addr::new(100, 64, 0, 7);

    fn bind(text: &str) -> SocketAddr {
        text.parse().unwrap()
    }

    fn hosts_for(public_bind: &str) -> Vec<String> {
        expected_hosts(
            51000,
            bind(public_bind),
            &[HOME],
            Some("studio"),
            &["books.example.org".to_string()],
        )
    }

    #[test]
    fn lists_private_network_addresses_first() {
        let found = lan_ipv4_addresses_among(vec![IpAddr::V4(VPN), IpAddr::V4(HOME)]);
        assert_eq!(found, vec![HOME, VPN]);
    }

    #[test]
    fn leaves_out_loopback_and_link_local_addresses() {
        let found = lan_ipv4_addresses_among(vec![
            IpAddr::V4(Ipv4Addr::LOCALHOST),
            IpAddr::V4(Ipv4Addr::new(169, 254, 3, 4)),
        ]);
        assert!(found.is_empty());
    }

    #[test]
    fn leaves_out_ipv6_addresses() {
        let found = lan_ipv4_addresses_among(vec!["fe80::1".parse().unwrap()]);
        assert!(found.is_empty());
    }

    #[test]
    fn expects_the_private_listener_on_localhost() {
        assert!(hosts_for("0.0.0.0:8787").contains(&"localhost:51000".to_string()));
    }

    #[test]
    fn expects_the_public_listener_on_the_loopback_address() {
        assert!(hosts_for("0.0.0.0:8787").contains(&"127.0.0.1:8787".to_string()));
    }

    #[test]
    fn expects_the_public_listener_on_each_lan_address() {
        assert!(hosts_for("0.0.0.0:8787").contains(&"192.168.1.5:8787".to_string()));
    }

    #[test]
    fn expects_the_host_name_with_the_public_port() {
        assert!(hosts_for("0.0.0.0:8787").contains(&"studio:8787".to_string()));
    }

    #[test]
    fn expects_the_local_network_name_of_a_bare_host_name() {
        assert!(hosts_for("0.0.0.0:8787").contains(&"studio.local:8787".to_string()));
    }

    #[test]
    fn expects_the_configured_hosts() {
        assert!(hosts_for("0.0.0.0:8787").contains(&"books.example.org".to_string()));
    }

    #[test]
    fn expects_a_specific_bound_address() {
        assert!(hosts_for("10.0.0.2:8787").contains(&"10.0.0.2:8787".to_string()));
    }

    #[test]
    fn does_not_expect_the_unspecified_address() {
        assert!(!hosts_for("0.0.0.0:8787").contains(&"0.0.0.0:8787".to_string()));
    }

    #[test]
    fn does_not_repeat_a_host() {
        let hosts = hosts_for("127.0.0.1:8787");
        let count = hosts
            .iter()
            .filter(|host| *host == "127.0.0.1:8787")
            .count();
        assert_eq!(count, 1);
    }

    #[test]
    fn gives_one_url_per_lan_address_for_an_unspecified_bind() {
        let urls = listener_urls(bind("0.0.0.0:8787"), &[HOME, VPN]);
        assert_eq!(
            urls,
            vec!["http://192.168.1.5:8787", "http://100.64.0.7:8787"]
        );
    }

    #[test]
    fn gives_the_loopback_url_for_a_loopback_bind() {
        let urls = listener_urls(bind("127.0.0.1:8787"), &[HOME]);
        assert_eq!(urls, vec!["http://127.0.0.1:8787"]);
    }

    #[test]
    fn brackets_an_ipv6_address_in_a_url() {
        let urls = listener_urls(bind("[fd00::5]:8787"), &[]);
        assert_eq!(urls, vec!["http://[fd00::5]:8787"]);
    }

    #[test]
    fn a_loopback_bind_is_not_lan_reachable() {
        assert!(!is_lan_reachable(bind("127.0.0.1:8787"), &[HOME]));
    }

    #[test]
    fn an_unspecified_bind_is_lan_reachable_with_a_lan_address() {
        assert!(is_lan_reachable(bind("0.0.0.0:8787"), &[HOME]));
    }

    #[test]
    fn an_unspecified_bind_is_not_lan_reachable_without_a_lan_address() {
        assert!(!is_lan_reachable(bind("0.0.0.0:8787"), &[]));
    }
}
