## 2024-05-18 - Chained Array Filters in React useMemo
**Learning:** Chaining multiple `.filter()` operations consecutively inside React `useMemo` hooks allocates a new array in memory for each step, causing performance regressions for large datasets (O(1) array allocation overhead per filter).
**Action:** Use a single-pass iteration with short-circuit returns to ensure O(n) complexity and O(1) array allocation overhead. Ensure missing dependencies are added to `useMemo` dependency array to fix stale closures.
