## 2024-05-29 - O(N) Filter Optimization
**Learning:** Chaining multiple `.filter()` operations consecutively inside React `useMemo` hooks allocates a new array in memory for each step, causing performance regressions for large datasets. Use a single-pass iteration with short-circuit returns to ensure O(n) complexity and O(1) array allocation overhead.
**Action:** Replace chained `.filter()` operations with a single-pass loop or a single `.filter()` call combined with logical operators for faster filtering.
