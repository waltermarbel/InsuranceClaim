## 2024-05-18 - Avoid chained .filter() inside useMemo for large arrays
**Learning:** Chaining multiple `.filter()` operations consecutively inside React `useMemo` hooks allocates a new array in memory for each step, causing performance regressions for large datasets like the inventory list.
**Action:** Use a single-pass iteration with short-circuit returns to ensure O(n) complexity and O(1) array allocation overhead. Also, hoist static operations outside the iteration loop.
