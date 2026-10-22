//! The links that mails carry, to the web app at the server's public URL.

use crate::mail::MailError;

/// What a mailed link asks the web app to do, which names its query parameter.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum MailLink {
    ConfirmEmail,
    ResetPassword,
}

impl MailLink {
    fn query_parameter(self) -> &'static str {
        match self {
            MailLink::ConfirmEmail => "confirm_email",
            MailLink::ResetPassword => "reset_password",
        }
    }
}

/// An `http` or `https` URL with a host, an optional path, and no query or fragment, kept without its trailing slashes.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct PublicUrl(String);

impl PublicUrl {
    pub fn parse(url: &str) -> Result<Self, MailError> {
        let trimmed = url.trim().trim_end_matches('/');
        let rest = trimmed
            .strip_prefix("https://")
            .or_else(|| trimmed.strip_prefix("http://"));
        let has_host = rest.is_some_and(|rest| !rest.is_empty() && !rest.starts_with('/'));
        if !has_host || trimmed.contains(['?', '#']) || trimmed.contains(char::is_whitespace) {
            return Err(MailError::InvalidPublicUrl(url.to_string()));
        }
        Ok(Self(trimmed.to_string()))
    }

    /// The link `{public_url}/?{parameter}={token}`. The token is hex, so it needs no escaping.
    pub fn link(&self, link: MailLink, token: &str) -> String {
        format!("{}/?{}={token}", self.0, link.query_parameter())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn link(url: &str) -> String {
        PublicUrl::parse(url)
            .unwrap()
            .link(MailLink::ConfirmEmail, "abc")
    }

    #[test]
    fn links_to_the_root_of_a_bare_host() {
        assert_eq!(
            link("https://example.com"),
            "https://example.com/?confirm_email=abc"
        );
    }

    #[test]
    fn keeps_the_path_of_the_public_url() {
        assert_eq!(
            link("https://example.com/app"),
            "https://example.com/app/?confirm_email=abc"
        );
    }

    #[test]
    fn does_not_double_a_trailing_slash() {
        assert_eq!(
            link("http://192.168.1.5:8787/"),
            "http://192.168.1.5:8787/?confirm_email=abc"
        );
    }

    #[test]
    fn names_the_reset_parameter_for_a_reset_link() {
        let url = PublicUrl::parse("https://example.com").unwrap();
        assert_eq!(
            url.link(MailLink::ResetPassword, "abc"),
            "https://example.com/?reset_password=abc"
        );
    }

    #[test]
    fn refuses_a_url_without_a_host() {
        assert!(PublicUrl::parse("https:///app").is_err());
    }

    #[test]
    fn refuses_a_url_with_a_query() {
        assert!(PublicUrl::parse("https://example.com/?a=b").is_err());
    }

    #[test]
    fn refuses_another_scheme() {
        assert!(PublicUrl::parse("ftp://example.com").is_err());
    }
}
