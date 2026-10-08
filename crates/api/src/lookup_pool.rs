use std::collections::HashMap;
use std::hash::Hash;

/// A list that holds each distinct item once, so that a response can refer to an item by its index instead of repeating it.
pub struct LookupPool<T, K> {
    items: Vec<T>,
    /// The indices of the items, grouped by a key that equal items share, so that finding an equal item compares only a few.
    indices_by_key: HashMap<K, Vec<u32>>,
    key: fn(&T) -> K,
}

impl<T: PartialEq, K: Eq + Hash> LookupPool<T, K> {
    /// Creates an empty pool. Equal items must have equal keys.
    pub fn new(key: fn(&T) -> K) -> Self {
        Self {
            items: Vec::new(),
            indices_by_key: HashMap::new(),
            key,
        }
    }

    /// Returns the index of the item in the pool, adding it first unless an equal item is there already.
    pub fn index_of(&mut self, item: T) -> u32 {
        let indices = self.indices_by_key.entry((self.key)(&item)).or_default();
        if let Some(index) = indices
            .iter()
            .find(|&&index| self.items[index as usize] == item)
        {
            return *index;
        }
        // The batch route's limits keep the pool far smaller than `u32::MAX` items.
        let index = self.items.len() as u32;
        self.items.push(item);
        indices.push(index);
        index
    }

    pub fn items(&self) -> &[T] {
        &self.items
    }

    pub fn into_items(self) -> Vec<T> {
        self.items
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn first_letter(word: &&str) -> char {
        word.chars().next().unwrap_or_default()
    }

    #[test]
    fn gives_an_equal_item_the_index_of_the_first() {
        let mut pool = LookupPool::new(first_letter);
        pool.index_of("cat");
        pool.index_of("dog");
        assert_eq!(pool.index_of("dog"), 1);
    }

    #[test]
    fn gives_a_distinct_item_with_the_same_key_its_own_index() {
        let mut pool = LookupPool::new(first_letter);
        pool.index_of("cat");
        assert_eq!(pool.index_of("cow"), 1);
    }

    #[test]
    fn holds_each_distinct_item_once() {
        let mut pool = LookupPool::new(first_letter);
        for word in ["cat", "cow", "cat", "dog", "cow"] {
            pool.index_of(word);
        }
        assert_eq!(pool.into_items(), vec!["cat", "cow", "dog"]);
    }
}
