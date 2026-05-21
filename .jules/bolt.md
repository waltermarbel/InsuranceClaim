## 2024-06-25 - Avoid Chained Array Methods in useMemo
**Learning:** Chaining multiple `.filter()` operations consecutively inside React `useMemo` hooks allocates a new array in memory for each step, causing performance regressions for large datasets (O(N) memory allocations per filter step).
**Action:** Use a single-pass iteration (`.filter()` with short-circuit returns or a manual `for`/`reduce` loop) to ensure O(n) complexity and O(1) array allocation overhead.
