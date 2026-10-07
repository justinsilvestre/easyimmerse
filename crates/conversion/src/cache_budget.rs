//! How large the cache may grow, given the disk it lives on.

use std::path::Path;

use easyimmerse_media::ConversionCacheStatus;

const GIB: u64 = 1024 * 1024 * 1024;
/// Both the budget and the reserve are five percent of the disk, within their bounds.
const DISK_SHARE_DIVISOR: u64 = 20;
const MIN_BUDGET: u64 = GIB;
const MAX_BUDGET: u64 = 100 * GIB;
/// Free space the cache leaves to the rest of the system.
const MIN_RESERVE: u64 = 2 * GIB;
const MAX_RESERVE: u64 = 20 * GIB;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct DiskSpace {
    pub capacity_bytes: u64,
    pub available_bytes: u64,
}

/// Reads the capacity of the disk holding `path` and the space available to this process.
/// The `fs4` crate (MIT or Apache-2.0) wraps `statvfs` and `GetDiskFreeSpaceExW`.
pub fn read_disk_space(path: &Path) -> std::io::Result<DiskSpace> {
    Ok(DiskSpace {
        capacity_bytes: fs4::total_space(path)?,
        available_bytes: fs4::available_space(path)?,
    })
}

/// The cache may use the budget, the one the user chose or else five percent of the disk, unless
/// that would leave less than the reserve free, in which case the limit shrinks to what the disk
/// allows and `space_low` is set.
pub fn cache_status(
    usage_bytes: u64,
    disk: DiskSpace,
    chosen_budget_bytes: Option<u64>,
) -> ConversionCacheStatus {
    let budget_bytes = chosen_budget_bytes
        .unwrap_or_else(|| (disk.capacity_bytes / DISK_SHARE_DIVISOR).clamp(MIN_BUDGET, MAX_BUDGET));
    let reserve_bytes = (disk.capacity_bytes / DISK_SHARE_DIVISOR).clamp(MIN_RESERVE, MAX_RESERVE);
    let limit_bytes =
        budget_bytes.min((usage_bytes + disk.available_bytes).saturating_sub(reserve_bytes));
    ConversionCacheStatus {
        usage_bytes,
        limit_bytes,
        budget_bytes,
        free_bytes: disk.available_bytes,
        space_low: limit_bytes < budget_bytes,
        chosen_budget_bytes,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn disk(capacity_gib: u64, available_gib: u64) -> DiskSpace {
        DiskSpace {
            capacity_bytes: capacity_gib * GIB,
            available_bytes: available_gib * GIB,
        }
    }

    #[test]
    fn budgets_five_percent_of_a_one_terabyte_disk() {
        assert_eq!(cache_status(0, disk(1000, 500), None).budget_bytes, 50 * GIB);
    }

    #[test]
    fn budgets_at_least_one_gibibyte() {
        assert_eq!(cache_status(0, disk(10, 5), None).budget_bytes, GIB);
    }

    #[test]
    fn budgets_at_most_one_hundred_gibibytes() {
        assert_eq!(cache_status(0, disk(4000, 2000), None).budget_bytes, 100 * GIB);
    }

    #[test]
    fn limits_to_the_budget_when_space_is_plentiful() {
        assert_eq!(cache_status(0, disk(1000, 500), None).limit_bytes, 50 * GIB);
    }

    #[test]
    fn keeps_the_reserve_free_when_space_is_short() {
        let status = cache_status(2 * GIB, disk(1000, 30), None);
        assert_eq!(status.limit_bytes, 12 * GIB);
    }

    #[test]
    fn flags_low_space_when_the_reserve_limits_the_cache() {
        assert!(cache_status(2 * GIB, disk(1000, 30), None).space_low);
    }

    #[test]
    fn does_not_flag_low_space_when_the_budget_limits_the_cache() {
        assert!(!cache_status(0, disk(1000, 500), None).space_low);
    }

    #[test]
    fn uses_the_chosen_budget_over_the_disk_share() {
        assert_eq!(
            cache_status(0, disk(1000, 500), Some(10 * GIB)).budget_bytes,
            10 * GIB
        );
    }

    #[test]
    fn reports_the_chosen_budget() {
        assert_eq!(
            cache_status(0, disk(1000, 500), Some(10 * GIB)).chosen_budget_bytes,
            Some(10 * GIB)
        );
    }

    #[test]
    fn never_limits_below_zero() {
        assert_eq!(cache_status(0, disk(1000, 1), None).limit_bytes, 0);
    }

    #[test]
    fn reads_the_space_of_the_current_directory() {
        let space = read_disk_space(Path::new(".")).expect("disk space");
        assert!(space.capacity_bytes >= space.available_bytes);
    }
}
