## 2024-05-18 - Fix Performance Anti-Pattern with Chained .filter() in useMemo
**Learning:** Chaining multiple `.filter()` operations consecutively inside React `useMemo` hooks allocates a new array in memory for each step, causing performance regressions for large datasets. This codebase specifically had 6 consecutive `.filter()` calls for UI tables, which ran in O(m * n) time.
**Action:** Use a single-pass iteration with short-circuit returns (`return false` early) to ensure O(n) complexity and O(1) array allocation overhead when filtering datasets inside `useMemo`.
