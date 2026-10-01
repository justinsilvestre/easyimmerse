//! How large the conversion cache may grow, given the size of the disk it is on and the space left there.

const GIB: u64 = 1024 * 1024 * 1024;

/// The size and free space of the disk that holds the cache, in bytes.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct DiskSpace {
    pub capacity: u64,
    pub free: u64,
}

/// Returns the number of bytes the cache may use, given its current `usage` in bytes.
/// The cache stays within 5% of the disk (between 1 and 100 GiB) and leaves free a reserve of 5% of the disk (between 2 and 20 GiB).
pub fn cache_limit(disk: DiskSpace, usage: u64) -> u64 {
    let budget = (disk.capacity / 20).clamp(GIB, 100 * GIB);
    let reserve = (disk.capacity / 20).clamp(2 * GIB, 20 * GIB);
    let usable = usage.saturating_add(disk.free).saturating_sub(reserve);
    budget.min(usable)
}

#[cfg(test)]
mod tests {
    use super::*;

    fn disk(capacity_gib: u64, free_gib: u64) -> DiskSpace {
        DiskSpace {
            capacity: capacity_gib * GIB,
            free: free_gib * GIB,
        }
    }

    #[test]
    fn allows_five_percent_of_a_disk_with_ample_free_space() {
        assert_eq!(cache_limit(disk(500, 300), 0), 25 * GIB);
    }

    #[test]
    fn allows_at_least_one_gibibyte_on_a_small_disk() {
        assert_eq!(cache_limit(disk(10, 8), 0), GIB);
    }

    #[test]
    fn allows_at_most_one_hundred_gibibytes_on_a_large_disk() {
        assert_eq!(cache_limit(disk(4000, 3000), 0), 100 * GIB);
    }

    #[test]
    fn keeps_a_reserve_of_free_space_on_a_nearly_full_disk() {
        assert_eq!(cache_limit(disk(500, 25), 2 * GIB), 7 * GIB);
    }

    #[test]
    fn keeps_a_reserve_of_at_least_two_gibibytes() {
        let disk = DiskSpace {
            capacity: 20 * GIB,
            free: 2 * GIB + GIB / 2,
        };
        assert_eq!(cache_limit(disk, 0), GIB / 2);
    }

    #[test]
    fn keeps_a_reserve_of_at_most_twenty_gibibytes() {
        assert_eq!(cache_limit(disk(1000, 25), 0), 5 * GIB);
    }

    #[test]
    fn allows_nothing_when_the_reserve_exceeds_the_free_space() {
        assert_eq!(cache_limit(disk(500, 10), GIB), 0);
    }
}
