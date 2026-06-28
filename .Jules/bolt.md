## 2024-06-28 - Chaining array filter operations causes memory regressions
**Learning:** Chaining multiple `.filter()` operations consecutively inside React `useMemo` hooks allocates a new array in memory for each step, causing performance regressions for large datasets (O(N*M) array creation overhead).
**Action:** Use a single-pass iteration with short-circuit returns to ensure O(N) complexity and O(1) array allocation overhead.
