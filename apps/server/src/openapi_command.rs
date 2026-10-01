use anyhow::Context;

use crate::cli::OpenapiArgs;

pub fn run(args: OpenapiArgs) -> anyhow::Result<()> {
    let document = easyimmerse_api::openapi_document()
        .to_pretty_json()
        .context("could not serialize the OpenAPI document")?;
    match args.out {
        Some(path) => std::fs::write(&path, format!("{document}\n"))
            .with_context(|| format!("could not write {}", path.display())),
        None => {
            println!("{document}");
            Ok(())
        }
    }
}
