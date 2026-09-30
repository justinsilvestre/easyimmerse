use roxmltree::{Document as XmlDocument, Node};

use super::error::DocumentError;

/// The parts of an EPUB package document (OPF file) needed to read the book in order.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Opf {
    pub title: String,
    pub language: Option<String>,
    pub manifest: Vec<ManifestItem>,
    /// Manifest item ids in reading order.
    pub spine: Vec<String>,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct ManifestItem {
    pub id: String,
    pub href: String,
    pub properties: Vec<String>,
}

pub fn parse_opf(xml: &str) -> Result<Opf, DocumentError> {
    let document = XmlDocument::parse(xml)?;
    Ok(Opf {
        title: find_element_text(&document, "title").unwrap_or_default(),
        language: find_element_text(&document, "language"),
        manifest: parse_manifest(&document),
        spine: parse_spine(&document),
    })
}

fn find_element_text(document: &XmlDocument, tag: &str) -> Option<String> {
    let element = document.descendants().find(|node| node.has_tag_name(tag))?;
    Some(element.text()?.trim().to_string())
}

fn parse_manifest(document: &XmlDocument) -> Vec<ManifestItem> {
    document
        .descendants()
        .filter(|node| node.has_tag_name("item"))
        .filter_map(parse_manifest_item)
        .collect()
}

fn parse_manifest_item(node: Node) -> Option<ManifestItem> {
    Some(ManifestItem {
        id: node.attribute("id")?.to_string(),
        href: node.attribute("href")?.to_string(),
        properties: split_properties(node.attribute("properties")),
    })
}

fn split_properties(properties: Option<&str>) -> Vec<String> {
    properties
        .unwrap_or_default()
        .split_whitespace()
        .map(String::from)
        .collect()
}

fn parse_spine(document: &XmlDocument) -> Vec<String> {
    document
        .descendants()
        .filter(|node| node.has_tag_name("itemref"))
        .filter_map(|node| node.attribute("idref"))
        .map(String::from)
        .collect()
}

impl Opf {
    pub fn find_manifest_item(&self, id: &str) -> Option<&ManifestItem> {
        self.manifest.iter().find(|item| item.id == id)
    }
}

impl ManifestItem {
    /// Reports whether the item is the EPUB 3 navigation document.
    pub fn is_navigation(&self) -> bool {
        self.properties.iter().any(|property| property == "nav")
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    const OPF: &str = r#"<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="book-id">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:identifier id="book-id">urn:uuid:1</dc:identifier>
    <dc:title>Tiny Book</dc:title>
    <dc:language>fr</dc:language>
  </metadata>
  <manifest>
    <item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/>
    <item id="c1" href="text/c1.xhtml" media-type="application/xhtml+xml"/>
  </manifest>
  <spine>
    <itemref idref="c1"/>
    <itemref idref="nav"/>
  </spine>
</package>"#;

    fn parse_sample() -> Opf {
        parse_opf(OPF).expect("sample OPF should parse")
    }

    #[test]
    fn reads_the_title() {
        assert_eq!(parse_sample().title, "Tiny Book");
    }

    #[test]
    fn reads_the_language() {
        assert_eq!(parse_sample().language, Some("fr".into()));
    }

    #[test]
    fn reads_the_manifest_items() {
        assert_eq!(
            parse_sample().manifest[1],
            ManifestItem {
                id: "c1".into(),
                href: "text/c1.xhtml".into(),
                properties: vec![]
            }
        );
    }

    #[test]
    fn reads_the_properties_of_the_navigation_item() {
        assert!(parse_sample().manifest[0].is_navigation());
    }

    #[test]
    fn reads_the_spine_in_order() {
        assert_eq!(parse_sample().spine, vec!["c1", "nav"]);
    }

    #[test]
    fn leaves_the_language_empty_when_there_is_none() {
        let opf = parse_opf(r#"<package><metadata/><manifest/><spine/></package>"#).unwrap();
        assert_eq!(opf.language, None);
    }

    #[test]
    fn rejects_malformed_xml() {
        assert!(matches!(parse_opf("<package>"), Err(DocumentError::Xml(_))));
    }
}
