## 2024-07-08 - Chained Array Filters in React useMemo
**Learning:** Chaining multiple `.filter()` operations consecutively inside React `useMemo` hooks allocates a new array in memory for each step, causing performance regressions for large datasets (measured ~5-6x slower execution in benchmarking).
**Action:** Use a single-pass iteration with short-circuit returns to ensure O(n) complexity and O(1) array allocation overhead, and hoist static operations (e.g., string conversion) outside of iteration loops.
