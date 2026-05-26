## 2025-05-24 - Avoid Chained Array Methods in Memos
**Learning:** Chaining multiple `.filter()` operations consecutively inside React `useMemo` hooks allocates a new array in memory for each step, causing performance regressions for large datasets (like inventory table rendering).
**Action:** Use a single-pass iteration with short-circuit returns (or a single `filter` with combined conditions) to ensure O(n) complexity and O(1) array allocation overhead.
