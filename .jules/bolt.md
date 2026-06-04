## 2024-06-04 - Prevent chained `.filter()` allocations in `useMemo`
**Learning:** Chaining multiple `.filter()` operations consecutively inside React `useMemo` hooks allocates a new array in memory for each step, causing performance regressions for large datasets (O(k*n) allocations).
**Action:** Use a single-pass iteration (`.filter()` with short-circuit returns or a single condition block) to ensure O(n) complexity and O(1) array allocation overhead.
