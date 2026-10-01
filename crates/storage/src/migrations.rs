use std::sync::LazyLock;

use rusqlite_migration::{M, Migrations};

/// Every schema migration, in the order they are applied.
pub static MIGRATIONS: LazyLock<Migrations<'static>> = LazyLock::new(|| {
    Migrations::new(vec![
        M::up(include_str!("sql/0001_projects.sql")),
        M::up(include_str!("sql/0002_preferences.sql")),
        M::up(include_str!("sql/0003_dictionaries.sql")),
    ])
});

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn migrations_are_valid() {
        assert!(MIGRATIONS.validate().is_ok());
    }
}
